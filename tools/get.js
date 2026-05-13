'use strict';
const { query } = require('../db');

// ──────────────────────────────────────────────
// 장비(Device) 조회
// ──────────────────────────────────────────────

async function listDevices({ site_id, status, vendor, device_type_id, group_id, disabled, name, site_name, limit = 100 } = {}) {
  let sql = `
    SELECT
      d.id, d.site_id, s.name AS site_name,
      d.name, d.ip, d.vendor, d.model,
      dt.name AS device_type,
      d.status, d.disabled,
      d.sys_location, d.sys_uptime,
      d.ping_enabled, d.snmp_enabled, d.config_enabled,
      d.description, d.create_date, d.modify_date
    FROM device_info d
    LEFT JOIN site_info s ON s.id = d.site_id
    LEFT JOIN device_type dt ON dt.id = d.device_type_id
    WHERE d.deleted = 0
  `;
  const params = [];

  if (site_id != null)        { sql += ' AND d.site_id = ?';       params.push(site_id); }
  if (status != null)         { sql += ' AND d.status = ?';        params.push(status); }
  if (vendor)                 { sql += ' AND d.vendor LIKE ?';     params.push(`%${vendor}%`); }
  if (device_type_id != null) { sql += ' AND d.device_type_id = ?'; params.push(device_type_id); }
  if (disabled != null)       { sql += ' AND d.disabled = ?';      params.push(disabled); }
  if (name)                   { sql += ' AND d.name LIKE ?';       params.push(`%${name}%`); }
  if (site_name)              { sql += ' AND s.name LIKE ?';       params.push(`%${site_name}%`); }

  if (group_id != null) {
    sql += ' AND d.id IN (SELECT device_id FROM device_group_mapping WHERE group_id = ?)';
    params.push(group_id);
  }

  sql += ` ORDER BY d.site_id, d.name LIMIT ?`;
  params.push(Number(limit));

  return query(sql, params);
}

async function getDevice({ id, ip } = {}) {
  if (!id && !ip) throw new Error('id 또는 ip 중 하나는 필수입니다.');

  let sql = `
    SELECT
      d.id, d.site_id,
      s.name AS site_name, s.site_code,
      d.name, d.vendor, d.model, d.ip,
      d.device_type_id,
      dt.name AS device_type_name,
      d.status, d.disabled,
      d.sys_location, d.sys_uptime, d.sys_oid,
      d.ping_enabled, d.snmp_enabled, d.config_enabled, d.port_collect_enabled,
      d.ping_template_id, d.snmp_template_id,
      snmp.name AS snmp_template_name, snmp.snmp_version,
      ping.name AS ping_template_name,
      d.service_type, d.service_layer,
      d.telemetry_enable, d.dnac_device_id,
      d.description,
      d.create_date, d.modify_date
    FROM device_info d
    LEFT JOIN site_info s ON s.id = d.site_id
    LEFT JOIN device_type dt ON dt.id = d.device_type_id
    LEFT JOIN snmp_template snmp ON snmp.id = d.snmp_template_id
    LEFT JOIN ping_template ping ON ping.id = d.ping_template_id
    WHERE d.deleted = 0
  `;
  const params = [];

  if (id)  { sql += ' AND d.id = ?'; params.push(id); }
  else     { sql += ' AND d.ip = ?'; params.push(ip); }

  const rows = await query(sql, params);
  return rows[0] ?? null;
}

async function getDeviceInterfaces({ device_id, admin_status, oper_status } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');

  let sql = `
    SELECT
      ci.id, ci.device_id, ci.interface_id,
      ci.name, ci.description, ci.alias,
      ci.speed, ci.admin_mac,
      ci.admin_status, ci.oper_status,
      ci.duplex, ci.stp_status,
      ci.last_octet_value, ci.last_used_date,
      ci.create_date, ci.modify_date
    FROM collect_interface ci
    WHERE ci.device_id = ?
  `;
  const params = [device_id];

  if (admin_status != null) { sql += ' AND ci.admin_status = ?'; params.push(admin_status); }
  if (oper_status  != null) { sql += ' AND ci.oper_status = ?';  params.push(oper_status); }

  sql += ' ORDER BY ci.interface_id';
  return query(sql, params);
}

