'use strict';
const { query } = require('../db');
const { getMonthlyTables } = require('./issueHelper');

async function fetchDeviceBasic(device_id) {
  const rows = await query(
    'SELECT id, name, ip FROM device_info WHERE id = ? AND deleted = 0',
    [device_id]
  );
  return rows[0] ?? null;
}

// ──────────────────────────────────────────────
// 장비(Device) 수정
// ──────────────────────────────────────────────

async function updateDeviceDescription({ device_id, description } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  if (description == null) throw new Error('description은 필수입니다.');

  const result = await query(
    `UPDATE device_info SET description = ?, modify_date = NOW() WHERE id = ? AND deleted = 0`,
    [description, device_id]
  );
  if (result.affectedRows === 0) throw new Error(`device_id ${device_id}를 찾을 수 없습니다.`);
  const device = await fetchDeviceBasic(device_id);
  return { success: true, device_id, device_name: device?.name, device_ip: device?.ip, description };
}

async function toggleDeviceMonitoring({ device_id, ping_enabled, snmp_enabled } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  if (ping_enabled == null && snmp_enabled == null) {
    throw new Error('ping_enabled 또는 snmp_enabled 중 하나는 필수입니다.');
  }

  const sets = [];
  const params = [];

  if (ping_enabled != null) { sets.push('ping_enabled = ?'); params.push(ping_enabled ? 1 : 0); }
  if (snmp_enabled != null) { sets.push('snmp_enabled = ?'); params.push(snmp_enabled ? 1 : 0); }
  sets.push('modify_date = NOW()');
  params.push(device_id);

  const result = await query(
    `UPDATE device_info SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`,
    params
  );
  if (result.affectedRows === 0) throw new Error(`device_id ${device_id}를 찾을 수 없습니다.`);
  const rows = await query('SELECT name, ip, ping_enabled, snmp_enabled FROM device_info WHERE id = ?', [device_id]);
  const device = rows[0];
  return { success: true, device_id, device_name: device?.name, device_ip: device?.ip, ping_enabled: !!device?.ping_enabled, snmp_enabled: !!device?.snmp_enabled };
}

async function setDeviceDisabled({ device_id, disabled } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  if (disabled == null) throw new Error('disabled(true/false)는 필수입니다.');

  const result = await query(
    `UPDATE device_info SET disabled = ?, modify_date = NOW() WHERE id = ? AND deleted = 0`,
    [disabled ? 1 : 0, device_id]
  );
  if (result.affectedRows === 0) throw new Error(`device_id ${device_id}를 찾을 수 없습니다.`);
  const device = await fetchDeviceBasic(device_id);
  return { success: true, device_id, device_name: device?.name, device_ip: device?.ip, disabled };
}

async function updateDeviceSysLocation({ device_id, sys_location } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  if (!sys_location) throw new Error('sys_location은 필수입니다.');

  const result = await query(
    `UPDATE device_info SET sys_location = ?, sys_location_fix = 1, modify_date = NOW()
     WHERE id = ? AND deleted = 0`,
    [sys_location, device_id]
  );
  if (result.affectedRows === 0) throw new Error(`device_id ${device_id}를 찾을 수 없습니다.`);
  const device = await fetchDeviceBasic(device_id);
  return { success: true, device_id, device_name: device?.name, device_ip: device?.ip, sys_location };
}

// ──────────────────────────────────────────────
// 장비 그룹 관리
// ──────────────────────────────────────────────

async function createDeviceGroup({ site_id, name, description = '' } = {}) {
  if (!site_id) throw new Error('site_id는 필수입니다.');
  if (!name) throw new Error('name은 필수입니다.');

  // 중복 확인
  const existing = await query(
    'SELECT id FROM device_group WHERE site_id = ? AND name = ?',
    [site_id, name]
  );
  if (existing.length > 0) throw new Error(`같은 이름의 그룹이 이미 존재합니다: ${name}`);

  const result = await query(
    `INSERT INTO device_group (site_id, name, description, disabled, create_id, create_date, modify_id, modify_date)
     VALUES (?, ?, ?, 0, 'mcp', NOW(), 'mcp', NOW())`,
    [site_id, name, description]
  );
  return { success: true, group_id: result.insertId, site_id, name, description };
}

