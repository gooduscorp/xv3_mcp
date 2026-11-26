'use strict';
const api = require('../api');

// granularity → xv3 API endpoint/param 매핑
function granularityToEndpoint(granularity) {
  switch (granularity) {
    case '10min':   return { type: 'raw',     collectType: 'T' };
    case 'hourly':  return { type: 'raw',     collectType: 'H' };
    case 'daily':   return { type: 'daily',   collectType: 'D' };
    case 'monthly': return { type: 'monthly', collectType: 'M' };
    default:        return { type: 'raw',     collectType: 'H' };
  }
}

// ──────────────────────────────────────────────
// 수집 항목 목록
// ──────────────────────────────────────────────
async function listCollectItems() {
  return api.get('/xv3/api/collect-item');
}

// ──────────────────────────────────────────────
// 장비 레벨 성능 조회 (CPU, Memory, 온도 등)
// ──────────────────────────────────────────────
async function getPerfDevice({ device_id, collect_item_id, granularity = 'hourly', from, to, limit = 48 } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  const { type, collectType } = granularityToEndpoint(granularity);

  if (type === 'raw') {
    const body = { device_id, collect_type: collectType };
    if (collect_item_id != null) body.collect_item_id = collect_item_id;
    if (from) body.start_time = from;
    if (to)   body.end_time   = to;
    const data = await api.post('/xv3/api/perf-raw', body);
    return Array.isArray(data) ? data.slice(0, limit) : (data ?? []);
  }

  const endpoint = type === 'daily' ? '/xv3/api/perf-daily' : '/xv3/api/perf-monthly';
  const params = { deviceId: device_id, collectType };
  if (collect_item_id != null) params.collectItemGroupId = collect_item_id;
  if (from) params.startDate = from;
  if (to)   params.endDate   = to;

  const data = await api.get(endpoint, params);
  return Array.isArray(data) ? data.slice(0, limit) : (data ?? []);
}

// ──────────────────────────────────────────────
// 인터페이스 레벨 성능 조회 (bps, Util, PPS 등)
// ──────────────────────────────────────────────
async function getPerfInterface({ device_id, interface_id, collect_item_id, if_name, granularity = 'hourly', from, to, limit = 48 } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  const { type, collectType } = granularityToEndpoint(granularity);

  if (type === 'raw') {
    const body = { device_id, collect_type: collectType };
    if (interface_id != null)    body.interface_id    = interface_id;
    if (collect_item_id != null) body.collect_item_id = collect_item_id;
    if (from) body.start_time = from;
    if (to)   body.end_time   = to;
    const data = await api.post('/xv3/api/perf-raw', body);
    let arr = Array.isArray(data) ? data : (data ?? []);
    if (if_name) arr = arr.filter(r => (r.ifName ?? r.if_name ?? '').includes(if_name));
    return arr.slice(0, limit);
  }

  const endpoint = type === 'daily' ? '/xv3/api/perf-daily' : '/xv3/api/perf-monthly';
  const params = { deviceId: device_id, collectType };
  if (interface_id != null)    params.interfaceId        = interface_id;
  if (collect_item_id != null) params.collectItemGroupId = collect_item_id;
  if (from) params.startDate = from;
  if (to)   params.endDate   = to;

  const data = await api.get(endpoint, params);
  let arr = Array.isArray(data) ? data : (data ?? []);
  if (if_name) arr = arr.filter(r => (r.ifName ?? r.if_name ?? '').includes(if_name));
  return arr.slice(0, limit);
}

// ──────────────────────────────────────────────
// Top-N 성능 조회 — API 미지원
// ──────────────────────────────────────────────
async function getPerfTopN() {
  throw new Error('get_perf_topn: xv3 API에 TopN 성능 조회 엔드포인트가 없습니다.');
}

module.exports = {
  listCollectItems,
  getPerfDevice,
  getPerfInterface,
  getPerfTopN,
};