async function listDeviceInterfaceSummary({
  site_id,
  site_name,
  name,
  status,
  vendor,
  device_type_id,
  group_id,
  disabled,
  admin_status,
  oper_status,
  limit = 100,
} = {}) {
  let sql = `
    SELECT
      d.id AS device_id,
      d.site_id,
      s.name AS site_name,
      d.name AS device_name,
      d.ip AS device_ip,
      d.vendor,
      d.model,
      dt.name AS device_type,
      d.status AS device_status,
      d.disabled,
      COUNT(ci.id) AS interface_total,
      CAST(SUM(CASE WHEN ci.admin_status = 1 THEN 1 ELSE 0 END) AS UNSIGNED) AS admin_up,
      CAST(SUM(CASE WHEN ci.admin_status = 2 THEN 1 ELSE 0 END) AS UNSIGNED) AS admin_down,
      CAST(SUM(CASE WHEN ci.oper_status = 1 THEN 1 ELSE 0 END) AS UNSIGNED) AS oper_up,
      CAST(SUM(CASE WHEN ci.oper_status = 2 THEN 1 ELSE 0 END) AS UNSIGNED) AS oper_down,
      CAST(SUM(CASE WHEN ci.description IS NOT NULL AND ci.description <> '' THEN 1 ELSE 0 END) AS UNSIGNED) AS description_count,
      CAST(SUM(CASE WHEN ci.alias IS NOT NULL AND ci.alias <> '' THEN 1 ELSE 0 END) AS UNSIGNED) AS alias_count,
      MAX(ci.modify_date) AS interface_last_modified
    FROM device_info d
    LEFT JOIN site_info s ON s.id = d.site_id
    LEFT JOIN device_type dt ON dt.id = d.device_type_id
    LEFT JOIN collect_interface ci ON ci.device_id = d.id
    WHERE d.deleted = 0
  `;
  const params = [];

  if (site_id != null)        { sql += ' AND d.site_id = ?';       params.push(site_id); }
  if (site_name)              { sql += ' AND s.name LIKE ?';       params.push(`%${site_name}%`); }
  if (name)                   { sql += ' AND d.name LIKE ?';       params.push(`%${name}%`); }
  if (status != null)         { sql += ' AND d.status = ?';        params.push(status); }
  if (vendor)                 { sql += ' AND d.vendor LIKE ?';     params.push(`%${vendor}%`); }
  if (device_type_id != null) { sql += ' AND d.device_type_id = ?'; params.push(device_type_id); }
  if (disabled != null)       { sql += ' AND d.disabled = ?';      params.push(disabled); }
  if (admin_status != null)   { sql += ' AND ci.admin_status = ?'; params.push(admin_status); }
  if (oper_status != null)    { sql += ' AND ci.oper_status = ?';  params.push(oper_status); }

  if (group_id != null) {
    sql += ' AND d.id IN (SELECT device_id FROM device_group_mapping WHERE group_id = ?)';
    params.push(group_id);
  }

  sql += `
    GROUP BY d.id, d.site_id, s.name, d.name, d.ip, d.vendor, d.model,
             dt.name, d.status, d.disabled
    ORDER BY d.site_id, d.name
    LIMIT ?
  `;
  params.push(Number(limit));

  return query(sql, params);
}

async function getDeviceIpAddresses({ device_id } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');

  return query(`
    SELECT
      ip.id, ip.device_id, ip.interface_id,
      ip.interface_ip, ip.network_ip, ip.network_mask,
      ci.name AS interface_name,
      ip.create_date, ip.modify_date
    FROM collect_interface_ip ip
    LEFT JOIN collect_interface ci
      ON ci.device_id = ip.device_id AND ci.interface_id = ip.interface_id
    WHERE ip.device_id = ?
    ORDER BY ip.interface_id
  `, [device_id]);
}

async function getDeviceCamTable({ device_id, interface_id, mac, ip, limit = 200 } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');

  let sql = `
    SELECT
      cam.device_id, cam.interface_id,
      ci.name AS interface_name,
      cam.mac, cam.ip, cam.vlan,
      cam.create_date, cam.modify_date, cam.delete_date
    FROM collect_interface_cam cam
    LEFT JOIN collect_interface ci
      ON ci.device_id = cam.device_id AND ci.interface_id = cam.interface_id
    WHERE cam.device_id = ? AND cam.delete_date IS NULL
  `;
  const params = [device_id];

  if (interface_id != null) { sql += ' AND cam.interface_id = ?'; params.push(interface_id); }
  if (mac)                  { sql += ' AND cam.mac LIKE ?';       params.push(`%${mac}%`); }
  if (ip)                   { sql += ' AND cam.ip LIKE ?';        params.push(`%${ip}%`); }

  sql += ' ORDER BY cam.interface_id, cam.ip LIMIT ?';
  params.push(Number(limit));
  return query(sql, params);
}

