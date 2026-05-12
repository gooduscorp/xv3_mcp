'use strict';
const { query } = require('../db');

// ──────────────────────────────────────────────
// 이벤트 로그 조회 (xv3_issue.issue_log)
// ──────────────────────────────────────────────
async function listEvents({
  device_id,
  site_id,
  issue_type,
  severity,
  syslog_keyword,
  start_date,
  end_date,
  active_only,
  limit = 100,
} = {}) {
  let sql = `
    SELECT
      il.id,
      il.device_id,
      d.name        AS device_name,
      d.ip          AS device_ip,
      il.issue_type,
      it.issue_name,
      il.collect_item_id,
      il.interface_id,
      il.interface_name,
      il.instance_id,
      il.instance_name,
      il.severity,
      ise.severity  AS severity_name,
      il.syslog_keyword,
      il.message,
      il.count,
      il.is_display,
      il.create_date,
      il.modify_date,
      il.end_date
    FROM xv3_issue.issue_log il
    LEFT JOIN xv3.device_info d   ON d.id          = il.device_id
    LEFT JOIN xv3.issue_type it   ON it.issue_code  = il.issue_type
    LEFT JOIN xv3.issue_severity ise ON ise.id      = il.severity
    WHERE 1=1
  `;
  const params = [];

  if (device_id != null)  { sql += ' AND il.device_id = ?';             params.push(device_id); }
  if (site_id != null)    { sql += ' AND d.site_id = ?';                params.push(site_id); }
  if (issue_type)         { sql += ' AND il.issue_type = ?';            params.push(issue_type); }
  if (severity != null)   { sql += ' AND il.severity = ?';              params.push(severity); }
  if (syslog_keyword)     { sql += ' AND il.syslog_keyword LIKE ?';     params.push(`%${syslog_keyword}%`); }
  if (start_date)         { sql += ' AND il.create_date >= ?';          params.push(start_date); }
  if (end_date)           { sql += ' AND il.create_date <= ?';          params.push(end_date); }
  if (active_only)        { sql += ' AND il.end_date IS NULL'; }

  sql += ' ORDER BY il.create_date DESC LIMIT ?';
  params.push(Number(limit));

  return query(sql, params);
}

// ──────────────────────────────────────────────
// 이벤트 집계 요약 (타입별 + 심각도별)
// ──────────────────────────────────────────────
async function getEventSummary({ device_id, site_id, start_date, end_date } = {}) {
  const buildWhere = (params) => {
    const conds = ['1=1'];
    if (device_id != null) { conds.push('il.device_id = ?'); params.push(device_id); }
    if (site_id != null)   { conds.push('d.site_id = ?');    params.push(site_id); }
    if (start_date)        { conds.push('il.create_date >= ?'); params.push(start_date); }
    if (end_date)          { conds.push('il.create_date <= ?'); params.push(end_date); }
    return conds.join(' AND ');
  };

  const joinDevice = site_id != null
    ? 'LEFT JOIN xv3.device_info d ON d.id = il.device_id'
    : '';

  const p1 = [], p2 = [];
  const where1 = buildWhere(p1);
  const where2 = buildWhere(p2);

  const byType = await query(`
    SELECT
      il.issue_type,
      it.issue_name,
      COUNT(*) AS count
    FROM xv3_issue.issue_log il
    LEFT JOIN xv3.issue_type it ON it.issue_code = il.issue_type
    ${joinDevice}
    WHERE ${where1}
    GROUP BY il.issue_type, it.issue_name
    ORDER BY count DESC
  `, p1);

  const bySeverity = await query(`
    SELECT
      il.severity,
      ise.severity AS severity_name,
      COUNT(*) AS count
    FROM xv3_issue.issue_log il
    LEFT JOIN xv3.issue_severity ise ON ise.id = il.severity
    ${joinDevice}
    WHERE ${where2}
    GROUP BY il.severity, ise.severity
    ORDER BY il.severity
  `, p2);

  const total = byType.reduce((s, r) => s + Number(r.count), 0);
  return { total, by_type: byType, by_severity: bySeverity };
}

// ──────────────────────────────────────────────
// 지속 이슈 조회 (xv3_issue.issue_log_persist)
// 현재 진행 중이거나 장기화된 이슈 목록
// ──────────────────────────────────────────────
async function listPersistentIssues({
  device_id,
  issue_type,
  severity,
  active_only = true,
  limit = 100,
} = {}) {
  let sql = `
    SELECT
      il.id,
      il.device_id,
      d.name        AS device_name,
      d.ip          AS device_ip,
      il.issue_type,
      it.issue_name,
      il.collect_item_id,
      il.interface_id,
      il.interface_name,
      il.instance_id,
      il.instance_name,
      il.severity,
      ise.severity  AS severity_name,
      il.syslog_keyword,
      il.message,
      il.count,
      il.create_date,
      il.modify_date,
      il.end_date
    FROM xv3_issue.issue_log_persist il
    LEFT JOIN xv3.device_info d      ON d.id         = il.device_id
    LEFT JOIN xv3.issue_type it      ON it.issue_code = il.issue_type
    LEFT JOIN xv3.issue_severity ise ON ise.id        = il.severity
    WHERE 1=1
  `;
  const params = [];

  if (device_id != null) { sql += ' AND il.device_id = ?';  params.push(device_id); }
  if (issue_type)        { sql += ' AND il.issue_type = ?'; params.push(issue_type); }
  if (severity != null)  { sql += ' AND il.severity = ?';   params.push(severity); }
  if (active_only)       { sql += ' AND il.end_date IS NULL'; }

  sql += ' ORDER BY il.create_date DESC LIMIT ?';
  params.push(Number(limit));

  return query(sql, params);
}

module.exports = { listEvents, getEventSummary, listPersistentIssues };
