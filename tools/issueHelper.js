'use strict';
const { query } = require('../db');

// ──────────────────────────────────────────────
// 월별 파티션 테이블 목록 캐시 (5분 TTL)
// ──────────────────────────────────────────────
let _tableCache = { tables: [], expiresAt: 0 };

/**
 * xv3_issue DB의 월별 파티션 테이블 목록을 반환합니다.
 * 테이블명 패턴: issue_log_MM (예: issue_log_01 ~ issue_log_12)
 * 5분간 캐시하여 INFORMATION_SCHEMA 반복 조회를 방지합니다.
 * @returns {Promise<string[]>} 예: ['issue_log_01', 'issue_log_02', ..., 'issue_log_12']
 */
async function getMonthlyTables() {
  const now = Date.now();
  if (now < _tableCache.expiresAt) return _tableCache.tables;

  const rows = await query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'xv3_issue'
      AND TABLE_NAME REGEXP '^issue_log_[0-9]{2}$'
    ORDER BY TABLE_NAME
  `);

  _tableCache = {
    tables: rows.map(r => r.TABLE_NAME),
    expiresAt: now + 5 * 60 * 1000,
  };
  return _tableCache.tables;
}

/**
 * 월 번호(1~12)를 issue_log_MM 테이블명으로 변환합니다.
 * @param {number} month 1-based 월
 * @returns {string} 예: 1 → 'issue_log_01', 12 → 'issue_log_12'
 */
function monthToTable(month) {
  return `issue_log_${String(month).padStart(2, '0')}`;
}

/**
 * 조회 조건에 맞는 테이블 목록을 결정합니다.
 *
 * 반환값:
 *   monthly       - 조회할 월별 테이블명 배열 (xv3_issue 내 테이블)
 *   usePersist    - issue_log_persist 포함 여부
 *   persistBefore - persist 포함 시, 이 날짜 이전 레코드만 포함 (중복 방지용)
 *                   null이면 날짜 필터 없이 전체 포함
 *
 * 동작 규칙:
 *   active_only=true  → persist 만 (현재 진행 중인 이슈의 단일 출처)
 *   날짜 범위 있음    → 해당 월들의 issue_log_MM (월별 테이블에 활성/종료 이슈 모두 포함)
 *   날짜 범위 없음    → 이번 달 테이블 + persist (단, persist는 이번 달 이전 레코드만 = 중복 방지)
 */
async function resolveIssueTables({ start_date, end_date, active_only } = {}) {
  if (active_only) {
    return { monthly: [], usePersist: true, persistBefore: null };
  }

  const available = await getMonthlyTables();
  const now = new Date();
  const thisMonth = now.getMonth() + 1; // 1-based

  // 이번 달 첫날 문자열 (persist 중복 제거 기준)
  const thisMonthStr = `${now.getFullYear()}-${String(thisMonth).padStart(2, '0')}-01`;
  const thisMonthKey = monthToTable(thisMonth);

  // 날짜 범위가 없으면 이번 달 + persist (장기 이슈 포함)
  if (!start_date && !end_date) {
    const monthly = available.includes(thisMonthKey) ? [thisMonthKey] : [];
    return { monthly, usePersist: true, persistBefore: thisMonthStr };
  }

  // 날짜 범위가 있으면 해당 월들의 테이블만
  // 월별 테이블은 연도 정보 없이 MM만이므로, 범위에 포함된 모든 월 번호를 수집
  const startDt = new Date(start_date);
  const endDt   = new Date(end_date || now);

  const neededMonths = new Set();
  let cursor = new Date(startDt.getFullYear(), startDt.getMonth(), 1);
  while (cursor <= endDt) {
    neededMonths.add(cursor.getMonth() + 1); // 1-based
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const monthly = available.filter(t => {
    const m = parseInt(t.replace('issue_log_', ''), 10);
    return neededMonths.has(m);
  });

  return { monthly, usePersist: false, persistBefore: null };
}

module.exports = { getMonthlyTables, monthToTable, resolveIssueTables };