// IP로 장비 또는 인터페이스 검색
async function searchByIp({ ip } = {}) {
  if (!ip) throw new Error('ip는 필수입니다.');

  const devices = await query(`
    SELECT id, site_id, name, ip, vendor, model, status, disabled
    FROM device_info
    WHERE ip LIKE ? AND deleted = 0
    LIMIT 20
  `, [`%${ip}%`]);

  const interfaces = await query(`
    SELECT
      iip.device_id, d.name AS device_name, d.ip AS device_ip,
      iip.interface_ip, iip.network_ip, iip.network_mask,
      ci.name AS interface_name
    FROM collect_interface_ip iip
    JOIN device_info d ON d.id = iip.device_id
    LEFT JOIN collect_interface ci
      ON ci.device_id = iip.device_id AND ci.interface_id = iip.interface_id
    WHERE iip.interface_ip LIKE ? AND d.deleted = 0
    LIMIT 20
  `, [`%${ip}%`]);

  return { devices, interfaces };
}

// ──────────────────────────────────────────────
// 알람 / 이슈
// ──────────────────────────────────────────────

async function listAlarms({ device_ip, device_name, start_date, end_date, limit = 100 } = {}) {
  let sql = `
    SELECT alarm_type_id, device_name, device_ip, message,
           receiver, sender, single, create_date, comment
    FROM alarm_history
    WHERE 1=1
  `;
  const params = [];

  if (device_ip)   { sql += ' AND device_ip LIKE ?';   params.push(`%${device_ip}%`); }
  if (device_name) { sql += ' AND device_name LIKE ?'; params.push(`%${device_name}%`); }
  if (start_date)  { sql += ' AND create_date >= ?';   params.push(start_date); }
  if (end_date)    { sql += ' AND create_date <= ?';   params.push(end_date); }

  sql += ' ORDER BY create_date DESC LIMIT ?';
  params.push(Number(limit));

  return query(sql, params);
}

async function listIssues({ device_id, severity, issue_type, start_date, end_date, active_only, limit = 100 } = {}) {
  let sql = `
    SELECT
      il.id, il.device_id,
      d.name AS device_name, d.ip AS device_ip,
      il.issue_type,
      it.issue_name AS issue_type_name,
      il.severity,
      ise.severity AS severity_name,
      il.interface_name, il.instance_name,
      il.message, il.count,
      il.create_date, il.modify_date, il.end_date,
      il.is_display
    FROM issue_log_01 il
    LEFT JOIN device_info d ON d.id = il.device_id
    LEFT JOIN issue_type it ON it.issue_code = il.issue_type
    LEFT JOIN issue_severity ise ON ise.id = il.severity
    WHERE 1=1
  `;
  const params = [];

  if (device_id)   { sql += ' AND il.device_id = ?';   params.push(device_id); }
  if (severity)    { sql += ' AND il.severity = ?';    params.push(severity); }
  if (issue_type)  { sql += ' AND il.issue_type = ?';  params.push(issue_type); }
  if (start_date)  { sql += ' AND il.create_date >= ?'; params.push(start_date); }
  if (end_date)    { sql += ' AND il.create_date <= ?'; params.push(end_date); }
  if (active_only) { sql += ' AND il.end_date IS NULL'; }

  sql += ' ORDER BY il.modify_date DESC LIMIT ?';
  params.push(Number(limit));

  return query(sql, params);
}

async function getIssueSummary({ device_id, site_id } = {}) {
  const params = [];
  let onClause = 'il.severity = ise.id AND il.end_date IS NULL';

  if (device_id != null) {
    onClause += ' AND il.device_id = ?';
    params.push(device_id);
  }
  if (site_id != null) {
    onClause += ' AND EXISTS (SELECT 1 FROM device_info d WHERE d.id = il.device_id AND d.site_id = ?)';
    params.push(site_id);
  }

  const sql = `
    SELECT
      ise.id AS severity_id,
      ise.severity AS severity_name,
      COUNT(il.id) AS count
    FROM issue_severity ise
    LEFT JOIN issue_log_01 il ON ${onClause}
    GROUP BY ise.id, ise.severity
    ORDER BY ise.id
  `;

  const rows = await query(sql, params);
  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
  return { total_active: total, by_severity: rows };
}

