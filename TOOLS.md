# XV3 NMS MCP — 지원 도구(Tools) 목록

MCP 서버 이름: `xv3-nms-mcp` (버전 `1.0.0`)
데이터 소스: XV3 NMS MariaDB (접속 정보는 `.env` 파일로 관리)

아래는 `index.js`에 등록된 **JSON-RPC 도구 이름**과 **기능 설명**, **입력 파라미터** 요약입니다.

---

## 공통 응답 형식

- **배열 결과**: `{ count: N, items: [...] }` 형태로 반환됩니다.
- **단일 객체 결과**: 객체 그대로 반환됩니다.
- **변경 도구 성공 응답**: `success: true`와 함께 `device_name`, `device_ip` 등 주요 식별 정보를 포함합니다.
- **오류**: `isError: true`와 함께 한국어 메시지를 반환합니다.

---

## 요약 표

| # | 도구 이름 | 유형 | 설명 |
|---|-----------|------|------|
| 1 | `list_devices` | 조회 | 네트워크 장비 목록 (필터 다수) |
| 2 | `get_device` | 조회 | 장비 상세 (ID 또는 IP) |
| 3 | `get_device_interfaces` | 조회 | 장비 인터페이스(포트) 목록 |
| 4 | `list_device_interface_summary` | 조회 | 장비별 인터페이스 현황 요약 (one-call) |
| 5 | `get_device_ip_addresses` | 조회 | 장비에 설정된 IP 목록 |
| 6 | `get_device_cam_table` | 조회 | CAM(MAC/ARP) 테이블 |
| 7 | `search_by_ip` | 조회 | IP로 장비·인터페이스 검색 |
| 8 | `list_alarms` | 조회 | 알람 발송 이력 (SMS/이메일 등) |
| 9 | `list_issues` | 조회 | NMS 이슈/이벤트 로그 |
| 10 | `get_issue_summary` | 조회 | 활성 이슈 심각도별 집계 |
| 11 | `list_issue_types` | 조회 | 이슈 유형 코드 목록 |
| 12 | `list_issue_severities` | 조회 | 이슈 심각도 목록 |
| 13 | `list_sites` | 조회 | 사이트 목록 |
| 14 | `list_device_groups` | 조회 | 장비 그룹 목록 |
| 15 | `get_device_group_members` | 조회 | 그룹 소속 장비 목록 |
| 16 | `list_users` | 조회 | NMS 사용자 목록 |
| 17 | `list_topology_maps` | 조회 | 토폴로지 맵 목록 |
| 18 | `get_topology_nodes` | 조회 | 토폴로지 맵의 노드(장비) |
| 19 | `get_topology_links` | 조회 | 토폴로지 링크(연결) |
| 20 | `list_collectors` | 조회 | 수집기(Collector) 목록·상태 |
| 21 | `get_device_config` | 조회 | 장비 설정 백업(Config) 데이터 |
| 22 | `get_config_history` | 조회 | 설정 수집 이력 |
| 23 | `list_device_types` | 조회 | 장비 유형 (Switch, Router 등) |
| 24 | `get_device_status_summary` | 조회 | 사이트별 장비 상태 요약 |
| 25 | `list_snmp_templates` | 조회 | SNMP 템플릿 목록 |
| 26 | `get_system_settings` | 조회 | 시스템 설정값 |
| 27 | `update_device_description` | 변경 | 장비 설명 수정 |
| 28 | `toggle_device_monitoring` | 변경 | Ping/SNMP 모니터링 on/off |
| 29 | `set_device_disabled` | 변경 | 장비 활성/비활성 |
| 30 | `update_device_sys_location` | 변경 | sysLocation 수정 |
| 31 | `create_device_group` | 변경 | 장비 그룹 생성 |
| 32 | `add_device_to_group` | 변경 | 그룹에 장비 추가 |
| 33 | `remove_device_from_group` | 변경 | 그룹에서 장비 제거 |
| 34 | `update_device_group` | 변경 | 그룹 이름/설명 수정 |
| 35 | `create_topology_link` | 변경 | 토폴로지 링크 추가 |
| 36 | `delete_topology_link` | 변경 | 토폴로지 링크 삭제 |
| 37 | `close_issue` | 변경 | 이슈 수동 종료 |

---

## 조회 도구 (GET)

### `list_devices`

네트워크 장비 목록을 조회합니다. 이름·사이트명 부분 검색을 포함해 다양한 조건으로 필터링할 수 있습니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `name` | 선택 | 장비명 부분 검색 (예: Core-SW) |
| `site_id` | 선택 | 사이트 ID |
| `site_name` | 선택 | 사이트명 부분 검색 (예: 서울). `site_id` 대신 사용 가능 |
| `status` | 선택 | 장비 상태 (1=UP, 0=DOWN) |
| `vendor` | 선택 | 벤더명 부분 검색 (예: Cisco) |
| `device_type_id` | 선택 | 장비 유형 ID |
| `group_id` | 선택 | 장비 그룹 ID |
| `disabled` | 선택 | 비활성 여부 (0=활성, 1=비활성) |
| `limit` | 선택 | 최대 건수 (기본 100) |

