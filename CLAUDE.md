# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

An MCP (Model Context Protocol) server that exposes XV3 NMS (Network Management System) MariaDB data to AI clients like Claude Desktop. It provides 44 tools for querying and modifying network device data.

## Commands

```bash
# Start server in stdio mode (used by Claude Desktop)
npm start

# Start server in HTTP mode (port 3334)
npm run start:http

# Install dependencies
npm install
```

There is no build, lint, or test step configured.

## Configuration

DB connection info is managed via `.env`. Copy `.env.example` to `.env` and fill in the values before running.

```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_CONNECTION_LIMIT, DB_TIMEZONE
```

Optional: `MCP_API_KEY` — if set, HTTP mode requires `Authorization: Bearer <key>` header.

## Architecture

### Entry Point: `index.js`

Registers all 44 MCP tools using Zod schemas for parameter validation. Each tool definition maps to a function in `tools/get.js`, `tools/set.js`, `tools/perf.js`, or `tools/issue.js`. Two transport modes are supported:

- **Stdio** (default, `npm start`): Used by Claude Desktop via `claude_desktop_config.json`
- **HTTP** (`--http [port]`): Express server on port 3334 with session management and health check at `/health`

**Response helpers:**
- `ok(data)` — arrays are wrapped as `{ count: N, items: [...] }`, single objects returned as-is
- `err(e)` — returns `isError: true` with Korean error message

### `db.js`

MySQL2 connection pool reading config from `.env` via `dotenv` (`quiet: true` — suppresses stdout output to avoid stdio contamination). Exports `query(sql, params)` and `pool`. All SQL uses parameterized queries.

### `tools/get.js` — Read operations (26 tools)

Query functions cover: devices, interfaces, IP/MAC tables, alarms, issues (including `getIssueSummary` for severity-grouped active issue counts), sites, groups, users, topology maps/nodes/links, collectors, device configs, SNMP templates, and system settings.

**Filter consistency**: `list_devices`, `list_device_interface_summary` share the same filter set (`name`, `site_name`, `site_id`, `status`, `vendor`, `device_type_id`, `group_id`, `disabled`). `list_device_groups` supports `site_id` and `name` partial search.

**Limits**: `get_device_cam_table` defaults to 200 (CAM tables can be large). Most other list tools default to 100.

**Security**: `get_device` returns 31 explicit fields only — `ro_community` and CLI password fields are excluded. `list_snmp_templates` also excludes `ro_community`.

**`getIssueSummary` SQL pattern**: filters (`device_id`, `site_id`) are applied in the `ON` clause of the LEFT JOIN, not the WHERE clause — this ensures severity rows with 0 active issues still appear in results.

**`getTopologyLinks` map_id**: filters via subquery on `topology_nodes` since `topology_links` has no `map_id` column directly.

### `tools/set.js` — Write operations (11 tools)

Mutation functions cover: device description/monitoring/disabled/sysLocation, device group CRUD, topology link create/delete, and closing issues.

**Write function conventions:**
- Validate required params before DB access
- Check entity existence; throw descriptive errors on failure
- Set `create_id`/`modify_id` to `'mcp'` for audit trail
- Success responses include `device_name` and `device_ip` for clear confirmation
- `toggle_device_monitoring` returns actual DB state after update, not caller-supplied values
- `fetchDeviceBasic(device_id)` helper in `set.js` reused across functions for name/IP lookup

**Safety checks per tool:**
- `remove_device_from_group` — throws if device is not a member
- `create_topology_link` — checks both directions (A→B and B→A) for duplicate links
- `delete_topology_link` — fetches link info before deleting; throws if not found
- `closeIssue` — distinguishes "not found" vs "already closed" errors

### `tools/perf.js` — Performance data (4 tools)

Query functions for `xv3_perf` DB performance time-series data.

**Granularity options**: `10min` / `hourly` (default) / `daily` / `monthly` — maps to corresponding `perf_data_*` tables.

**`getPerfTopN` branching logic**: when `device_id` is provided, checks `collect_type` from `xv3.collect_item` to decide whether to return instance Top N (device-level items: CPU/Memory) or interface Top N (interface-level items: bps/Util/PPS).

### `tools/issue.js` — Event log (3 tools)

Query functions for `xv3_issue` DB event logs.

- `listEvents` — queries `xv3_issue.issue_log` with filters: `device_id`, `site_id`, `issue_type`, `severity`, `syslog_keyword` (Facility-Severity format, e.g. `5-4`), date range, `active_only`
- `getEventSummary` — aggregates by `issue_type` and `severity` with `total` + `by_type` + `by_severity`
- `listPersistentIssues` — queries `xv3_issue.issue_log_persist` (long-running issues), defaults to `active_only=true`

**issue_type codes**: `S`=Syslog, `C`=Threshold, `P`=Ping, `A`=TempFault, `F`=FAN, `I`=PortStatus, `M`=SystemEvent, `N`=ModuleDown, `E`=EventManager, `O`=AutoProvisioning, `R`=PowerFault, `W`=WirelessThreshold

### Key DB Tables

| DB | Table | Purpose |
|---|---|---|
| `xv3` | `device_info` | Network devices (status, SNMP/Ping config) |
| `xv3` | `site_info` | Sites |
| `xv3` | `collect_interface` | Ports/interfaces |
| `xv3` | `collect_interface_ip` | IP addresses per interface |
| `xv3` | `collect_interface_cam` | MAC/ARP table |
| `xv3` | `device_group` / `device_group_mapping` | Device grouping |
| `xv3` | `topology_map` / `topology_nodes` / `topology_links` | Network topology |
| `xv3` | `alarm_history` | Alarm delivery records |
| `xv3` | `config_data` / `config_history` | Config backups |
| `xv3` | `user_info` / `user_group` | Users |
| `xv3_perf` | `perf_data_10minute` / `perf_data_hourly` / `perf_data_daily` / `perf_data_monthly` | Performance time-series |
| `xv3_issue` | `issue_log` | Event log (Syslog/Threshold/Ping etc.) |
| `xv3_issue` | `issue_log_persist` | Long-running persistent issues |

### Status Code Gotcha

Device status and interface status use different DOWN values:

| Field | UP | DOWN |
|---|---|---|
| `device_info.status` | 1 | **0** |
| `collect_interface.admin_status` / `oper_status` | 1 | **2** |

### Tool Documentation

`TOOLS.md` contains the full tool reference in Korean, including all parameters, response formats, and safety behavior for all 44 tools.