async function listIssueTypes() {
  return query('SELECT issue_code, issue_name, disabled FROM issue_type ORDER BY issue_code');
}

async function listIssueSeverities() {
  return query('SELECT id, severity, dnac_priority, disabled FROM issue_severity ORDER BY id');
}

// ──────────────────────────────────────────────
// 사이트 / 그룹 / 사용자
// ──────────────────────────────────────────────

async function listSites() {
  return query(`
    SELECT id, site_code, name, country_code, time_zone, description, disabled
    FROM site_info
    ORDER BY id
  `);
}

async function listDeviceGroups({ site_id, name } = {}) {
  let sql = `
    SELECT g.id, g.site_id, s.name AS site_name,
           g.name, g.description, g.disabled,
           COUNT(m.device_id) AS device_count
    FROM device_group g
    LEFT JOIN site_info s ON s.id = g.site_id
    LEFT JOIN device_group_mapping m ON m.group_id = g.id
    WHERE 1=1
  `;
  const params = [];
  if (site_id != null) { sql += ' AND g.site_id = ?'; params.push(site_id); }
  if (name)            { sql += ' AND g.name LIKE ?';  params.push(`%${name}%`); }
  sql += ' GROUP BY g.id ORDER BY g.site_id, g.name';
  return query(sql, params);
}

async function getDeviceGroupMembers({ group_id } = {}) {
  if (!group_id) throw new Error('group_id는 필수입니다.');
  return query(`
    SELECT m.id, m.group_id, m.device_id,
           d.name AS device_name, d.ip AS device_ip,
           d.vendor, d.model, d.status, d.disabled
    FROM device_group_mapping m
    JOIN device_info d ON d.id = m.device_id
    WHERE m.group_id = ? AND d.deleted = 0
    ORDER BY d.name
  `, [group_id]);
}

async function listUsers({ site_id, role_type, group_id, limit = 100 } = {}) {
  let sql = `
    SELECT
      u.id, u.site_id, s.name AS site_name,
      u.user_id, u.name, u.role_type, u.is_master,
      ug.name AS group_name,
      u.dept_name, u.position_name,
      u.phone, u.mobile, u.email,
      u.notification, u.create_date, u.modify_date
    FROM user_info u
    LEFT JOIN site_info s ON s.id = u.site_id
    LEFT JOIN user_group ug ON ug.id = u.group_id
    WHERE 1=1
  `;
  const params = [];
  if (site_id)   { sql += ' AND u.site_id = ?';  params.push(site_id); }
  if (role_type) { sql += ' AND u.role_type = ?'; params.push(role_type); }
  if (group_id)  { sql += ' AND u.group_id = ?'; params.push(group_id); }
  sql += ' ORDER BY u.site_id, u.name LIMIT ?';
  params.push(Number(limit));
  return query(sql, params);
}

// ──────────────────────────────────────────────
// 토폴로지
// ──────────────────────────────────────────────

async function listTopologyMaps({ site_id } = {}) {
  let sql = `
    SELECT id, site_id, name, topo_type, disabled,
           background_enabled, create_date, modify_date
    FROM topology_map WHERE 1=1
  `;
  const params = [];
  if (site_id != null) { sql += ' AND site_id = ?'; params.push(site_id); }
  sql += ' ORDER BY site_id, name';
  return query(sql, params);
}

async function getTopologyNodes({ map_id } = {}) {
  if (!map_id) throw new Error('map_id는 필수입니다.');
  return query(`
    SELECT
      n.id, n.map_id, n.device_id,
      d.name AS device_name, d.ip AS device_ip,
      d.vendor, d.model, d.status,
      n.icon_type, n.x, n.y, n.disabled
    FROM topology_nodes n
    LEFT JOIN device_info d ON d.id = n.device_id
    WHERE n.map_id = ?
    ORDER BY n.id
  `, [map_id]);
}

