# XV3 NMS MCP — 지원 도구(Tools) 목록

MCP 서버 이름: `xv3-nms-mcp` (버전 `1.0.0`)  
데이터 소스: XV3 NMS MariaDB (`db.js` 연결 정보 기준)

아래는 `index.js`에 등록된 **JSON-RPC 도구 이름**과 **기능 설명**, **입력 파라미터** 요약입니다.

---

## 요약 표

| # | 도구 이름 | 유형 | 설명 |
|---|-----------|------|------|
| 1 | `list_devices` | 조회 | 네트워크 장비 목록 (필터 다수) |
| 2 | `get_device` | 조회 | 장비 상세 (ID 또는 IP) |
| 3 | `get_device_interfaces` | 조회 | 장비 인터페이스(포트) 목록 |
| 4 | `get_device_ip_addresses` | 조회 | 장비에 설정된 IP 목록 |
| 5 | `get_device_cam_table` | 조회 | CAM(MAC/ARP) 테이블 |
| 6 | `search_by_ip` | 조회 | IP로 장비·인터페이스 검색 |
| 7 | `list_alarms` | 조회 | 알람 발송 이력 (SMS/이메일 등) |
| 8 | `list_issues` | 조회 | NMS 이슈/이벤트 로그 |
| 9 | `list_issue_types` | 조회 | 이슈 유형 코드 목록 |
| 10 | `list_issue_severities` | 조회 | 이슈 심각도 목록 |
| 11 | `list_sites` | 조회 | 사이트 목록 |
| 12 | `list_device_groups` | 조회 | 장비 그룹 목록 |
| 13 | `get_device_group_members` | 조회 | 그룹 소속 장비 목록 |
| 14 | `list_users` | 조회 | NMS 사용자 목록 |
| 15 | `list_topology_maps` | 조회 | 토폴로지 맵 목록 |
| 16 | `get_topology_nodes` | 조회 | 토폴로지 맵의 노드(장비) |
| 17 | `get_topology_links` | 조회 | 토폴로지 링크(연결) |
| 18 | `list_collectors` | 조회 | 수집기(Collector) 목록·상태 |
| 19 | `get_device_config` | 조회 | 장비 설정 백업(Config) 데이터 |
| 20 | `get_config_history` | 조회 | 설정 수집 이력 |
| 21 | `list_device_types` | 조회 | 장비 유형 (Switch, Router 등) |
| 22 | `get_device_status_summary` | 조회 | 사이트별 장비 상태 요약 |
| 23 | `list_snmp_templates` | 조회 | SNMP 템플릿 목록 |
| 24 | `get_system_settings` | 조회 | 시스템 설정값 |
| 25 | `update_device_description` | 변경 | 장비 설명 수정 |
| 26 | `toggle_device_monitoring` | 변경 | Ping/SNMP 모니터링 on/off |
| 27 | `set_device_disabled` | 변경 | 장비 활성/비활성 |
| 28 | `update_device_sys_location` | 변경 | sysLocation 수정 |
| 29 | `create_device_group` | 변경 | 장비 그룹 생성 |
| 30 | `add_device_to_group` | 변경 | 그룹에 장비 추가 |
| 31 | `remove_device_from_group` | 변경 | 그룹에서 장비 제거 |
| 32 | `update_device_group` | 변경 | 그룹 이름/설명 수정 |
| 33 | `create_topology_link` | 변경 | 토폴로지 링크 추가 |
| 34 | `delete_topology_link` | 변경 | 토폴로지 링크 삭제 |
| 35 | `close_issue` | 변경 | 이슈 수동 종료 |

---

## 조회 도구 (GET)

### `list_devices`

네트워크 장비 목록을 조회합니다. 사이트, 상태, 벤더, 타입, 그룹으로 필터링할 수 있습니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | 선택 | 사이트 ID (예: 1) |
| `status` | 선택 | 장비 상태 (1=UP, 0=DOWN) |
| `vendor` | 선택 | 벤더명 부분 검색 (예: Cisco) |
| `device_type_id` | 선택 | 장비 유형 ID |
| `group_id` | 선택 | 장비 그룹 ID |
| `disabled` | 선택 | 비활성 (0=활성, 1=비활성) |
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

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `admin_status` | 선택 | 관리 상태 (1=UP, 2=DOWN) |
| `oper_status` | 선택 | 운영 상태 (1=UP, 2=DOWN) |

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

---

### `search_by_ip`

IP 주소로 장비 또는 인터페이스를 검색합니다.

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
| `start_date` | 선택 | 시작 일시 |
| `end_date` | 선택 | 종료 일시 |
| `limit` | 선택 | 최대 건수 (기본 100) |

---

### `list_issues`

NMS 이슈/이벤트 로그를 조회합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | 선택 | 장비 ID |
| `severity` | 선택 | 심각도 ID (1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Info) |
| `issue_type` | 선택 | 이슈 유형 코드 (A, C, P, S 등) |
| `start_date` | 선택 | 시작 일시 |
| `end_date` | 선택 | 종료 일시 |
| `active_only` | 선택 | 활성 이슈만 (`end_date` 없음) |
| `limit` | 선택 | 최대 건수 (기본 100) |

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
| `site_id` | 선택 | 사이트 ID |

---

### `list_collectors`

NMS 수집기(Collector) 서버 목록과 상태를 조회합니다.

파라미터 없음.

---

### `get_device_config`

장비의 설정 백업(Config) 데이터를 조회합니다.

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

### `update_device_description`

장비의 설명(`description`) 필드를 수정합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `description` | **필수** | 새 설명 텍스트 |

---

### `toggle_device_monitoring`

장비의 Ping 또는 SNMP 모니터링을 활성화/비활성화합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `device_id` | **필수** | 장비 ID |
| `ping_enabled` | 선택 | Ping 모니터링 여부 |
| `snmp_enabled` | 선택 | SNMP 모니터링 여부 |

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

새 장비 그룹을 생성합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | **필수** | 사이트 ID |
| `name` | **필수** | 그룹명 |
| `description` | 선택 | 그룹 설명 (기본 빈 문자열) |

---

### `add_device_to_group`

장비를 특정 그룹에 추가합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `group_id` | **필수** | 장비 그룹 ID |
| `device_id` | **필수** | 추가할 장비 ID |

---

### `remove_device_from_group`

장비를 특정 그룹에서 제거합니다.

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

토폴로지에 장비 간 연결 링크를 추가합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `site_id` | **필수** | 사이트 ID |
| `source_device_id` | **필수** | 소스 장비 ID |
| `target_device_id` | **필수** | 대상 장비 ID |
| `color` | 선택 | 링크 색상 (HEX, 예: #FF0000) |
| `thickness` | 선택 | 링크 두께 (기본 1) |

---

### `delete_topology_link`

토폴로지 링크를 삭제합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `link_id` | **필수** | 삭제할 링크 ID |

---

### `close_issue`

활성 이슈를 수동으로 종료 처리합니다.

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `issue_id` | **필수** | 종료할 이슈 ID |

---

## 참고

- 도구 정의의 단일 소스는 `index.js`입니다. 스키마가 바뀌면 이 문서와 함께 갱신하는 것이 좋습니다.
- 변경 계열 도구는 NMS DB에 쓰기를 수행하므로, 운영 환경에서는 권한·감사 정책에 맞게 사용하세요.
