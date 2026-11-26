'use strict';
const api = require('../api');

// GET /device/{id} 결과를 PUT /device body(DeviceInfoRequestDto)로 변환
function deviceToDto(d) {
  return {
    id:                    d.id,
    siteId:                d.siteId,
    name:                  d.name,
    nameFix:               d.nameFix ?? false,
    vendor:                d.vendor,
    vendorFix:             d.vendorFix ?? false,
    model:                 d.model,
    modelFix:              d.modelFix ?? false,
    ip:                    d.ip,
    deviceTypeId:          d.deviceTypeId,
    deviceDepthId:         d.deviceDepthId,
    pingEnabled:           d.pingEnabled,
    snmpEnabled:           d.snmpEnabled,
    configEnabled:         d.configEnabled,
    portCollectEnabled:    d.portCollectEnabled,
    pingTemplateId:        d.pingTemplateId,
    snmpTemplateId:        d.snmpTemplateId,
    configTemplateId:      d.configTemplateId,
    baseCollectTemplateId: d.baseCollectTemplateId,
    telemetryTemplateId:   d.telemetryTemplateId,
    telemetryEnable:       d.telemetryEnable,
    collectorId:           d.collectorId,
    port:                  d.port ?? 0,
    protocol:              d.protocol ?? '',
    configId:              d.configId ?? '',
    configVtPassword:      d.configVtPassword ?? '',
    configEnPassword:      d.configEnPassword ?? '',
    notUseTelnetId:        d.notUseTelnetId ?? false,
    sysLocation:           d.sysLocation ?? '',
    sysLocationFix:        d.sysLocationFix ?? false,
    description:           d.description ?? '',
    disabled:              d.disabled ?? false,
    deleted:               d.deleted ?? false,
    sirenId:               d.sirenId ?? '',
    sirenType:             d.sirenType ?? 0,
  };
}

async function fetchDevice(device_id) {
  const d = await api.get(`/xv3/api/device/${device_id}`);
  if (!d) throw new Error(`device_id ${device_id}를 찾을 수 없습니다.`);
  return d;
}

// GET → modify fields → PUT helper
async function updateDeviceField(device_id, modifyFn) {
  const d = await fetchDevice(device_id);
  const dto = deviceToDto(d);
  modifyFn(dto);
  await api.put('/xv3/api/device', dto);
  return d;
}

// ──────────────────────────────────────────────
// 장비(Device) 수정
// ──────────────────────────────────────────────

async function updateDeviceDescription({ device_id, description } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  if (description == null) throw new Error('description은 필수입니다.');
  const d = await updateDeviceField(device_id, dto => { dto.description = description; });
  return { success: true, device_id, device_name: d.name, device_ip: d.ip, description };
}

async function toggleDeviceMonitoring({ device_id, ping_enabled, snmp_enabled } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  if (ping_enabled == null && snmp_enabled == null) {
    throw new Error('ping_enabled 또는 snmp_enabled 중 하나는 필수입니다.');
  }
  const d = await fetchDevice(device_id);
  const dto = deviceToDto(d);
  if (ping_enabled != null) dto.pingEnabled = ping_enabled;
  if (snmp_enabled != null) dto.snmpEnabled = snmp_enabled;
  await api.put('/xv3/api/device', dto);

  // 실제 저장값 재조회
  const updated = await api.get(`/xv3/api/device/${device_id}`);
  return {
    success: true,
    device_id,
    device_name: d.name,
    device_ip: d.ip,
    ping_enabled: !!updated?.pingEnabled,
    snmp_enabled: !!updated?.snmpEnabled,
  };
}

async function setDeviceDisabled({ device_id, disabled } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  if (disabled == null) throw new Error('disabled(true/false)는 필수입니다.');
  const d = await updateDeviceField(device_id, dto => { dto.disabled = disabled; });
  return { success: true, device_id, device_name: d.name, device_ip: d.ip, disabled };
}

