'use strict';
const { query } = require('../db');
const { resolveIssueTables } = require('./issueHelper');

// ──────────────────────────────────────────────
// 공통 SELECT 필드 / JOIN 절
// ──────────────────────────────────────────────
const EVENT_SELECT = `
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
`;

const EVENT_JOINS = `
  LEFT JOIN xv3.device_info d      ON d.id          = il.device_id
  LEFT JOIN xv3.issue_type it      ON it.issue_code  = il.issue_type
  LEFT JOIN xv3.issue_severity ise ON ise.id         = il.severity
`;

/**
 * 단일 테이블에 대한 WHERE 절과 파라미터를 빌드합니다.
 * persistBefore: persist 테이블 사용 시 이 날짜 이전 레코드만 포함 (월별 테이블과 중복 방지)
 */
function buildEventWhere({ device_id, site_id, issue_type, severity, syslog_keyword, start_date, end_date, active_only, persistBefore } = {}) {
  const conds = ['1=1'];
  const params = [];

  if (device_id != null)  { conds.push('il.device_id = ?');          params.push(device_id); }
  if (site_id != null)    { conds.push('d.site_id = ?');              params.push(site_id); }
  if (issue_type)         { conds.push('il.issue_type = ?');          params.push(issue_type); }
  if (severity != null)   { conds.push('il.severity = ?');            params.push(severity); }
  if (syslog_keyword)     { conds.push('il.syslog_keyword LIKE ?');   params.push(`%${syslog_keyword}%`); }
  if (start_date)         { conds.push('il.create_date >= ?');        params.push(start_date); }
  if (end_date)           { conds.push('il.create_date <= ?');        params.push(end_date); }
  if (active_only)        { conds.push('il.end_date IS NULL'); }
  if (persistBefore)      { conds.push('il.create_date < ?');         params.push(persistBefore); }

  return { where: conds.join(' AND '), params };
}

// ──────────────────────────────────────────────
// 이벤트 로그 조회
// - active_only=true        → issue_log_persist (현재 진행 중인 이슈)
// - 날짜 범위 있음           → 해당 월별 테이블 UNION
// - 날짜 범위 없음 (기본)    → 이번 달 테이블 + persist (장기 이슈 포함)
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
  const { monthly, usePersist, persistBefore } = await resolveIssueTables({ start_date, end_date, active_only });

  // 조회 대상 테이블 목록 구성
  const targets = [
    ...monthly.map(t => ({ table: t, persistBefore: null })),
    ...(usePersist ? [{ table: 'issue_log_persist', persistBefore }] : []),
  ];

  if (targets.length === 0) return [];

  const filters = { device_id, site_id, issue_type, severity, syslog_keyword, start_date, end_date, active_only };
  const lim = Number(limit);

  // 단일 테이블: 직접 조회
  if (targets.length === 1) {
    const { table, persistBefore: pb } = targets[0];
    const { where, params } = buildEventWhere({ ...filters, persistBefore: pb });
    return query(
      `SELECT ${EVENT_SELECT} FROM xv3_issue.${table} il ${EVENT_JOINS} WHERE ${where} ORDER BY il.create_date DESC LIMIT ?`,
      [...params, lim]
    );
  }

  // 복수 테이블: 각 테이블에서 상위 N건씩 가져온 뒤 UNION ALL로 합산 후 재정렬
  const allParams = [];
  const subqueries = targets.map(({ table, persistBefore: pb }) => {
    const { where, params } = buildEventWhere({ ...filters, persistBefore: pb });
    allParams.push(...params, lim);
    return `(SELECT ${EVENT_SELECT} FROM xv3_issue.${table} il ${EVENT_JOINS} WHERE ${where} ORDER BY il.create_date DESC LIMIT ?)`;
  });
  allParams.push(lim);

  return query(
    `SELECT * FROM (${subqueries.join(' UNION ALL ')}) _combined ORDER BY create_date DESC LIMIT ?`,
    allParams
  );
}

