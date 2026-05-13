#!/usr/bin/env node
'use strict';

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const express = require('express');
const { z } = require('zod');
const get   = require('./tools/get');
const set   = require('./tools/set');
const perf  = require('./tools/perf');
const issue = require('./tools/issue');

// ────────────────────────────────────────────────────────
// 헬퍼: 결과를 MCP 텍스트 응답으로 변환
// ────────────────────────────────────────────────────────
function ok(data) {
  const payload = Array.isArray(data)
    ? { count: data.length, items: data }
    : data;
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}
function err(e) {
  return { content: [{ type: 'text', text: `오류: ${e.message}` }], isError: true };
}

/** HTTP 모드에서만 사용: 터미널(stderr)에 요청·응답 추적 로그 */
function httpLog(line) {
  process.stderr.write(`[xv3-mcp-http ${new Date().toISOString()}] ${line}\n`);
}

// ════════════════════════════════════════════════════════
// MCP 서버 팩토리 — 세션마다 독립 인스턴스 생성
// ════════════════════════════════════════════════════════
function createMcpServer() {
  const srv = new McpServer({ name: 'xv3-nms-mcp', version: '1.0.0' });

  // ──────────────────────────────────────────────────────
  // GET 도구들
  // ──────────────────────────────────────────────────────

  // 1. 장비 목록 조회
  srv.tool(
    'list_devices',
    '네트워크 장비 목록을 조회합니다. 사이트, 상태, 벤더, 타입, 그룹으로 필터링 가능합니다.',
    {
      site_id:        z.number().optional().describe('사이트 ID (예: 1)'),
      status:         z.number().optional().describe('장비 상태 (1=UP, 0=DOWN)'),
      vendor:         z.string().optional().describe('벤더명 (부분 검색, 예: Cisco)'),
      device_type_id: z.number().optional().describe('장비 유형 ID'),
      group_id:       z.number().optional().describe('장비 그룹 ID로 필터'),
      disabled:       z.number().optional().describe('비활성화 여부 (0=활성, 1=비활성)'),
      name:           z.string().optional().describe('장비명 (부분 검색, 예: Core-SW)'),
      site_name:      z.string().optional().describe('사이트명 (부분 검색, 예: 서울). site_id 대신 사용 가능'),
      limit:          z.number().optional().default(100).describe('최대 반환 건수 (기본 100)'),
    },
    async (args) => {
      try { return ok(await get.listDevices(args)); } catch (e) { return err(e); }
    }
  );

  // 2. 장비 상세 조회
  srv.tool(
    'get_device',
    '장비 ID 또는 IP로 장비의 상세 정보를 조회합니다.',
    {
      id: z.number().optional().describe('장비 ID'),
      ip: z.string().optional().describe('장비 IP 주소 (예: 10.20.2.149)'),
    },
    async (args) => {
      try { return ok(await get.getDevice(args)); } catch (e) { return err(e); }
    }
  );

  // 3. 장비 인터페이스 조회
  srv.tool(
    'get_device_interfaces',
    '장비의 인터페이스(포트) 목록을 조회합니다.',
    {
      device_id:    z.number().describe('장비 ID'),
      admin_status: z.number().optional().describe('관리 상태 (1=UP, 2=DOWN)'),
      oper_status:  z.number().optional().describe('운영 상태 (1=UP, 2=DOWN)'),
    },
    async (args) => {
      try { return ok(await get.getDeviceInterfaces(args)); } catch (e) { return err(e); }
    }
  );

  // 4. 장비별 인터페이스 현황 요약
  srv.tool(
    'list_device_interface_summary',
    '장비별 인터페이스(포트) 현황을 한 번에 조회합니다. "장비별 회선현황", "전체 장비 포트 현황" 요청 시 사용하세요. list_devices + get_device_interfaces 반복 호출을 대체합니다.',
    {
      site_id:        z.number().optional().describe('사이트 ID로 필터'),
      site_name:      z.string().optional().describe('사이트명 부분 검색. site_id 대신 사용 가능'),
      name:           z.string().optional().describe('장비명 부분 검색 (예: Core-SW)'),
      status:         z.number().optional().describe('장비 상태 (1=UP, 0=DOWN)'),
      vendor:         z.string().optional().describe('벤더명 부분 검색'),
      device_type_id: z.number().optional().describe('장비 유형 ID'),
      group_id:       z.number().optional().describe('장비 그룹 ID'),
      disabled:       z.number().optional().describe('비활성화 여부 (0=활성, 1=비활성)'),
      admin_status:   z.number().optional().describe('인터페이스 관리 상태 필터 (1=UP, 2=DOWN)'),
      oper_status:    z.number().optional().describe('인터페이스 운영 상태 필터 (1=UP, 2=DOWN)'),
      limit:          z.number().optional().default(100).describe('최대 반환 건수 (기본 100)'),
    },
    async (args) => {
      try { return ok(await get.listDeviceInterfaceSummary(args)); } catch (e) { return err(e); }
    }
  );

  // 5. 장비 IP 주소 조회
  srv.tool(
    'get_device_ip_addresses',
    '장비에 설정된 IP 주소 목록을 조회합니다.',
    {
      device_id: z.number().describe('장비 ID'),
    },
    async (args) => {
      try { return ok(await get.getDeviceIpAddresses(args)); } catch (e) { return err(e); }
    }
  );

  // 6. CAM 테이블 조회
  srv.tool(
    'get_device_cam_table',
    '장비의 CAM(ARP/MAC) 테이블을 조회합니다.',
    {
      device_id:    z.number().describe('장비 ID'),
      interface_id: z.number().optional().describe('인터페이스 ID로 필터'),
      mac:          z.string().optional().describe('MAC 주소로 검색 (부분 검색)'),
      ip:           z.string().optional().describe('IP 주소로 검색 (부분 검색)'),
      limit:        z.number().optional().default(200).describe('최대 반환 건수 (기본 200)'),
    },
    async (args) => {
      try { return ok(await get.getDeviceCamTable(args)); } catch (e) { return err(e); }
    }
  );

  // 7. IP로 검색
  srv.tool(
    'search_by_ip',
    'IP 주소로 장비 또는 인터페이스를 검색합니다.',
    {
      ip: z.string().describe('검색할 IP 주소 (부분 검색 가능, 예: 10.20.2)'),
    },
    async (args) => {
      try { return ok(await get.searchByIp(args)); } catch (e) { return err(e); }
    }
  );

  // 8. 알람 이력 조회
  srv.tool(
    'list_alarms',
    '알람 발송 이력을 조회합니다. (SMS/이메일 알람 기록)',
    {
      device_ip:   z.string().optional().describe('장비 IP로 필터'),
      device_name: z.string().optional().describe('장비명으로 필터 (부분 검색)'),
      start_date:  z.string().optional().describe('시작 일시 (예: 2025-01-01 00:00:00)'),
      end_date:    z.string().optional().describe('종료 일시 (예: 2025-12-31 23:59:59)'),
      limit:       z.number().optional().default(100).describe('최대 반환 건수 (기본 100)'),
    },
    async (args) => {
      try { return ok(await get.listAlarms(args)); } catch (e) { return err(e); }
    }
  );

  // 9. 이슈/이벤트 로그 조회
  srv.tool(
    'list_issues',
    'NMS 이슈/이벤트 로그를 조회합니다.',
    {
      device_id:   z.number().optional().describe('장비 ID로 필터'),
      severity:    z.number().optional().describe('심각도 ID (1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Info)'),
      issue_type:  z.string().optional().describe('이슈 유형 코드 (A=TempFault, C=Threshold, P=Ping, S=Snmp 등)'),
      start_date:  z.string().optional().describe('시작 일시 (예: 2025-01-01 00:00:00)'),
      end_date:    z.string().optional().describe('종료 일시'),
      active_only: z.boolean().optional().describe('현재 활성 이슈만 조회 (end_date가 없는 것)'),
      limit:       z.number().optional().default(100).describe('최대 반환 건수'),
    },
    async (args) => {
      try { return ok(await get.listIssues(args)); } catch (e) { return err(e); }
    }
  );

  // 10. 활성 이슈 요약
  srv.tool(
    'get_issue_summary',
    '현재 활성 이슈(미종료)를 심각도별로 집계합니다. 장애 현황 파악에 사용하세요. list_issues보다 토큰을 적게 사용합니다.',
    {
      device_id: z.number().optional().describe('특정 장비 ID로 범위 제한'),
      site_id:   z.number().optional().describe('특정 사이트 ID로 범위 제한'),
    },
    async (args) => {
      try { return ok(await get.getIssueSummary(args)); } catch (e) { return err(e); }
    }
  );


  // 11. 이슈 유형 목록
  srv.tool(
    'list_issue_types',
    '이슈 유형 코드 목록을 조회합니다.',
    {},
    async () => {
      try { return ok(await get.listIssueTypes()); } catch (e) { return err(e); }
    }
  );

  // 12. 심각도 목록
  srv.tool(
    'list_issue_severities',
    '이슈 심각도 목록을 조회합니다.',
    {},
    async () => {
      try { return ok(await get.listIssueSeverities()); } catch (e) { return err(e); }
    }
  );

  // 13. 사이트 목록
  srv.tool(
    'list_sites',
    'NMS에 등록된 사이트 목록을 조회합니다.',
    {},
    async () => {
      try { return ok(await get.listSites()); } catch (e) { return err(e); }
    }
  );

  // 14. 장비 그룹 목록
  srv.tool(
    'list_device_groups',
    '장비 그룹 목록을 조회합니다.',
    {
      site_id: z.number().optional().describe('사이트 ID로 필터'),
      name:    z.string().optional().describe('그룹명 부분 검색 (예: 코어)'),
    },
    async (args) => {
      try { return ok(await get.listDeviceGroups(args)); } catch (e) { return err(e); }
    }
  );

  // 15. 장비 그룹 멤버 조회
  srv.tool(
    'get_device_group_members',
    '특정 장비 그룹에 속한 장비 목록을 조회합니다.',
    {
      group_id: z.number().describe('장비 그룹 ID'),
    },
    async (args) => {
      try { return ok(await get.getDeviceGroupMembers(args)); } catch (e) { return err(e); }
    }
  );

  // 16. 사용자 목록
  srv.tool(
    'list_users',
    'NMS 사용자 목록을 조회합니다.',
    {
      site_id:   z.number().optional().describe('사이트 ID로 필터'),
      role_type: z.string().optional().describe('역할 유형으로 필터 (ADMIN, USER 등)'),
      group_id:  z.number().optional().describe('사용자 그룹 ID로 필터'),
      limit:     z.number().optional().default(100).describe('최대 반환 건수 (기본 100)'),
    },
    async (args) => {
      try { return ok(await get.listUsers(args)); } catch (e) { return err(e); }
    }
  );

  // 17. 토폴로지 맵 목록
  srv.tool(
    'list_topology_maps',
    '토폴로지 맵 목록을 조회합니다.',
    {
      site_id: z.number().optional().describe('사이트 ID로 필터'),
    },
    async (args) => {
      try { return ok(await get.listTopologyMaps(args)); } catch (e) { return err(e); }
    }
  );

  // 18. 토폴로지 노드 조회
  srv.tool(
    'get_topology_nodes',
    '토폴로지 맵의 노드(장비) 목록을 조회합니다.',
    {
      map_id: z.number().describe('토폴로지 맵 ID'),
    },
    async (args) => {
      try { return ok(await get.getTopologyNodes(args)); } catch (e) { return err(e); }
    }
  );

  // 19. 토폴로지 링크 조회
  srv.tool(
    'get_topology_links',
    '토폴로지 링크(연결) 목록을 조회합니다.',
    {
      map_id:  z.number().optional().describe('토폴로지 맵 ID로 필터'),
      site_id: z.number().optional().describe('사이트 ID로 필터'),
    },
    async (args) => {
      try { return ok(await get.getTopologyLinks(args)); } catch (e) { return err(e); }
    }
  );

  // 20. 수집기 목록
  srv.tool(
    'list_collectors',
    'NMS 수집기(Collector) 서버 목록과 상태를 조회합니다.',
    {},
    async () => {
      try { return ok(await get.listCollectors()); } catch (e) { return err(e); }
    }
  );

  // 21. 장비 설정 백업 조회
  srv.tool(
    'get_device_config',
    '장비의 설정 백업(Config) 데이터를 조회합니다.',
    {
      device_id: z.number().describe('장비 ID'),
    },
    async (args) => {
      try { return ok(await get.getDeviceConfig(args)); } catch (e) { return err(e); }
    }
  );

  // 22. 설정 수집 이력 조회
  srv.tool(
    'get_config_history',
    '장비의 설정 수집 이력을 조회합니다.',
    {
      device_id: z.number().describe('장비 ID'),
      limit:     z.number().optional().default(20).describe('최대 반환 건수'),
    },
    async (args) => {
      try { return ok(await get.getConfigHistory(args)); } catch (e) { return err(e); }
    }
  );

  // 23. 장비 유형 목록
  srv.tool(
    'list_device_types',
    '장비 유형 목록을 조회합니다. (Switch, Router, Firewall 등)',
    {},
    async () => {
      try { return ok(await get.listDeviceTypes()); } catch (e) { return err(e); }
    }
  );

  // 24. 장비 상태 요약 (대시보드용)
  srv.tool(
    'get_device_status_summary',
    '사이트별 장비 상태 요약을 조회합니다. (전체/UP/DOWN/비활성 수)',
    {
      site_id: z.number().optional().describe('특정 사이트만 조회할 경우 사이트 ID'),
    },
    async (args) => {
      try { return ok(await get.getDeviceStatusSummary(args)); } catch (e) { return err(e); }
    }
  );

  // 25. SNMP 템플릿 목록
  srv.tool(
    'list_snmp_templates',
    'SNMP 템플릿 목록을 조회합니다.',
    {
      site_id: z.number().optional().describe('사이트 ID로 필터'),
    },
    async (args) => {
      try { return ok(await get.listSnmpTemplates(args)); } catch (e) { return err(e); }
    }
  );

  // 26. 시스템 설정 조회
  srv.tool(
    'get_system_settings',
    '시스템 설정값을 조회합니다.',
    {
      site_id: z.number().optional().describe('사이트 ID로 필터'),
    },
    async (args) => {
      try { return ok(await get.getSystemSettings(args)); } catch (e) { return err(e); }
    }
  );

  // ──────────────────────────────────────────────────────
  // SET 도구들
  // ──────────────────────────────────────────────────────

  // 27. 장비 설명 수정
  srv.tool(
    'update_device_description',
    '장비의 설명(description) 필드를 수정합니다.',
    {
      device_id:   z.number().describe('수정할 장비 ID'),
      description: z.string().describe('새 설명 텍스트'),
    },
    async (args) => {
      try { return ok(await set.updateDeviceDescription(args)); } catch (e) { return err(e); }
    }
  );

  // 28. 모니터링 활성화/비활성화
  srv.tool(
    'toggle_device_monitoring',
    '장비의 Ping 또는 SNMP 모니터링을 활성화/비활성화합니다.',
    {
      device_id:    z.number().describe('장비 ID'),
      ping_enabled: z.boolean().optional().describe('Ping 모니터링 활성화 여부'),
      snmp_enabled: z.boolean().optional().describe('SNMP 모니터링 활성화 여부'),
    },
    async (args) => {
      try { return ok(await set.toggleDeviceMonitoring(args)); } catch (e) { return err(e); }
    }
  );

  // 29. 장비 활성/비활성 처리
  srv.tool(
    'set_device_disabled',
    '장비를 활성화 또는 비활성화합니다.',
    {
      device_id: z.number().describe('장비 ID'),
      disabled:  z.boolean().describe('비활성화 여부 (true=비활성, false=활성)'),
    },
    async (args) => {
      try { return ok(await set.setDeviceDisabled(args)); } catch (e) { return err(e); }
    }
  );

  // 30. 장비 위치 수정
  srv.tool(
    'update_device_sys_location',
    '장비의 sysLocation(물리적 위치) 정보를 수정합니다.',
    {
      device_id:    z.number().describe('장비 ID'),
      sys_location: z.string().describe('새 위치 정보 (예: B1F_SERVER_ROOM)'),
    },
    async (args) => {
      try { return ok(await set.updateDeviceSysLocation(args)); } catch (e) { return err(e); }
    }
  );

  // 31. 장비 그룹 생성
  srv.tool(
    'create_device_group',
    '새 장비 그룹을 생성합니다.',
    {
      site_id:     z.number().describe('사이트 ID'),
      name:        z.string().describe('그룹명'),
      description: z.string().optional().default('').describe('그룹 설명'),
    },
    async (args) => {
      try { return ok(await set.createDeviceGroup(args)); } catch (e) { return err(e); }
    }
  );

  // 32. 장비 그룹에 장비 추가
  srv.tool(
    'add_device_to_group',
    '장비를 특정 그룹에 추가합니다.',
    {
      group_id:  z.number().describe('장비 그룹 ID'),
      device_id: z.number().describe('추가할 장비 ID'),
    },
    async (args) => {
      try { return ok(await set.addDeviceToGroup(args)); } catch (e) { return err(e); }
    }
  );

  // 33. 장비 그룹에서 장비 제거
  srv.tool(
    'remove_device_from_group',
    '장비를 특정 그룹에서 제거합니다.',
    {
      group_id:  z.number().describe('장비 그룹 ID'),
      device_id: z.number().describe('제거할 장비 ID'),
    },
    async (args) => {
      try { return ok(await set.removeDeviceFromGroup(args)); } catch (e) { return err(e); }
    }
  );

  // 34. 장비 그룹명 수정
  srv.tool(
    'update_device_group',
    '장비 그룹의 이름 또는 설명을 수정합니다.',
    {
      group_id:    z.number().describe('장비 그룹 ID'),
      name:        z.string().optional().describe('새 그룹명'),
      description: z.string().optional().describe('새 그룹 설명'),
    },
    async (args) => {
      try { return ok(await set.updateDeviceGroupName(args)); } catch (e) { return err(e); }
    }
  );

  // 35. 토폴로지 링크 생성
  srv.tool(
    'create_topology_link',
    '토폴로지에 장비 간 연결 링크를 추가합니다.',
    {
      site_id:          z.number().describe('사이트 ID'),
      source_device_id: z.number().describe('소스 장비 ID'),
      target_device_id: z.number().describe('대상 장비 ID'),
      color:            z.string().optional().describe('링크 색상 (HEX, 예: #FF0000)'),
      thickness:        z.number().optional().default(1).describe('링크 두께'),
    },
    async (args) => {
      try { return ok(await set.createTopologyLink(args)); } catch (e) { return err(e); }
    }
  );

  // 36. 토폴로지 링크 삭제
  srv.tool(
    'delete_topology_link',
    '토폴로지 링크를 삭제합니다.',
    {
      link_id: z.number().describe('삭제할 링크 ID'),
    },
    async (args) => {
      try { return ok(await set.deleteTopologyLink(args)); } catch (e) { return err(e); }
    }
  );

  // 37. 이슈 종료 처리
  srv.tool(
    'close_issue',
    '활성 이슈를 수동으로 종료 처리합니다.',
    {
      issue_id: z.number().describe('종료할 이슈 ID'),
    },
    async (args) => {
      try { return ok(await set.closeIssue(args)); } catch (e) { return err(e); }
    }
  );

  // ──────────────────────────────────────────────────────
  // 성능 데이터 (xv3_perf DB)
  // ──────────────────────────────────────────────────────

  // 38. 수집 항목 목록 조회
  srv.tool(
    'list_collect_items',
    'NMS가 수집하는 성능 항목 목록을 조회합니다. collect_item_id를 확인할 때 사용합니다. (예: CPU=1, Memory=2, In bps=3, Out bps=4, In Util=5, Out Util=6, 온도=9, 응답속도=10)',
    {},
    async () => {
      try { return ok(await perf.listCollectItems()); } catch (e) { return err(e); }
    }
  );

  // 39. 장비 레벨 성능 시계열 조회
  srv.tool(
    'get_perf_device',
    '장비 단위 성능 시계열 데이터를 조회합니다. CPU사용률(1), Memory사용률(2), 장비온도(9), 응답속도(10) 등 장비 전체 단위로 수집되는 항목에 사용합니다.',
    {
      device_id:       z.number().describe('장비 ID (필수)'),
      collect_item_id: z.number().optional().describe('수집 항목 ID (생략 시 전체 장비 레벨 항목 반환). CPU=1, Memory=2, 온도=9, 응답속도=10'),
      granularity:     z.enum(['10min','hourly','daily','monthly']).optional().default('hourly').describe('집계 단위 (기본: hourly)'),
      from:            z.string().optional().describe('조회 시작 일시 (예: 2026-05-01 00:00:00)'),
      to:              z.string().optional().describe('조회 종료 일시 (예: 2026-05-12 23:59:59)'),
      limit:           z.number().optional().default(48).describe('최대 반환 건수 (기본 48, hourly 기준 2일치)'),
    },
    async (args) => {
      try { return ok(await perf.getPerfDevice(args)); } catch (e) { return err(e); }
    }
  );

  // 40. 인터페이스 레벨 성능 시계열 조회
  srv.tool(
    'get_perf_interface',
    '장비 인터페이스(포트) 단위 성능 시계열 데이터를 조회합니다. 회선사용량 bps(3/4), 회선사용률 Util(5/6), 패킷처리량 PPS(7/8) 등 포트별 항목에 사용합니다.',
    {
      device_id:       z.number().describe('장비 ID (필수)'),
      interface_id:    z.number().optional().describe('인터페이스 ifIndex (생략 시 전체 포트). collect_interface.interface_id 값'),
      collect_item_id: z.number().optional().describe('수집 항목 ID. In bps=3, Out bps=4, In Util=5, Out Util=6, Out PPS=7, In PPS=8'),
      if_name:         z.string().optional().describe('인터페이스 이름 부분 검색 (예: Gi1/0/1)'),
      granularity:     z.enum(['10min','hourly','daily','monthly']).optional().default('hourly').describe('집계 단위 (기본: hourly)'),
      from:            z.string().optional().describe('조회 시작 일시'),
      to:              z.string().optional().describe('조회 종료 일시'),
      limit:           z.number().optional().default(48).describe('최대 반환 건수 (기본 48)'),
    },
    async (args) => {
      try { return ok(await perf.getPerfInterface(args)); } catch (e) { return err(e); }
    }
  );

  // 41. Top-N 성능 조회
  srv.tool(
    'get_perf_topn',
    '특정 성능 항목 기준으로 상위 N개 장비 또는 인터페이스를 조회합니다. device_id 없이 호출하면 전체(또는 사이트) 장비 Top N, device_id를 지정하면 해당 장비의 인터페이스 Top N을 반환합니다.',
    {
      collect_item_id: z.number().describe('수집 항목 ID (필수). CPU=1, Memory=2, In bps=3, Out bps=4, In Util=5, Out Util=6, 온도=9, 응답속도=10'),
      granularity:     z.enum(['10min','hourly','daily','monthly']).optional().default('hourly').describe('집계 단위 (기본: hourly)'),
      from:            z.string().optional().describe('조회 시작 일시'),
      to:              z.string().optional().describe('조회 종료 일시'),
      n:               z.number().optional().default(10).describe('상위 N개 (기본 10)'),
      value_type:      z.enum(['avg','max']).optional().default('avg').describe('순위 기준 (avg=평균, max=최대)'),
      site_id:         z.number().optional().describe('사이트 필터 (device_id 없을 때 사용)'),
      device_id:       z.number().optional().describe('지정 시 해당 장비의 인터페이스 Top N 반환'),
    },
    async (args) => {
      try { return ok(await perf.getPerfTopN(args)); } catch (e) { return err(e); }
    }
  );

  // ──────────────────────────────────────────────────────
  // 이벤트 로그 (xv3_issue DB)
  // ──────────────────────────────────────────────────────

  // 42. 이벤트 로그 조회
  srv.tool(
    'list_events',
    'xv3_issue DB의 이벤트 로그를 조회합니다. Syslog(S), Threshold(C), Ping(P) 등 모든 이벤트 유형을 포함합니다. syslog_keyword는 Facility-Severity 형식입니다 (예: 5-4 = Notification/Warning).',
    {
      device_id:       z.number().optional().describe('장비 ID로 필터'),
      site_id:         z.number().optional().describe('사이트 ID로 필터'),
      issue_type:      z.enum(['S','C','P','A','F','I','M','N','E','O','R','W']).optional().describe('이벤트 유형 코드 (S=Syslog, C=Threshold, P=Ping, A=TempFault, F=FAN, I=PortStatus, M=SystemEvent 등)'),
      severity:        z.number().optional().describe('심각도 (1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Normal)'),
      syslog_keyword:  z.string().optional().describe('Syslog Facility-Severity 코드 부분 검색 (예: "5-4" = Notification/Warning, "5-3" = Notification/Error)'),
      start_date:      z.string().optional().describe('조회 시작 일시 (예: 2026-05-01 00:00:00)'),
      end_date:        z.string().optional().describe('조회 종료 일시 (예: 2026-05-12 23:59:59)'),
      active_only:     z.boolean().optional().describe('미종료 이벤트만 조회 (end_date IS NULL)'),
      limit:           z.number().optional().default(100).describe('최대 반환 건수 (기본 100)'),
    },
    async (args) => {
      try { return ok(await issue.listEvents(args)); } catch (e) { return err(e); }
    }
  );

  // 43. 이벤트 집계 요약
  srv.tool(
    'get_event_summary',
    'xv3_issue DB 이벤트를 이벤트 유형별·심각도별로 집계합니다. 전체 이벤트 현황 파악에 사용하세요.',
    {
      device_id:  z.number().optional().describe('특정 장비로 범위 제한'),
      site_id:    z.number().optional().describe('특정 사이트로 범위 제한'),
      start_date: z.string().optional().describe('집계 시작 일시'),
      end_date:   z.string().optional().describe('집계 종료 일시'),
    },
    async (args) => {
      try { return ok(await issue.getEventSummary(args)); } catch (e) { return err(e); }
    }
  );

  // 44. 지속 이슈 조회
  srv.tool(
    'list_persistent_issues',
    '장기간 지속 중인 이슈를 조회합니다 (xv3_issue.issue_log_persist). 기본적으로 현재 활성(미종료) 이슈만 반환합니다.',
    {
      device_id:   z.number().optional().describe('장비 ID로 필터'),
      issue_type:  z.enum(['S','C','P','A','F','I','M','N','E','O','R','W']).optional().describe('이벤트 유형 코드 (S=Syslog, C=Threshold, P=Ping 등)'),
      severity:    z.number().optional().describe('심각도 (1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Normal)'),
      active_only: z.boolean().optional().default(true).describe('미종료 이슈만 조회 (기본 true)'),
      limit:       z.number().optional().default(100).describe('최대 반환 건수 (기본 100)'),
    },
    async (args) => {
      try { return ok(await issue.listPersistentIssues(args)); } catch (e) { return err(e); }
    }
  );

  return srv;
}

