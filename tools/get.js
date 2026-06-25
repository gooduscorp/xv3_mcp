'use strict';
const api = require('../api');

// Pageable 응답(content 배열) 또는 일반 배열 모두 처리
function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return data ? [data] : [];
}

// ──────────────────────────────────────────────
// 장비(Device) 조회
// ──────────────────────────────────────────────

async function listDevices({ site_id, status, vendor, device_type_id, group_id, disabled, name, site_name, limit = 100 } = {}) {
  // GET /xv3/api/device-all-list: siteId, keyword 지원
  // status/disabled 필드는 API 응답에 없어 JS-side 필터 불가 (향후 API 개선 필요)
  const params = {};
  if (site_id != null) params.siteId = site_id;
  if (name)            params.keyword = name;
  else if (site_name)  params.keyword = site_name;

  const data = await api.get('/xv3/api/device-all-list', params);
  let arr = Array.isArray(data) ? data : [];

  if (vendor)                 arr = arr.filter(d => d.vendor?.includes(vendor));
  if (device_type_id != null) arr = arr.filter(d => d.deviceTypeId === device_type_id);

  return arr.slice(0, Number(limit)).map(d => ({
    id:             d.id,
    site_id:        d.siteId,
    site_name:      d.siteName,
    name:           d.name,
    ip:             d.ip,
    vendor:         d.vendor,
    model:          d.model,
    device_type_id: d.deviceTypeId,
    device_type:    d.deviceTypeName,
  }));
}

async function getDevice({ id, ip } = {}) {
  if (!id && !ip) throw new Error('id 또는 ip 중 하나는 필수입니다.');

  if (id) {
    const d = await api.get(`/xv3/api/device/${id}`);
    return d ? normalizeDevice(d) : null;
  }

  // IP 검색: device-all-list keyword 활용 후 정확히 일치하는 항목 선택
  const list = await api.get('/xv3/api/device-all-list', { keyword: ip });
  const arr  = Array.isArray(list) ? list : [];
  const found = arr.find(d => d.ip === ip);
  if (!found) return null;
  const d = await api.get(`/xv3/api/device/${found.id}`);
  return d ? normalizeDevice(d) : null;
}

function normalizeDevice(d) {
  return {
    id:                   d.id,
    site_id:              d.siteId,
    site_name:            d.siteName,
    name:                 d.name,
    vendor:               d.vendor,
    model:                d.model,
    ip:                   d.ip,
    device_type_id:       d.deviceTypeId,
    device_type_name:     d.deviceTypeName,
    disabled:             d.disabled,
    sys_location:         d.sysLocation,
    ping_enabled:         d.pingEnabled,
    snmp_enabled:         d.snmpEnabled,
    config_enabled:       d.configEnabled,
    port_collect_enabled: d.portCollectEnabled,
    ping_template_id:     d.pingTemplateId,
    snmp_template_id:     d.snmpTemplateId,
    description:          d.description,
    telemetry_enable:     d.telemetryEnable,
    create_date:          d.createDate,
    modify_date:          d.modifyDate,
  };
}

async function getDeviceInterfaces({ device_id, admin_status, oper_status } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');

  const data = await api.get('/xv3/api/device-interface', { deviceId: device_id });
  let arr = Array.isArray(data) ? data : [];

  if (admin_status != null) arr = arr.filter(i => i.adminStatus === admin_status);
  if (oper_status != null)  arr = arr.filter(i => i.operStatus === oper_status);

  return arr.map(i => ({
    id:             i.id,
    device_id,
    interface_id:   i.interfaceId,
    name:           i.name,
    description:    i.description,
    alias:          i.alias,
    admin_status:   i.adminStatus,
    oper_status:    i.operStatus,
    speed:          i.speed,
    duplex:         i.duplex,
    stp_status:     i.stpStatus,
    last_used_date: i.lastUsedDate,
  }));
}