---

### `get_device`

장비 ID 또는 IP로 상세 정보를 조회합니다. (`id` 또는 `ip` 중 하나 필요)

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `id` | 선택 | 장비 ID |
| `ip` | 선택 | 장비 IP (예: 10.20.2.149) |

---

### `get_device_interfaces`

장비의 인터페이스(포트) 목록을 조회합니다.

> **주의**: `admin_status` / `oper_status` 값은 1=UP, **2=DOWN** 입니다. (장비 status의 0=DOWN과 다름)

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `admin_status` | 선택 | 관리 상태 (1=UP, 2=DOWN) |
| `oper_status` | 선택 | 운영 상태 (1=UP, 2=DOWN) |

---

### `list_device_interface_summary`

장비별 인터페이스 현황을 한 번에 조회합니다. "장비별 회선현황", "전체 장비 포트 현황" 등의 요청에 사용하세요. `list_devices` + 반복 `get_device_interfaces` 호출을 대체합니다. `list_devices`와 동일한 필터 파라미터를 지원합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `name` | 선택 | 장비명 부분 검색 (예: Core-SW) |
| `site_id` | 선택 | 사이트 ID |
| `site_name` | 선택 | 사이트명 부분 검색. `site_id` 대신 사용 가능 |
| `status` | 선택 | 장비 상태 (1=UP, 0=DOWN) |
| `vendor` | 선택 | 벤더명 부분 검색 |
| `device_type_id` | 선택 | 장비 유형 ID |
| `group_id` | 선택 | 장비 그룹 ID |
| `disabled` | 선택 | 비활성 여부 (0=활성, 1=비활성) |
| `admin_status` | 선택 | 인터페이스 관리 상태 (1=UP, 2=DOWN) |
| `oper_status` | 선택 | 인터페이스 운영 상태 (1=UP, 2=DOWN) |
| `limit` | 선택 | 최대 건수 (기본 100) |

---

### `get_device_ip_addresses`

장비에 설정된 IP 주소 목록을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |

---

### `get_device_cam_table`

장비의 CAM(ARP/MAC) 테이블을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `interface_id` | 선택 | 인터페이스 ID 필터 |
| `mac` | 선택 | MAC 부분 검색 |
| `ip` | 선택 | IP 부분 검색 |
| `limit` | 선택 | 최대 건수 (기본 200) |

---

### `search_by_ip`

IP 주소로 장비 또는 인터페이스를 검색합니다. 결과는 `{ devices: [...], interfaces: [...] }` 형태입니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `ip` | **필수** | 검색 IP (부분 검색 가능, 예: 10.20.2) |

---

### `list_alarms`