async function updateDeviceSysLocation({ device_id, sys_location } = {}) {
  if (!device_id) throw new Error('device_id는 필수입니다.');
  if (!sys_location) throw new Error('sys_location은 필수입니다.');
  const d = await updateDeviceField(device_id, dto => {
    dto.sysLocation = sys_location;
    dto.sysLocationFix = true;
  });
  return { success: true, device_id, device_name: d.name, device_ip: d.ip, sys_location };
}

// ──────────────────────────────────────────────
// 장비 그룹 관리
// ──────────────────────────────────────────────

async function createDeviceGroup({ site_id, name, description = '' } = {}) {
  if (!site_id) throw new Error('site_id는 필수입니다.');
  if (!name) throw new Error('name은 필수입니다.');
  const body = { siteId: site_id, name, description, disabled: false };
  const result = await api.post('/xv3/api/device-group', body);
  const group_id = result?.id ?? result;
  return { success: true, group_id, site_id, name, description };
}

async function addDeviceToGroup({ group_id, device_id } = {}) {
  if (!group_id) throw new Error('group_id는 필수입니다.');
  if (!device_id) throw new Error('device_id는 필수입니다.');
  const body = { groupId: group_id, deviceId: device_id };
  const result = await api.post('/xv3/api/device-group-mapping', body);
  const mapping_id = result?.id ?? result;
  const d = await api.get(`/xv3/api/device/${device_id}`).catch(() => null);
  return { success: true, mapping_id, group_id, device_id, device_name: d?.name, device_ip: d?.ip };
}

async function removeDeviceFromGroup({ group_id, device_id } = {}) {
  if (!group_id) throw new Error('group_id는 필수입니다.');
  if (!device_id) throw new Error('device_id는 필수입니다.');

  // mapping row ID 조회 후 삭제
  const mappings = await api.get(`/xv3/api/device-group-mapping/${group_id}`);
  const arr = Array.isArray(mappings) ? mappings : (mappings?.content ?? []);
  const mapping = arr.find(m => m.deviceId === device_id || m.device_id === device_id);
  if (!mapping) throw new Error(`device_id ${device_id}는 group_id ${group_id}의 멤버가 아닙니다.`);

  await api.del(`/xv3/api/device-group-mapping/${mapping.id}`);
  const d = await api.get(`/xv3/api/device/${device_id}`).catch(() => null);
  return { success: true, group_id, device_id, device_name: d?.name, device_ip: d?.ip };
}

async function updateDeviceGroupName({ group_id, name, description } = {}) {
  if (!group_id) throw new Error('group_id는 필수입니다.');
  if (!name && description == null) throw new Error('name 또는 description 중 하나는 필수입니다.');

  const current = await api.get(`/xv3/api/device-group/${group_id}`);
  if (!current) throw new Error(`group_id ${group_id}를 찾을 수 없습니다.`);

  const body = {
    id: group_id,
    siteId: current.siteId,
    name: name ?? current.name,
    description: description ?? current.description ?? '',
    disabled: current.disabled ?? false,
  };
  await api.put(`/xv3/api/device-group/${group_id}`, body);
  return { success: true, group_id, name: body.name, description: body.description };
}

// ──────────────────────────────────────────────
// 토폴로지 링크 — API 미지원
// ──────────────────────────────────────────────

async function createTopologyLink() {
  throw new Error('create_topology_link: xv3 API에 토폴로지 링크 생성 엔드포인트가 없습니다.');
}

async function deleteTopologyLink() {
  throw new Error('delete_topology_link: xv3 API에 토폴로지 링크 삭제 엔드포인트가 없습니다.');
}

// ──────────────────────────────────────────────
// 이슈 — API 미지원
// ──────────────────────────────────────────────

async function closeIssue() {
  throw new Error('close_issue: xv3 API에 이슈 종료 엔드포인트가 없습니다.');
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