async function listDeviceInterfaceSummary(_args) {
  // xv3 API에 대응하는 복합 집계 엔드포인트 없음 → 신규 API 추가 필요
  throw new Error('list_device_interface_summary: 지원 API 없음. xv3 API에 추가 개발이 필요합니다.');
}

async function getDeviceIpAddresses({ device_id } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  const data = await api.get(`/xv3/api/interface-ip/${device_id}`, { parentId: device_id });
  return extractItems(data).map(ip => ({
    id:             ip.id,
    device_id:      ip.deviceId ?? device_id,
    interface_id:   ip.interfaceId,
    interface_ip:   ip.interfaceIp,
    network_ip:     ip.networkIp,
    network_mask:   ip.networkMask,
    interface_name: ip.interfaceName,
    create_date:    ip.createDate,
    modify_date:    ip.modifyDate,
  }));
}

async function getDeviceCamTable({ device_id, interface_id, mac, ip, limit = 200 } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');

  const params = { deviceId: device_id, size: limit };
  if (interface_id != null) params.interfaceId = interface_id;
  if (mac)                  params.mac = mac;
  if (ip)                   params.ip = ip;

  const data = await api.get('/xv3/api/interface-arp', params);
  return extractItems(data).map(r => ({
    device_id,
    interface_id:   r.interfaceId,
    interface_name: r.interfaceName,
    mac:            r.mac,
    ip:             r.ip,
    vlan:           r.vlan,
    create_date:    r.createDate,
    modify_date:    r.modifyDate,
  }));
}

// IP로 장비 또는 인터페이스 검색
async function searchByIp({ ip } = {}) {
  if (!ip) throw new Error('ip는 필수입니다.');

  const [deviceData, ifaceData] = await Promise.all([
    api.get('/xv3/api/device-all-list', { keyword: ip }).catch(() => []),
    api.get('/xv3/api/interface-arp', { ip, size: 20 }).catch(() => null),
  ]);

  const devices    = (Array.isArray(deviceData) ? deviceData : []).filter(d => d.ip?.includes(ip));
  const interfaces = extractItems(ifaceData);

  return { devices, interfaces };
}

// ──────────────────────────────────────────────
// 알람 / 이슈
// ──────────────────────────────────────────────

async function listAlarms({ device_ip, device_name, start_date, end_date, limit = 100 } = {}) {
  const params = { size: limit };
  if (start_date) params.createDate = start_date;

  const data = await api.get('/xv3/api/sms-log', params);
  let arr = extractItems(data);

  // API 미지원 필터: JS-side 처리
  if (device_ip)   arr = arr.filter(r => r.deviceIp?.includes(device_ip) || r.message?.includes(device_ip));
  if (device_name) arr = arr.filter(r => r.deviceName?.includes(device_name) || r.message?.includes(device_name));
  if (end_date)    arr = arr.filter(r => !r.createDate || r.createDate <= end_date);

  return arr.slice(0, Number(limit));
}

async function listIssues({ device_id, severity, issue_type, start_date, end_date, active_only, limit = 100 } = {}) {
  const params = { size: limit };
  if (device_id)  params.deviceIdList = device_id;
  if (severity)   params.severityList = severity;
  if (issue_type) params.issueTypeList = issue_type;
  if (start_date) params.startTime = start_date;
  if (end_date)   params.endTime = end_date;

  const data = await api.get('/xv3/api/issue-history', params);
  let arr = extractItems(data);

  if (active_only) arr = arr.filter(r => !r.endDate && !r.endTime);

  return arr.map(r => ({
    id:              r.id,
    device_id:       r.deviceId,
    device_name:     r.deviceName,
    device_ip:       r.deviceIp,
    issue_type:      r.issueType,
    issue_type_name: r.issueTypeName,
    severity:        r.severity,
    severity_name:   r.severityName,
    interface_name:  r.interfaceName,
    instance_name:   r.instanceName,
    message:         r.message,
    count:           r.count,
    create_date:     r.createDate,
    modify_date:     r.modifyDate,
    end_date:        r.endDate,
    is_display:      r.isDisplay,
  }));
}


