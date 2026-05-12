# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

An MCP (Model Context Protocol) server that exposes XV3 NMS (Network Management System) MariaDB data to AI clients like Claude Desktop. It provides 37 tools for querying and modifying network device data.

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

## Architecture

### Entry Point: `index.js`

Registers all 37 MCP tools using Zod schemas for parameter validation. Each tool definition maps to a function in `tools/get.js` or `tools/set.js`. Two transport modes are supported:

- **Stdio** (default, `npm start`): Used by Claude Desktop via `claude_desktop_config.json`
- **HTTP** (`--http [port]`): Express server on port 3334 with session management and health check at `/health`

**Response helpers:**
- `ok(data)` — arrays are wrapped as `{ count: N, items: [...] }`, single objects returned as-is
- `err(e)` — returns `isError: true` with Korean error message

### `db.js`

MySQL2 connection pool reading config from `.env` via `dotenv`. Exports `query(sql, params)` and `pool`. All SQL uses parameterized queries.

### `tools/get.js` — Read operations (26 tools)

Query functions cover: devices, interfaces, IP/MAC tables, alarms, issues (including `getIssueSummary` for severity-grouped active issue counts), sites, groups, users, topology maps/nodes/links, collectors, device configs, SNMP templates, and system settings.

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

### Key DB Tables

| Table | Purpose |
|---|---|
| `device_info` | Network devices (status, SNMP/Ping config) |
| `site_info` | Sites |
| `collect_interface` | Ports/interfaces |
| `collect_interface_ip` | IP addresses per interface |
| `collect_interface_cam` | MAC/ARP table |
| `device_group` / `device_group_mapping` | Device grouping |
| `issue_log_01` | Event/alarm log |
| `topology_map` / `topology_nodes` / `topology_links` | Network topology |
| `alarm_history` | Alarm delivery records |
| `config_data` / `config_history` | Config backups |
| `user_info` / `user_group` | Users |

### Status Code Gotcha

Device status and interface status use different DOWN values:

| Field | UP | DOWN |
|---|---|---|
| `device_info.status` | 1 | **0** |
| `collect_interface.admin_status` / `oper_status` | 1 | **2** |

### Tool Documentation

`TOOLS.md` contains the full tool reference in Korean, including all parameters, response formats, and safety behavior for all 37 tools.
