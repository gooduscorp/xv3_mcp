'use strict';
const { query } = require('../db');

// ────────────────────────────────────────────────
// 집계 단위별 테이블 매핑
// ────────────────────────────────────────────────
const PERF_TABLE = {
  '10min':   'xv3_perf.perf_data_10minute',
  'hourly':  'xv3_perf.perf_data_hourly',
  'daily':   'xv3_perf.perf_data_daily',
  'monthly': 'xv3_perf.perf_data_monthly',
};

function perfTable(granularity) {
  return PERF_TABLE[granularity] ?? PERF_TABLE['hourly'];
}

// ──────────────────────────────────────────────
// 수집 항목 목록 (collect_item_id 조회용)
// ──────────────────────────────────────────────
async function listCollectItems() {
  return query(`
    SELECT ci.id, ci.name, ci.name_eng, cig.name AS group_name, cig.unit, cig.group_code, ci.collect_type
    FROM xv3.collect_item ci
    JOIN xv3.collect_item_group cig ON cig.id = ci.group_id
    WHERE cig.disabled = 0
    ORDER BY ci.sort_seq
  `);
}

// ──────────────────────────────────────────────
// 장비 레벨 성능 조회 (CPU, Memory, 온도, 응답속도 등)
// interface_id = 0 인 항목 (장비 전체 단위 수집)
// ──────────────────────────────────────────────
async function getPerfDevice({
  device_id,
  collect_item_id,
  granularity = 'hourly',
  from,
  to,
  limit = 48,
}) {
  const tbl = perfTable(granularity);
  let sql = `
    SELECT
      p.insert_date,
      p.device_id,
      d.name  AS device_name,
      d.ip    AS device_ip,
      p.collect_item_id,
      ci.name AS item_name,
      cig.unit,
      p.instance_id,
      ROUND(p.avg_value, 2) AS avg_value,
      ROUND(p.max_value, 2) AS max_value,
      ROUND(p.min_value, 2) AS min_value,
      p.count
    FROM ${tbl} p
    JOIN xv3.device_info d     ON d.id  = p.device_id
    JOIN xv3.collect_item ci   ON ci.id = p.collect_item_id
    JOIN xv3.collect_item_group cig ON cig.id = ci.group_id
    WHERE p.device_id    = ?
      AND p.interface_id = 0
  `;
  const params = [device_id];

  if (collect_item_id != null) { sql += ' AND p.collect_item_id = ?'; params.push(collect_item_id); }
  if (from) { sql += ' AND p.insert_date >= ?'; params.push(from); }
  if (to)   { sql += ' AND p.insert_date <= ?'; params.push(to); }

  sql += ' ORDER BY p.insert_date DESC, p.collect_item_id, p.instance_id LIMIT ?';
  params.push(limit);

  return query(sql, params);
}

// ──────────────────────────────────────────────
// 인터페이스 레벨 성능 조회 (bps, Util, PPS 등)
// interface_id > 0 인 항목 (포트 단위 수집)
// ──────────────────────────────────────────────
async function getPerfInterface({
  device_id,
  interface_id,
  collect_item_id,
  if_name,
  granularity = 'hourly',
  from,
  to,
  limit = 48,
}) {
  const tbl = perfTable(granularity);
  let sql = `
    SELECT
      p.insert_date,
      p.device_id,
      d.name    AS device_name,
      d.ip      AS device_ip,
      p.interface_id,
      ci_if.name  AS if_name,
      ci_if.alias AS if_alias,
      p.collect_item_id,
      ci.name   AS item_name,
      cig.unit,
      ROUND(p.avg_value, 2) AS avg_value,
      ROUND(p.max_value, 2) AS max_value,
      ROUND(p.min_value, 2) AS min_value,
      p.count
    FROM ${tbl} p
    JOIN xv3.device_info d     ON d.id  = p.device_id
    JOIN xv3.collect_item ci   ON ci.id = p.collect_item_id
    JOIN xv3.collect_item_group cig ON cig.id = ci.group_id
    LEFT JOIN xv3.collect_interface ci_if
      ON ci_if.device_id   = p.device_id
     AND ci_if.interface_id = p.interface_id
    WHERE p.device_id    = ?
      AND p.interface_id != 0
  `;
  const params = [device_id];

  if (interface_id != null) { sql += ' AND p.interface_id = ?'; params.push(interface_id); }
  if (collect_item_id != null) { sql += ' AND p.collect_item_id = ?'; params.push(collect_item_id); }
  if (if_name) { sql += ' AND ci_if.name LIKE ?'; params.push(`%${if_name}%`); }
  if (from) { sql += ' AND p.insert_date >= ?'; params.push(from); }
  if (to)   { sql += ' AND p.insert_date <= ?'; params.push(to); }

  sql += ' ORDER BY p.insert_date DESC, p.interface_id LIMIT ?';
  params.push(limit);

  return query(sql, params);
}