알람 발송 이력을 조회합니다 (SMS/이메일 알람 기록).

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_ip` | 선택 | 장비 IP 필터 |
| `device_name` | 선택 | 장비명 부분 검색 |
| `start_date` | 선택 | 시작 일시 (예: 2025-01-01 00:00:00) |
| `end_date` | 선택 | 종료 일시 |
| `limit` | 선택 | 최대 건수 (기본 100) |

---

### `list_issues`

NMS 이슈/이벤트 로그를 조회합니다. 현황 파악만 필요하면 `get_issue_summary`가 더 효율적입니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | 선택 | 장비 ID |
| `severity` | 선택 | 심각도 ID (1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Info) |
| `issue_type` | 선택 | 이슈 유형 코드 (A=TempFault, C=Threshold, P=Ping, S=Snmp 등) |
| `start_date` | 선택 | 시작 일시 |
| `end_date` | 선택 | 종료 일시 |
| `active_only` | 선택 | 활성 이슈만 조회 (true/false) |
| `limit` | 선택 | 최대 건수 (기본 100) |

---

### `get_issue_summary`

현재 활성 이슈(미종료)를 심각도별로 집계합니다. "현재 장애 현황", "활성 알람 현황" 요청에 사용하세요. 결과는 `{ total_active: N, by_severity: [...] }` 형태입니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | 선택 | 특정 장비로 범위 제한 |
| `site_id` | 선택 | 특정 사이트로 범위 제한 |

---

### `list_issue_types`

이슈 유형 코드 목록을 조회합니다.

파라미터 없음.

---

### `list_issue_severities`

이슈 심각도 목록을 조회합니다.

파라미터 없음.

---

### `list_sites`

NMS에 등록된 사이트 목록을 조회합니다.

파라미터 없음.

---

### `list_device_groups`

장비 그룹 목록을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | 선택 | 사이트 ID |
| `name` | 선택 | 그룹명 부분 검색 (예: 코어) |

---

### `get_device_group_members`

특정 장비 그룹에 속한 장비 목록을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `group_id` | **필수** | 장비 그룹 ID |

---

### `list_users`

NMS 사용자 목록을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | 선택 | 사이트 ID |
| `role_type` | 선택 | 역할 (ADMIN, USER 등) |
| `group_id` | 선택 | 사용자 그룹 ID |

---

### `list_topology_maps`

토폴로지 맵 목록을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | 선택 | 사이트 ID |

---

### `get_topology_nodes`

토폴로지 맵의 노드(장비) 목록을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `map_id` | **필수** | 토폴로지 맵 ID |

---

### `get_topology_links`

토폴로지 링크(연결) 목록을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `map_id` | 선택 | 토폴로지 맵 ID |
| `site_id` | 선택 | 사이트 ID |

---

### `list_collectors`

NMS 수집기(Collector) 서버 목록과 상태를 조회합니다.

파라미터 없음.

---

### `get_device_config`

장비의 설정 백업(Config) 데이터를 조회합니다. 최근 5개, config 내용은 최대 5000자 미리보기로 반환됩니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |

---

### `get_config_history`

장비의 설정 수집 이력을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `limit` | 선택 | 최대 건수 (기본 20) |

---

### `list_device_types`

장비 유형 목록을 조회합니다 (Switch, Router, Firewall 등).

파라미터 없음.

---

### `get_device_status_summary`

사이트별 장비 상태 요약을 조회합니다 (전체/UP/DOWN/비활성 수 등).

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | 선택 | 특정 사이트만 조회 시 사이트 ID |

---

### `list_snmp_templates`

SNMP 템플릿 목록을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | 선택 | 사이트 ID |

---

### `get_system_settings`

시스템 설정값을 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | 선택 | 사이트 ID |

---

## 변경 도구 (SET)

> 변경 도구 성공 응답에는 `device_name`, `device_ip` 등 주요 식별 정보가 포함되어 결과를 명확히 확인할 수 있습니다.

### `update_device_description`

장비의 설명(`description`) 필드를 수정합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `description` | **필수** | 새 설명 텍스트 |

---

### `toggle_device_monitoring`

장비의 Ping 또는 SNMP 모니터링을 활성화/비활성화합니다. 응답에는 변경 후 DB에서 읽은 실제 상태(`ping_enabled`, `snmp_enabled`)가 포함됩니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `ping_enabled` | 선택 | Ping 모니터링 여부 (true/false) |
| `snmp_enabled` | 선택 | SNMP 모니터링 여부 (true/false) |

---

### `set_device_disabled`

장비를 활성화 또는 비활성화합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `disabled` | **필수** | true=비활성, false=활성 |

---

### `update_device_sys_location`

장비의 `sysLocation`(물리적 위치) 정보를 수정합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `sys_location` | **필수** | 새 위치 (예: B1F_SERVER_ROOM) |

---

### `create_device_group`

새 장비 그룹을 생성합니다. 같은 사이트 내 동일 이름의 그룹이 있으면 오류를 반환합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | **필수** | 사이트 ID |
| `name` | **필수** | 그룹명 |
| `description` | 선택 | 그룹 설명 (기본 빈 문자열) |

---

### `add_device_to_group`

장비를 특정 그룹에 추가합니다. 이미 멤버인 경우 `already_member: true`를 반환합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `group_id` | **필수** | 장비 그룹 ID |
| `device_id` | **필수** | 추가할 장비 ID |

---

### `remove_device_from_group`

장비를 특정 그룹에서 제거합니다. 해당 장비가 그룹 멤버가 아니면 오류를 반환합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `group_id` | **필수** | 장비 그룹 ID |
| `device_id` | **필수** | 제거할 장비 ID |

---

### `update_device_group`

장비 그룹의 이름 또는 설명을 수정합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `group_id` | **필수** | 장비 그룹 ID |
| `name` | 선택 | 새 그룹명 |
| `description` | 선택 | 새 그룹 설명 |

---

### `create_topology_link`

토폴로지에 장비 간 연결 링크를 추가합니다. 동일 source↔target 링크(양방향)가 이미 존재하면 오류를 반환합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | **필수** | 사이트 ID |
| `source_device_id` | **필수** | 소스 장비 ID |
| `target_device_id` | **필수** | 대상 장비 ID |
| `color` | 선택 | 링크 색상 (HEX, 예: #FF0000) |
| `thickness` | 선택 | 링크 두께 (기본 1) |

---

### `delete_topology_link`

토폴로지 링크를 삭제합니다. 응답에 삭제된 링크의 source/target 장비명과 IP가 포함됩니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `link_id` | **필수** | 삭제할 링크 ID |

---

### `close_issue`

활성 이슈를 수동으로 종료 처리합니다. 존재하지 않는 이슈와 이미 종료된 이슈를 구분해서 오류를 반환합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `issue_id` | **필수** | 종료할 이슈 ID |

---

## 참고

- 도구 정의의 단일 소스는 `index.js`입니다. 스키마가 바뀌면 이 문서와 함께 갱신하세요.
- 변경 계열 도구는 NMS DB에 쓰기를 수행합니다. `create_id` / `modify_id`는 `'mcp'`로 기록됩니다.
- DB 접속 정보는 `.env` 파일로 관리합니다. `.env.example`을 참고하세요.