async function addDeviceToGroup({ group_id, device_id } = {}) {
  if (!group_id) throw new Error('group_id는 필수입니다.');
  if (!device_id) throw new Error('device_id는 필수입니다.');

  // 장비 존재 확인
  const devices = await query('SELECT id, name, ip FROM device_info WHERE id = ? AND deleted = 0', [device_id]);
  if (!devices.length) throw new Error(`device_id ${device_id}를 찾을 수 없습니다.`);
  const device = devices[0];

  // 그룹 존재 확인
  const groups = await query('SELECT id FROM device_group WHERE id = ?', [group_id]);
  if (!groups.length) throw new Error(`group_id ${group_id}를 찾을 수 없습니다.`);

  // 이미 멤버인지 확인
  const member = await query(
    'SELECT id FROM device_group_mapping WHERE group_id = ? AND device_id = ?',
    [group_id, device_id]
  );
  if (member.length > 0) return { success: true, already_member: true, group_id, device_id, device_name: device.name, device_ip: device.ip };

  const result = await query(
    `INSERT INTO device_group_mapping (group_id, device_id, create_id, create_date, modify_id, modify_date)
     VALUES (?, ?, 'mcp', NOW(), 'mcp', NOW())`,
    [group_id, device_id]
  );
  return { success: true, mapping_id: result.insertId, group_id, device_id, device_name: device.name, device_ip: device.ip };
}

async function removeDeviceFromGroup({ group_id, device_id } = {}) {
  if (!group_id) throw new Error('group_id는 필수입니다.');
  if (!device_id) throw new Error('device_id는 필수입니다.');

  const device = await fetchDeviceBasic(device_id);
  if (!device) throw new Error(`device_id ${device_id}를 찾을 수 없습니다.`);

  const result = await query(
    'DELETE FROM device_group_mapping WHERE group_id = ? AND device_id = ?',
    [group_id, device_id]
  );
  if (result.affectedRows === 0) {
    throw new Error(`device_id ${device_id}는 group_id ${group_id}의 멤버가 아닙니다.`);
  }
  return { success: true, group_id, device_id, device_name: device?.name, device_ip: device?.ip };
}

