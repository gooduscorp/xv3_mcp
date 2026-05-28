# Copilot Instructions for xv3_mcp

Purpose: concise, actionable guidance for Copilot/Copilot CLI sessions in this repo.

## Quick commands
- Install deps: `npm install`
- Start (stdio mode, used by Claude Desktop): `npm start` (runs `node index.js`)
- Start as HTTP server: `npm run start:http` (runs `node index.js --http 3334`)

No build, lint, or test scripts are configured.

## High-level architecture

Entry point `index.js` creates one `McpServer` per session, registers all 44 tools using Zod schemas, and exposes two transports:
- **stdio** (default) — for Claude Desktop; one process per user
- **HTTP** (`--http <port>`) — Express server with per-session `StreamableHTTPServerTransport`; optional `MCP_API_KEY` auth via `Authorization: Bearer <key>`; health check at `GET /health`

Tool implementations live in four files:
| File | Responsibility |
|---|---|
| `tools/get.js` | Read: devices, interfaces, IP/MAC, alarms, topology, configs, users, sites, groups |
| `tools/set.js` | Write: device fields, group CRUD, topology links, close issues |
| `tools/perf.js` | Performance time-series from `xv3_perf` DB |
| `tools/issue.js` | Event logs from `xv3_issue` DB (monthly-partitioned tables) |
| `tools/issueHelper.js` | Resolves which `issue_log_MM` tables to query based on date range; 5-min cache |

`db.js` exports a `query(sql, params)` helper backed by a mysql2 connection pool. Config is read from `.env` via `dotenv` (`quiet: true` — suppresses stdout to avoid stdio contamination).

Response helpers (defined in `index.js`, used in every tool handler):
- `ok(data)` — arrays → `{ count: N, items: [...] }`; objects returned raw
- `err(e)` — returns `{ isError: true, content: [{ type: 'text', text: '오류: ...' }] }`

## Key conventions and gotchas

**Status value mismatch** — these are not interchangeable:
| Field | UP | DOWN |
|---|---|---|
| `device_info.status` | 1 | **0** |
| `collect_interface.admin_status` / `oper_status` | 1 | **2** |

**Event severity codes**: 1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Normal

**Issue type codes**: `S`=Syslog, `C`=Threshold, `P`=Ping, `A`=TempFault, `F`=FAN, `I`=PortStatus, `M`=SystemEvent, `N`=ModuleDown, `E`=EventManager, `O`=AutoProvisioning, `R`=PowerFault, `W`=WirelessThreshold

**Multi-database queries** — the server spans three MariaDB databases:
- `xv3` — main NMS data (devices, interfaces, topology, configs, users)
- `xv3_perf` — performance time-series (`perf_data_10minute`, `_hourly`, `_daily`, `_monthly`)
- `xv3_issue` — event logs partitioned by month (`issue_log_01`…`issue_log_12`) + `issue_log_persist` for long-running issues

**`issue_log` table routing** (`tools/issueHelper.js → resolveIssueTables`):
- `active_only=true` → query only `issue_log_persist`
- Date range provided → query matching `issue_log_MM` tables only
- No date range → current month's `issue_log_MM` + `issue_log_persist` (persist filtered to `create_date < first_of_this_month` to avoid duplicates)

**Tool registration**: `index.js` is the single source of truth for tool names and Zod schemas. When changing a tool's API, update `index.js` first, then the implementation in `tools/`.

**Write-tool conventions** (`tools/set.js`):
- Validate required params before any DB access; throw descriptive errors
- Check entity existence; throw on failure
- Set `create_id`/`modify_id` to `'mcp'` for audit trail
- `fetchDeviceBasic(device_id)` helper provides name/IP for success responses
- `toggle_device_monitoring` re-reads actual DB state after UPDATE (does not trust caller-supplied values)

**`getIssueSummary` SQL pattern**: filters go in the LEFT JOIN `ON` clause, not WHERE — ensures zero-count severity rows still appear.

**`get_topology_links` map_id**: filters via subquery on `topology_nodes` because `topology_links` has no `map_id` column.

**Security**: `get_device` selects 31 explicit fields — `ro_community` and CLI password fields are intentionally omitted. `list_snmp_templates` also excludes `ro_community`.

**Limits**: most list tools default `limit: 100`; `get_device_cam_table` defaults to 200.

## Files to consult when changing behavior
- `index.js` — canonical tool definitions and Zod schemas
- `tools/get.js`, `tools/set.js`, `tools/perf.js`, `tools/issue.js` — implementations
- `tools/issueHelper.js` — monthly table resolution logic
- `db.js` — DB pooling and query helper
- `TOOLS.md` — full tool reference in Korean (parameters, response examples, safety notes)
- `README.md` / `CLAUDE.md` — setup, Claude Desktop config, systemd/PM2 deployment