async function getIssueSummary({ device_id, site_id } = {}) {
  // dashboard/issue-status-today: deviceIdList, siteId 필터 지원
  const params = {};
  if (device_id != null) params.deviceIdList = device_id;
  if (site_id != null)   params.siteId = site_id;

  const data = await api.get('/xv3/api/dashboard/issue-status-today', params);
  const arr = Array.isArray(data) ? data : (data ? [data] : []);
  const total = arr.reduce((s, r) => s + (Number(r.count) || 0), 0);
  return { total_active: total, by_severity: arr };
}

async function listIssueTypes() {
  return api.get('/xv3/api/issue-type-list');
}

async function listIssueSeverities() {
  return api.get('/xv3/api/issue-severity-list');
}

// ──────────────────────────────────────────────
// 사이트 / 그룹 / 사용자
// ──────────────────────────────────────────────

async function listSites() {
  return api.get('/xv3/api/sites', { disabled: false });
}

async function listDeviceGroups({ site_id, name } = {}) {
  // /xv3/api/device-group/{siteId} 형태만 지원 → site_id 없으면 전체 사이트 순회
  let groups = [];
  if (site_id != null) {
    groups = extractItems(await api.get(`/xv3/api/device-group/${site_id}`));
  } else {
    const sites = await api.get('/xv3/api/sites');
    const siteArr = extractItems(sites);
    const results = await Promise.all(
      siteArr.map(s => api.get(`/xv3/api/device-group/${s.id}`).then(d => extractItems(d)).catch(() => []))
    );
    groups = results.flat();
  }
  if (name) groups = groups.filter(g => g.name?.includes(name));

  return groups.map(g => ({
    id:           g.id,
    site_id:      g.siteId,
    site_name:    g.siteName,
    name:         g.name,
    description:  g.description,
    disabled:     g.disabled,
    device_count: g.deviceCount,
  }));
}

async function getDeviceGroupMembers({ group_id } = {}) {
  if (!group_id) throw new Error('group_id는 필수입니다.');
  const data = await api.get(`/xv3/api/device-group-mapping/${group_id}`);
  return extractItems(data).map(m => ({
    id:          m.id,
    group_id:    m.groupId ?? group_id,
    device_id:   m.deviceId,
    device_name: m.deviceName,
    device_ip:   m.deviceIp,
    vendor:      m.vendor,
    model:       m.model,
    disabled:    m.disabled,
  }));
}

async function listUsers({ site_id, role_type, group_id, limit = 100 } = {}) {
  // /xv3/api/users/{siteId} 형태만 지원 → site_id 없으면 전체 사이트 순회
  let arr = [];
  if (site_id != null) {
    arr = extractItems(await api.get(`/xv3/api/users/${site_id}`));
  } else {
    const sites = await api.get('/xv3/api/sites');
    const siteArr = extractItems(sites);
    const results = await Promise.all(
      siteArr.map(s => api.get(`/xv3/api/users/${s.id}`).then(d => extractItems(d)).catch(() => []))
    );
    arr = results.flat();
  }
  if (role_type)  arr = arr.filter(u => u.roleType === role_type);
  if (group_id)   arr = arr.filter(u => u.groupId === group_id);

  return arr.map(u => ({
    id:            u.id,
    site_id:       u.siteId,
    site_name:     u.siteName,
    user_id:       u.userId,
    name:          u.name,
    role_type:     u.roleType,
    is_master:     u.isMaster,
    group_name:    u.groupName,
    dept_name:     u.deptName,
    position_name: u.positionName,
    phone:         u.phone,
    mobile:        u.mobile,
    email:         u.email,
    notification:  u.notification,
    create_date:   u.createDate,
    modify_date:   u.modifyDate,
  }));
}

// ──────────────────────────────────────────────
// 토폴로지
// ──────────────────────────────────────────────