// ──────────────────────────────────────────────
// Top-N 성능 조회
//  - device_id 없음 → 전체(또는 사이트) 장비 Top N (장비 레벨 항목)
//  - device_id 있음 → 해당 장비의 인터페이스 Top N
// ──────────────────────────────────────────────
async function getPerfTopN({
  collect_item_id,
  granularity = 'hourly',
  from,
  to,
  n = 10,
  value_type = 'avg',   // 'avg' | 'max'
  site_id,
  device_id,
}) {
  // collect_item_id 미지정 시 CPU(1) 기본값 사용
  const itemId = collect_item_id ?? 1;

  const tbl = perfTable(granularity);
  const valueExpr = value_type === 'max' ? 'MAX(p.max_value)' : 'AVG(p.avg_value)';

  // ── 특정 장비: 장비레벨(CPU/Memory 등) vs 인터페이스레벨 자동 판별 ──
  if (device_id != null) {
    const itemRows = await query(
      'SELECT collect_type FROM xv3.collect_item WHERE id = ?', [itemId]
    );
    const isInterface = itemRows[0]?.collect_type === 'INTERFACE';

    if (!isInterface) {
      // 장비 레벨 항목 (CPU, Memory, 온도 등) → instance_id Top N
      let sql = `
        SELECT
          p.device_id,
          d.name    AS device_name,
          d.ip      AS device_ip,
          p.collect_item_id,
          ci.name   AS item_name,
          cig.unit,
          p.instance_id,
          ROUND(${valueExpr}, 2) AS value
        FROM ${tbl} p
        JOIN xv3.device_info d     ON d.id  = p.device_id
        JOIN xv3.collect_item ci   ON ci.id = p.collect_item_id
        JOIN xv3.collect_item_group cig ON cig.id = ci.group_id
        WHERE p.device_id      = ?
          AND p.collect_item_id = ?
          AND p.interface_id   = 0
      `;
      const params = [device_id, itemId];

      if (from) { sql += ' AND p.insert_date >= ?'; params.push(from); }
      if (to)   { sql += ' AND p.insert_date <= ?'; params.push(to); }

      sql += ` GROUP BY p.device_id, p.instance_id ORDER BY value DESC LIMIT ?`;
      params.push(Number(n));
      return query(sql, params);
    }

    // 인터페이스 레벨 항목 (bps, Util, PPS 등) → 포트 Top N
    let sql = `
      SELECT
        p.device_id,
        d.name    AS device_name,
        d.ip      AS device_ip,
        p.interface_id,
        ci_if.name  AS if_name,
        ci_if.alias AS if_alias,
        p.collect_item_id,
        ci.name   AS item_name,
        cig.unit,
        ROUND(${valueExpr}, 2) AS value
      FROM ${tbl} p
      JOIN xv3.device_info d     ON d.id  = p.device_id
      JOIN xv3.collect_item ci   ON ci.id = p.collect_item_id
      JOIN xv3.collect_item_group cig ON cig.id = ci.group_id
      LEFT JOIN xv3.collect_interface ci_if
        ON ci_if.device_id   = p.device_id
       AND ci_if.interface_id = p.interface_id
      WHERE p.device_id      = ?
        AND p.collect_item_id = ?
        AND p.interface_id   != 0
    `;
    const params = [device_id, itemId];

    if (from) { sql += ' AND p.insert_date >= ?'; params.push(from); }
    if (to)   { sql += ' AND p.insert_date <= ?'; params.push(to); }

    sql += ` GROUP BY p.device_id, p.interface_id ORDER BY value DESC LIMIT ?`;
    params.push(Number(n));
    return query(sql, params);
  }

  // ── 전체 / 사이트별 장비 Top N (장비 레벨 항목) ──
  let sql = `
    SELECT
      p.device_id,
      d.name  AS device_name,
      d.ip    AS device_ip,
      s.name  AS site_name,
      p.collect_item_id,
      ci.name AS item_name,
      cig.unit,
      ROUND(${valueExpr}, 2) AS value
    FROM ${tbl} p
    JOIN xv3.device_info d     ON d.id  = p.device_id
    JOIN xv3.site_info s       ON s.id  = d.site_id
    JOIN xv3.collect_item ci   ON ci.id = p.collect_item_id
    JOIN xv3.collect_item_group cig ON cig.id = ci.group_id
    WHERE p.collect_item_id = ?
      AND p.interface_id   = 0
  `;
  const params = [itemId];

  if (site_id != null) { sql += ' AND d.site_id = ?'; params.push(site_id); }
  if (from) { sql += ' AND p.insert_date >= ?'; params.push(from); }
  if (to)   { sql += ' AND p.insert_date <= ?'; params.push(to); }

  sql += ` GROUP BY p.device_id ORDER BY value DESC LIMIT ?`;
  params.push(Number(n));
  return query(sql, params);
}

module.exports = { listCollectItems, getPerfDevice, getPerfInterface, getPerfTopN };