// ════════════════════════════════════════════════════════
// 서버 시작
// 실행 모드: --http [포트]  → HTTP (StreamableHTTP, 다중 세션)
//            (기본)         → stdio
// ════════════════════════════════════════════════════════
async function startStdio() {
  const transport = new StdioServerTransport();
  await createMcpServer().connect(transport);
  process.stderr.write('xv3-nms-mcp stdio 모드로 시작됨\n');
}

async function startHttp(port) {
  const app = express();
  app.use(express.json());

  // sessionId → StreamableHTTPServerTransport
  const sessions = new Map();

  app.all('/mcp', async (req, res) => {
    const remote     = req.socket?.remoteAddress ?? req.ip ?? '-';
    const sessionHdr = req.headers['mcp-session-id'] ?? null;
    httpLog(`→ ${req.method} /mcp | from=${remote} | session=${sessionHdr ?? '(new)'} | 활성세션=${sessions.size}`);

    if (req.method === 'POST' && req.body != null && typeof req.body === 'object') {
      const raw = JSON.stringify(req.body);
      httpLog(`  body: ${raw.length > 300 ? raw.slice(0, 300) + '…' : raw}`);
    }
    res.on('finish', () => httpLog(`← ${req.method} /mcp status=${res.statusCode}`));

    try {
      // ── 기존 세션 요청 라우팅 ──────────────────────────
      if (sessionHdr && sessions.has(sessionHdr)) {
        await sessions.get(sessionHdr).handleRequest(req, res, req.body);
        return;
      }

      // ── 새 세션 생성 ──────────────────────────────────
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => require('crypto').randomUUID(),
      });

      transport.onerror = (e) => httpLog(`transport error [${transport.sessionId}]: ${e?.message ?? e}`);
      transport.onclose = () => {
        if (transport.sessionId) {
          sessions.delete(transport.sessionId);
          httpLog(`세션 해제: ${transport.sessionId} | 남은 세션: ${sessions.size}`);
        }
      };

      await createMcpServer().connect(transport);
      await transport.handleRequest(req, res, req.body);

      if (transport.sessionId) {
        sessions.set(transport.sessionId, transport);
        httpLog(`새 세션 등록: ${transport.sessionId} | 활성 세션: ${sessions.size}`);
      }
    } catch (e) {
      httpLog(`handler exception: ${e.message}`);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });

  // 헬스체크 — 활성 세션 수 포함
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'xv3-nms-mcp', sessions: sessions.size });
  });

  app.listen(port, () => {
    process.stderr.write(
      `xv3-nms-mcp HTTP 모드로 시작됨 (port ${port})\n` +
      `  StreamableHTTP : http://localhost:${port}/mcp\n` +
      `  Health         : http://localhost:${port}/health\n`
    );
  });
}

async function main() {
  const args = process.argv.slice(2);
  const httpIdx = args.indexOf('--http');

  if (httpIdx !== -1) {
    const port = parseInt(args[httpIdx + 1], 10) || 3334;
    await startHttp(port);
  } else {
    await startStdio();
  }
}

main().catch((e) => {
  process.stderr.write(`Fatal: ${e.message}\n`);
  process.exit(1);
});