async function getTopologyLinks({ map_id, site_id } = {}) {
  let sql = `
    SELECT
      l.id, l.site_id, l.source, l.target,
      d_s.name AS source_name, d_s.ip AS source_ip,
      d_t.name AS target_name, d_t.ip AS target_ip,
      l.color, l.thickness, l.is_visible, l.is_custom
    FROM topology_links l
    LEFT JOIN device_info d_s ON d_s.id = l.source
    LEFT JOIN device_info d_t ON d_t.id = l.target
    WHERE 1=1
  `;
  const params = [];
  if (map_id != null)  { sql += ' AND l.source IN (SELECT device_id FROM topology_nodes WHERE map_id = ?) AND l.target IN (SELECT device_id FROM topology_nodes WHERE map_id = ?)'; params.push(map_id, map_id); }
  if (site_id != null) { sql += ' AND l.site_id = ?'; params.push(site_id); }
  sql += ' ORDER BY l.id';
  return query(sql, params);
}

// ──────────────────────────────────────────────
// 수집기 / 설정 / 기타
// ──────────────────────────────────────────────

async function listCollectors() {
  return query(`
    SELECT id, name, ip, server_type, status, description, disabled,
           last_update_date, create_date
    FROM collector_info
    ORDER BY id
  `);
}

async function getDeviceConfig({ device_id } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  return query(`
    SELECT id, device_id, protocol, insert_date,
           SUBSTRING(config_data, 1, 5000) AS config_data_preview
    FROM config_data
    WHERE device_id = ?
    ORDER BY insert_date DESC
    LIMIT 5
  `, [device_id]);
}

async function getConfigHistory({ device_id, limit = 20 } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  return query(`
    SELECT setup_id, device_id, insert_date, is_success,
           fail_reason, chg_identity, user_id, is_full
    FROM config_history
    WHERE device_id = ?
    ORDER BY insert_date DESC
    LIMIT ?
  `, [device_id, Number(limit)]);
}

async function listDeviceTypes() {
  return query(`
    SELECT id, name, icon_type, sort_seq, disabled
    FROM device_type WHERE disabled = 0 ORDER BY sort_seq
  `);
}

async function getDeviceStatusSummary({ site_id } = {}) {
  let sql = `
    SELECT
      s.name AS site_name,
      COUNT(*) AS total,
      SUM(CASE WHEN d.status = 1 THEN 1 ELSE 0 END) AS up,
      SUM(CASE WHEN d.status = 0 THEN 1 ELSE 0 END) AS down,
      SUM(CASE WHEN d.disabled = 1 THEN 1 ELSE 0 END) AS disabled,
      SUM(CASE WHEN d.ping_enabled = 1 THEN 1 ELSE 0 END) AS ping_enabled,
      SUM(CASE WHEN d.snmp_enabled = 1 THEN 1 ELSE 0 END) AS snmp_enabled
    FROM device_info d
    LEFT JOIN site_info s ON s.id = d.site_id
    WHERE d.deleted = 0
  `;
  const params = [];
  if (site_id != null) { sql += ' AND d.site_id = ?'; params.push(site_id); }
  sql += ' GROUP BY d.site_id, s.name ORDER BY s.name';
  return query(sql, params);
}

async function listSnmpTemplates({ site_id } = {}) {
  let sql = `
    SELECT id, site_id, name, snmp_version,
           security_level, user_name, auth_protocol, timeout, description
    FROM snmp_template WHERE 1=1
  `;
  const params = [];
  if (site_id != null) { sql += ' AND site_id = ?'; params.push(site_id); }
  sql += ' ORDER BY site_id, name';
  return query(sql, params);
}

async function getSystemSettings({ site_id } = {}) {
  let sql = `
    SELECT site_id, group_code, base_code, name, name_eng,
           value1, value2, value3, value4, value5
    FROM system_setting WHERE 1=1
  `;
  const params = [];
  if (site_id != null) { sql += ' AND site_id = ?'; params.push(site_id); }
  sql += ' ORDER BY site_id, group_code, base_code';
  return query(sql, params);
}

module.exports = {
  getIssueSummary,
  listDevices,
  getDevice,
  getDeviceInterfaces,
  listDeviceInterfaceSummary,
  getDeviceIpAddresses,
  getDeviceCamTable,
  searchByIp,
  listAlarms,
  listIssues,
  listIssueTypes,
  listIssueSeverities,
  listSites,
  listDeviceGroups,
  getDeviceGroupMembers,
  listUsers,
  listTopologyMaps,
  getTopologyNodes,
  getTopologyLinks,
  listCollectors,
  getDeviceConfig,
  getConfigHistory,
  listDeviceTypes,
  getDeviceStatusSummary,
  listSnmpTemplates,
  getSystemSettings,
};