async function updateDeviceGroupName({ group_id, name, description } = {}) {
  if (!group_id) throw new Error('group_id는 필수입니다.');
  if (!name && description == null) throw new Error('name 또는 description 중 하나는 필수입니다.');

  const sets = [];
  const params = [];
  if (name)            { sets.push('name = ?');        params.push(name); }
  if (description != null) { sets.push('description = ?'); params.push(description); }
  sets.push("modify_id = 'mcp'");
  sets.push('modify_date = NOW()');
  params.push(group_id);

  const result = await query(
    `UPDATE device_group SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
  if (result.affectedRows === 0) throw new Error(`group_id ${group_id}를 찾을 수 없습니다.`);
  return { success: true, group_id, name, description };
}

// ──────────────────────────────────────────────
// 토폴로지 링크 관리
// ──────────────────────────────────────────────

async function createTopologyLink({ site_id, source_device_id, target_device_id, color = null, thickness = 1 } = {}) {
  if (!site_id)           throw new Error('site_id는 필수입니다.');
  if (!source_device_id)  throw new Error('source_device_id는 필수입니다.');
  if (!target_device_id)  throw new Error('target_device_id는 필수입니다.');
  if (source_device_id === target_device_id) {
    throw new Error('source_device_id와 target_device_id는 서로 달라야 합니다.');
  }

  // 장비 존재 여부 확인
  const devices = await query(
    'SELECT id FROM device_info WHERE id IN (?, ?) AND deleted = 0',
    [source_device_id, target_device_id]
  );
  if (devices.length < 2) {
    throw new Error('source 또는 target 장비를 찾을 수 없습니다.');
  }

  const existing = await query(
    `SELECT id FROM topology_links
     WHERE site_id = ? AND ((source = ? AND target = ?) OR (source = ? AND target = ?))`,
    [site_id, source_device_id, target_device_id, target_device_id, source_device_id]
  );
  if (existing.length > 0) {
    throw new Error(`이미 존재하는 링크입니다. (link_id: ${existing[0].id})`);
  }

  const result = await query(
    `INSERT INTO topology_links (site_id, source, target, color, thickness, is_visible, is_custom, create_date)
     VALUES (?, ?, ?, ?, ?, 1, 1, NOW())`,
    [site_id, source_device_id, target_device_id, color, thickness]
  );
  return { success: true, link_id: result.insertId, site_id, source_device_id, target_device_id };
}

async function deleteTopologyLink({ link_id } = {}) {
  if (!link_id) throw new Error('link_id는 필수입니다.');

  const rows = await query(`
    SELECT l.id, l.site_id,
      d_s.name AS source_name, d_s.ip AS source_ip,
      d_t.name AS target_name, d_t.ip AS target_ip
    FROM topology_links l
    LEFT JOIN device_info d_s ON d_s.id = l.source
    LEFT JOIN device_info d_t ON d_t.id = l.target
    WHERE l.id = ?
  `, [link_id]);

  if (!rows.length) throw new Error(`link_id ${link_id}를 찾을 수 없습니다.`);
  const link = rows[0];

  await query('DELETE FROM topology_links WHERE id = ?', [link_id]);
  return { success: true, link_id, site_id: link.site_id, source_name: link.source_name, source_ip: link.source_ip, target_name: link.target_name, target_ip: link.target_ip };
}

// ──────────────────────────────────────────────
// 이슈 관리
// ──────────────────────────────────────────────

async function closeIssue({ issue_id } = {}) {
  if (!issue_id) throw new Error('issue_id는 필수입니다.');

  // 1단계: persist 테이블 UPDATE (현재 활성 이슈의 단일 출처)
  const rPersist = await query(
    `UPDATE xv3_issue.issue_log_persist SET end_date = NOW(), modify_date = NOW() WHERE id = ? AND end_date IS NULL`,
    [issue_id]
  );
  if (rPersist.affectedRows > 0) return { success: true, issue_id, closed_in: 'xv3_issue.issue_log_persist' };

  // 2단계: 월별 파티션 테이블에서 UPDATE 시도 (이번 달 포함 최근 3개월)
  const available = await getMonthlyTables();
  const now = new Date();
  const recentMonths = [0, 1, 2].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return `issue_log_${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const recentTables = recentMonths.filter(t => available.includes(t));

  for (const t of recentTables) {
    const r = await query(
      `UPDATE xv3_issue.${t} SET end_date = NOW(), modify_date = NOW() WHERE id = ? AND end_date IS NULL`,
      [issue_id]
    );
    if (r.affectedRows > 0) return { success: true, issue_id, closed_in: `xv3_issue.${t}` };
  }

  // 3단계: "이미 종료" vs "존재하지 않음" 구분 — persist + 최근 3개월 병렬 조회
  const checks = await Promise.all([
    query('SELECT end_date FROM xv3_issue.issue_log_persist WHERE id = ?', [issue_id]),
    ...recentTables.map(t =>
      query(`SELECT end_date FROM xv3_issue.${t} WHERE id = ?`, [issue_id]).catch(() => [])
    ),
  ]);

  const found = checks.flat().find(r => r != null);
  if (found) {
    throw new Error(`issue_id ${issue_id}는 이미 종료된 이슈입니다. (종료일시: ${found.end_date})`);
  }

  throw new Error(`issue_id ${issue_id}를 찾을 수 없습니다. (persist, 최근 ${recentTables.length}개월 파티션 테이블 조회)`);
}

module.exports = {
  updateDeviceDescription,
  toggleDeviceMonitoring,
  setDeviceDisabled,
  updateDeviceSysLocation,
  createDeviceGroup,
  addDeviceToGroup,
  removeDeviceFromGroup,
  updateDeviceGroupName,
  createTopologyLink,
  deleteTopologyLink,
  closeIssue,
};
