# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

An MCP (Model Context Protocol) server that exposes XV3 NMS (Network Management System) MariaDB data to AI clients like Claude Desktop. It provides 35 tools for querying and modifying network device data.

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

## Architecture

### Entry Point: `index.js`

Registers all 35 MCP tools using Zod schemas for parameter validation. Each tool definition maps to a function in `tools/get.js` or `tools/set.js`. Two transport modes are supported:

- **Stdio** (default, `npm start`): Used by Claude Desktop via `claude_desktop_config.json`
- **HTTP** (`--http [port]`): Express server on port 3334 with session management and health check at `/health`

Response helpers `ok(data)` and `err(message)` produce the consistent MCP text response format.

### `db.js`

MySQL2 connection pool pointing to the XV3 NMS MariaDB instance. Exports `query(sql, params)` and `pool`. All SQL uses parameterized queries.

### `tools/get.js` — Read operations (24 tools)

Query functions cover: devices, interfaces, IP/MAC tables, alarms, issues, sites, groups, users, topology maps/nodes/links, collectors, device configs, SNMP templates, and system settings.

### `tools/set.js` — Write operations (11 tools)

Mutation functions cover: device description/monitoring/disabled/sysLocation, device group CRUD, topology link create/delete, and closing issues.

**Write function patterns:**
- Validate required params before DB access
- Check foreign key existence before insert/update
- Set `create_id`/`modify_id` to `'mcp'` for audit trail
- Return `affectedRows` count in the result

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
| `topology_map/nodes/links` | Network topology |
| `alarm_history` | Alarm delivery records |
| `config_data` / `config_history` | Config backups |
| `user_info` / `user_group` | Users |

### Tool Documentation

`TOOLS.md` contains the full tool reference in Korean, including all parameters, types, and descriptions for all 35 tools.