// ──────────────────────────────────────────────
// 이벤트 집계 요약 (타입별 + 심각도별)
// 여러 테이블에 걸친 경우 병렬 쿼리 후 JS에서 합산
// ──────────────────────────────────────────────
async function getEventSummary({ device_id, site_id, start_date, end_date } = {}) {
  const { monthly, usePersist, persistBefore } = await resolveIssueTables({ start_date, end_date });

  const targets = [
    ...monthly.map(t => ({ table: t, persistBefore: null })),
    ...(usePersist ? [{ table: 'issue_log_persist', persistBefore }] : []),
  ];

  if (targets.length === 0) return { total: 0, by_type: [], by_severity: [] };

  const deviceJoin = site_id != null ? 'LEFT JOIN xv3.device_info d ON d.id = il.device_id' : '';

  const buildAggWhere = (persistBefore) => {
    const conds = ['1=1'];
    const params = [];
    if (device_id != null) { conds.push('il.device_id = ?');    params.push(device_id); }
    if (site_id != null)   { conds.push('d.site_id = ?');       params.push(site_id); }
    if (start_date)        { conds.push('il.create_date >= ?'); params.push(start_date); }
    if (end_date)          { conds.push('il.create_date <= ?'); params.push(end_date); }
    if (persistBefore)     { conds.push('il.create_date < ?');  params.push(persistBefore); }
    return { where: conds.join(' AND '), params };
  };

  // 모든 테이블에 대해 타입별·심각도별 집계를 병렬 실행
  const tableResults = await Promise.all(
    targets.map(({ table, persistBefore: pb }) => {
      const { where, params } = buildAggWhere(pb);
      return Promise.all([
        query(
          `SELECT il.issue_type, it.issue_name, COUNT(*) AS count
           FROM xv3_issue.${table} il
           LEFT JOIN xv3.issue_type it ON it.issue_code = il.issue_type
           ${deviceJoin}
           WHERE ${where}
           GROUP BY il.issue_type, it.issue_name`,
          params
        ),
        query(
          `SELECT il.severity, ise.severity AS severity_name, COUNT(*) AS count
           FROM xv3_issue.${table} il
           LEFT JOIN xv3.issue_severity ise ON ise.id = il.severity
           ${deviceJoin}
           WHERE ${where}
           GROUP BY il.severity, ise.severity`,
          params
        ),
      ]);
    })
  );

  // JS에서 테이블별 집계 결과 합산
  const byTypeMap    = new Map();
  const bySeverityMap = new Map();

  for (const [typeRows, severityRows] of tableResults) {
    for (const row of typeRows) {
      const key = row.issue_type;
      const cur = byTypeMap.get(key) || { issue_type: row.issue_type, issue_name: row.issue_name, count: 0 };
      cur.count += Number(row.count);
      byTypeMap.set(key, cur);
    }
    for (const row of severityRows) {
      const key = row.severity;
      const cur = bySeverityMap.get(key) || { severity: row.severity, severity_name: row.severity_name, count: 0 };
      cur.count += Number(row.count);
      bySeverityMap.set(key, cur);
    }
  }

  const byType     = [...byTypeMap.values()].sort((a, b) => b.count - a.count);
  const bySeverity = [...bySeverityMap.values()].sort((a, b) => a.severity - b.severity);
  const total      = byType.reduce((s, r) => s + r.count, 0);

  return { total, by_type: byType, by_severity: bySeverity };
}

// ──────────────────────────────────────────────
// 지속 이슈 조회 (xv3_issue.issue_log_persist)
// 현재 진행 중이거나 장기화된 이슈 목록
// ──────────────────────────────────────────────
async function listPersistentIssues({
  device_id,
  site_id,
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
  if (site_id != null)   { sql += ' AND d.site_id = ?';     params.push(site_id); }
  if (issue_type)        { sql += ' AND il.issue_type = ?'; params.push(issue_type); }
  if (severity != null)  { sql += ' AND il.severity = ?';   params.push(severity); }
  if (active_only)       { sql += ' AND il.end_date IS NULL'; }

  sql += ' ORDER BY il.create_date DESC LIMIT ?';
  params.push(Number(limit));

  return query(sql, params);
}

module.exports = { listEvents, getEventSummary, listPersistentIssues };