async function listTopologyMaps({ site_id } = {}) {
  const params = {};
  if (site_id != null) params.siteId = site_id;
  try {
    const data = await api.get('/xv3/api/topology', params);
    return Array.isArray(data) ? data : (data ? [data] : []);
  } catch (e) {
    // 토폴로지 미설정 시 서버 NPE 발생 가능 → 빈 배열 반환
    if (e.message?.includes('500') || e.message?.includes('NullPointerException')) return [];
    throw e;
  }
}

async function getTopologyNodes({ map_id } = {}) {
  if (!map_id) throw new Error('map_id는 필수입니다.');
  // topology/xy는 siteId 기반 → 먼저 map→siteId 조회
  const allMaps = await api.get('/xv3/api/topology');
  const maps = Array.isArray(allMaps) ? allMaps : [];
  const target = maps.find(m => m.id === map_id);
  if (!target) throw new Error(`map_id ${map_id}를 찾을 수 없습니다.`);

  const data = await api.get('/xv3/api/topology/xy', { siteId: target.siteId });
  const nodes = data?.topologyData?.nodes ?? [];
  return nodes.map(n => ({
    id:          n.node_id ?? n.id,
    map_id:      n.map_id ?? map_id,
    device_id:   n.id,
    device_name: n.name,
    device_ip:   n.ip,
    icon_type:   n.icon_type,
    x:           n.x,
    y:           n.y,
    description: n.description,
    site_id:     n.site_id,
  }));
}

async function getTopologyLinks({ map_id, site_id } = {}) {
  let targetSiteId = site_id;

  if (targetSiteId == null && map_id != null) {
    const allMaps = await api.get('/xv3/api/topology');
    const maps = Array.isArray(allMaps) ? allMaps : [];
    const target = maps.find(m => m.id === map_id);
    if (!target) throw new Error(`map_id ${map_id}를 찾을 수 없습니다.`);
    targetSiteId = target.siteId;
  }

  const params = {};
  if (targetSiteId != null) params.siteId = targetSiteId;
  const data = await api.get('/xv3/api/topology/xy', params);
  const links = data?.topologyData?.links ?? [];
  return links.map(l => ({
    id:        l.id,
    site_id:   l.site_id,
    source:    l.source,
    target:    l.target,
    thickness: l.thickness,
    color:     l.color,
  }));
}

// ──────────────────────────────────────────────
// 수집기 / 설정 / 기타
// ──────────────────────────────────────────────

async function listCollectors() {
  return api.get('/xv3/api/collector-all');
}

async function getDeviceConfig({ device_id } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  return api.get(`/xv3/api/config-data/${device_id}`);
}

async function getConfigHistory({ device_id, limit = 20 } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  const data = await api.get('/xv3/api/config-backup-history', { deviceId: device_id, size: limit });
  return extractItems(data);
}

async function listDeviceTypes() {
  return api.get('/xv3/api/device-type');
}

async function getDeviceStatusSummary({ site_id } = {}) {
  const params = {};
  if (site_id != null) params.siteIdList = site_id;
  const data = await api.get('/xv3/api/dashboard/status-panel', params);
  return (Array.isArray(data) ? data : []).map(s => ({
    site_id:         s.siteId,
    site_name:       s.name,
    total:           s.devCnt,
    up:              s.ohtCnt,
    critical_issues: s.criCnt,
    pending_issues:  s.penbCnt,
    disabled:        s.pdisCnt,
  }));
}

async function listSnmpTemplates({ site_id } = {}) {
  const data = await api.get('/xv3/api/snmp-template', { size: 1000 });
  let arr = extractItems(data);
  if (site_id != null) arr = arr.filter(t => t.siteId === site_id);
  return arr.map(t => ({
    id:             t.id,
    site_id:        t.siteId,
    name:           t.name,
    snmp_version:   t.snmpVersion,
    security_level: t.securityLevel,
    user_name:      t.userName,
    auth_protocol:  t.authProtocol,
    timeout:        t.timeout,
    description:    t.description,
  }));
}

async function getSystemSettings({ site_id } = {}) {
  if (site_id == null) throw new Error('site_id는 필수입니다.');
  return api.get(`/xv3/api/system-setting/${site_id}`);
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
