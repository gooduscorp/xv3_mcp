'use strict';
const api = require('../api');

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return data ? [data] : [];
}

// ──────────────────────────────────────────────
// 이벤트 로그 조회 (issue-history)
// ──────────────────────────────────────────────
async function listEvents({ device_id, site_id, issue_type, severity, syslog_keyword, start_date, end_date, active_only, limit = 100 } = {}) {
  const params = { size: limit };
  if (device_id)  params.deviceIdList  = device_id;
  if (site_id)    params.siteId        = site_id;
  if (issue_type) params.issueTypeList = issue_type;
  if (severity)   params.severityList  = severity;
  if (start_date) params.startTime     = start_date;
  if (end_date)   params.endTime       = end_date;

  const data = await api.get('/xv3/api/issue-history', params);
  let arr = extractItems(data);

  if (active_only)    arr = arr.filter(r => !r.endDate && !r.endTime);
  if (syslog_keyword) arr = arr.filter(r => (r.syslogKeyword ?? r.message ?? '').includes(syslog_keyword));

  return arr.slice(0, limit).map(r => ({
    id:              r.id,
    device_id:       r.deviceId,
    device_name:     r.deviceName,
    device_ip:       r.deviceIp,
    issue_type:      r.issueType,
    issue_name:      r.issueTypeName ?? r.issueName,
    collect_item_id: r.collectItemId,
    interface_id:    r.interfaceId,
    interface_name:  r.interfaceName,
    instance_id:     r.instanceId,
    instance_name:   r.instanceName,
    severity:        r.severity,
    severity_name:   r.severityName,
    syslog_keyword:  r.syslogKeyword,
    message:         r.message,
    count:           r.count,
    is_display:      r.isDisplay,
    create_date:     r.createDate,
    modify_date:     r.modifyDate,
    end_date:        r.endDate,
  }));
}

// ──────────────────────────────────────────────
// 이벤트 집계 요약 — API 미지원
// ──────────────────────────────────────────────
async function getEventSummary() {
  throw new Error('get_event_summary: xv3 API에 이벤트 집계 엔드포인트가 없습니다.');
}

// ──────────────────────────────────────────────
// 지속 이슈 조회 (inventory-issue-list)
// ──────────────────────────────────────────────
async function listPersistentIssues({ device_id, site_id, issue_type, severity, active_only = true, limit = 100 } = {}) {
  const params = { size: limit };
  if (device_id)  params.deviceId  = device_id;
  if (issue_type) params.issueType = issue_type;

  const data = await api.get('/xv3/api/inventory-issue-list', params);
  let arr = extractItems(data);

  if (site_id != null) arr = arr.filter(r => r.siteId === site_id);
  if (severity != null) arr = arr.filter(r => r.severity === severity);
  if (active_only) arr = arr.filter(r => !r.endDate && !r.endTime);

  return arr.slice(0, limit).map(r => ({
    id:              r.id,
    device_id:       r.deviceId,
    device_name:     r.deviceName,
    device_ip:       r.deviceIp,
    issue_type:      r.issueType,
    issue_name:      r.issueName,
    collect_item_id: r.collectItemId,
    interface_id:    r.interfaceId,
    interface_name:  r.interfaceName,
    instance_id:     r.instanceId,
    instance_name:   r.instanceName,
    severity:        r.severity,
    severity_name:   r.severityName,
    syslog_keyword:  r.syslogKeyword,
    message:         r.message,
    count:           r.count,
    create_date:     r.createDate,
    modify_date:     r.modifyDate,
    end_date:        r.endDate,
  }));
}

module.exports = { listEvents, getEventSummary, listPersistentIssues };