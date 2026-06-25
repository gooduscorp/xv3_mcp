# xv3_mcp 프로젝트 프롬프트 라이브러리

이 문서는 [docs/copilot-use-guide.md](d:/Workspace/Project/13_MCP/xv3_mcp/docs/copilot-use-guide.md)를 기준으로 정리한, `xv3_mcp` 저장소 전용 팀 위키 등록용 프롬프트 모음입니다.

목표는 범용적인 질문이 아니라, 이 프로젝트에서 반복적으로 발생하는 작업을 빠르게 위임하고 검증 가능한 결과를 얻는 것입니다.

---

## 1. 사용 전 공통 컨텍스트

프롬프트를 던지기 전에 아래 맥락을 함께 주면 품질이 올라갑니다.

```text
프로젝트: xv3_mcp (XV3 NMS MCP Server)
런타임: Node.js CommonJS
진입점: index.js
도구 정의 원본: index.js
구현 파일: tools/get.js, tools/set.js, tools/perf.js, tools/issue.js
DB 헬퍼: db.js
문서 동기화 대상: TOOLS.md, README.md
응답 규칙: 배열은 { count, items }, 객체는 그대로, 오류는 err()
주의사항:
- 장비 status DOWN=0
- 인터페이스 admin_status/oper_status DOWN=2
- 민감 필드(ro_community, CLI password)는 응답에서 제외
- SQL은 항상 parameterized query 사용
```

---

## 2. 프로젝트 공통 프롬프트 패턴

### [xv3_mcp] MCP 도구 신규 추가

**언제 사용:** 새로운 MCP tool을 추가할 때

**프롬프트:**

```text
이 저장소의 기존 패턴을 따라 새 MCP 도구를 추가해줘.

추가 대상 도구명: [tool_name]
기능: [무엇을 조회/수정하는지]
구현 파일: [tools/get.js | tools/set.js | tools/perf.js | tools/issue.js]
입력 파라미터:
- [name]: [type], [required/optional], [description]
- [name]: [type], [required/optional], [description]

작업 범위:
1. index.js에 Zod 스키마와 tool 등록 추가
2. 해당 tools 파일에 구현 추가
3. TOOLS.md에 도구 설명과 파라미터 문서 추가

규칙:
- 배열 응답은 ok() 기준에 맞게 유지
- 오류는 throw 후 err()로 감싸지도록 기존 패턴 유지
- SQL은 ? 바인딩 기반 parameterized query 사용
- 기존 함수명/응답 형식 스타일을 그대로 따를 것
```

**결과 품질:** `index.js`와 구현 파일, 문서 파일까지 같이 바뀌도록 유도할 때 가장 안정적

**주의사항:** 도구 API를 바꾸면 `index.js`가 원본이므로 여기부터 수정하도록 명시해야 함

---

### [xv3_mcp] 기존 도구 파라미터 확장

**언제 사용:** `list_devices`, `list_events` 같은 기존 도구에 필터를 추가할 때

**프롬프트:**

```text
[tool_name] 도구에 새 필터를 추가해줘.

변경 요구사항:
- 새 파라미터: [parameter_name]
- 타입: [string|number|boolean]
- 의미: [설명]
- 적용 위치: index.js의 Zod 스키마, tools 구현, TOOLS.md

구현 규칙:
- 기존 optional 필터 조합 방식 유지
- SQL 조건은 값이 있을 때만 추가
- limit 기본값과 정렬 기준은 기존 동작 유지
- 응답 형식은 바꾸지 말 것
```

**결과 품질:** 단순 확장 작업에 적합

**주의사항:** `status`와 `oper_status`처럼 코드값 의미가 다른 필드는 설명을 함께 넣어야 오제안이 줄어듦

---

### [xv3_mcp] 조회 SQL 작성 또는 리팩토링

**언제 사용:** 새로운 조회 함수 작성, 기존 SQL 가독성 개선, JOIN 보정 시

**프롬프트:**

```text
[파일명]의 [함수명]을 구현 또는 리팩토링해줘.

요구사항:
- 조회 대상 테이블: [table names]
- 반환 필드: [field list]
- 필터: [optional filters]
- 정렬: [order by]
- limit 기본값: [value]

규칙:
- SQL injection 방지를 위해 query(sql, params) 패턴 유지
- 조건은 값이 있는 경우만 WHERE/AND에 추가
- 함수 시그니처와 module.exports 스타일은 기존 파일과 맞출 것
- 민감 정보는 SELECT에서 제외할 것
```

**결과 품질:** 반복 조회 함수 생성 시 효율적

**주의사항:** 조인 필터 위치에 따라 집계 결과가 달라지면 `WHERE` 대신 `JOIN ... ON` 사용 여부를 따로 명시하는 편이 안전함

---

### [xv3_mcp] 쓰기 도구 구현

**언제 사용:** UPDATE/INSERT/DELETE 기반 도구를 만들거나 수정할 때

**프롬프트:**

```text
tools/set.js의 기존 패턴에 맞게 쓰기 도구를 구현해줘.

대상 기능: [예: 장비 필드 수정, 그룹 CRUD, 링크 추가/삭제]
필수 검증:
- 필수 파라미터 선검증
- 대상 엔터티 존재 여부 확인
- 실패 시 명확한 한국어 에러 메시지

쓰기 규칙:
- create_id / modify_id 는 'mcp' 사용
- modify_date는 NOW() 반영
- UPDATE 후 실제 DB 상태를 다시 읽어 반환이 필요한지 검토
- 성공 응답에는 식별 가능한 id/name/ip 포함
```

**결과 품질:** set 계열 함수 일관성 유지에 유용

**주의사항:** 호출자가 보낸 값을 그대로 성공 응답으로 돌려주지 말고 실제 DB 상태 재조회가 필요한지 확인해야 함

---

### [xv3_mcp] 이슈 파티션 로직 반영

**언제 사용:** `issue_log_MM`, `issue_log_persist` 관련 기능 추가/수정 시

**프롬프트:**

```text
이 기능은 xv3_issue의 월별 파티션 테이블과 persist 테이블 규칙을 따라야 해.

반드시 반영할 규칙:
- active_only=true 이면 issue_log_persist 우선
- 날짜 범위가 있으면 해당 월의 issue_log_MM 테이블만 조회
- 날짜 범위가 없으면 이번 달 issue_log_MM + issue_log_persist 사용
- persist는 중복 방지를 위해 필요한 경우 create_date 기준 필터 적용

위 규칙을 tools/issueHelper.js의 resolveIssueTables()와 일치하게 구현하거나,
기존 helper를 재사용하는 방향으로 수정해줘.
```

**결과 품질:** 이슈/이벤트 관련 hallucination을 크게 줄임

**주의사항:** 이 프로젝트에서 이슈 조회 로직은 단순 단일 테이블 조회가 아님

---

### [xv3_mcp] 성능 데이터 도구 구현

**언제 사용:** `xv3_perf` 기반 시계열/Top-N 기능 추가 시

**프롬프트:**

```text
tools/perf.js의 패턴을 따라 성능 조회 기능을 작성해줘.

맥락:
- granularity: 10min, hourly, daily, monthly
- 테이블은 perf_data_10minute/hourly/daily/monthly 로 매핑
- device 레벨은 interface_id = 0
- interface 레벨은 interface_id != 0

요구사항:
- [device 또는 interface] 기준으로 조회
- collect_item_id 필터 지원 여부: [yes/no]
- from/to 기간 조건 지원
- limit 기본값 유지

기존 perfTable()과 getPerfTopN() 분기 방식에 맞게 구현해줘.
```

**결과 품질:** 장비 레벨과 인터페이스 레벨을 섞는 오류 방지에 도움

**주의사항:** 특정 항목이 장비형인지 인터페이스형인지 `collect_type` 판별이 필요한 경우를 꼭 명시해야 함

---

### [xv3_mcp] API 기반 전환 검토 또는 구현

**언제 사용:** 직접 SQL 대신 사내 서비스 API로 대체하는 작업 검토 시

**프롬프트:**

```text
현재 [함수명 또는 파일명]은 db.query()로 직접 SQL을 수행하고 있어.
이 부분을 서비스 API 기반으로 바꾸기 위한 변경안을 검토해줘.

분석 항목:
1. 현재 함수가 담당하는 입력/출력 계약
2. SQL이 단순 조회인지, 로직 자체인지
3. API 대체 시 필요한 엔드포인트 계약
4. 최소 변경으로 전환 가능한 계층 위치

제약:
- index.js의 MCP tool 계약은 유지
- 응답 형식은 ok()/err() 기준 유지
- db.query()를 무조건 공통 치환하지 말고 도메인 계층 분리를 우선 검토
```

**결과 품질:** 구조 검토 문서나 전환 전략 초안 작성에 적합

**주의사항:** `db.query()`를 바로 API로 치환하는 접근은 이 저장소에선 위험도가 높음

---

### [xv3_mcp] 버그 원인 분석

**언제 사용:** 결과 건수 이상, 집계 오류, 중복 조회, 필터 미적용 등을 분석할 때

**프롬프트:**

```text
이 버그를 현재 코드 기준으로 분석해줘.

증상:
- [실제 현상]

예상 동작:
- [기대 결과]

분석 범위:
- 진입점 tool 등록
- 실제 구현 함수
- SQL 조건 조립
- 응답 변환 로직

요청 사항:
- 가능한 원인을 우선순위로 정리
- 가장 가능성 높은 원인 1개를 먼저 지목
- 바로 확인 가능한 좁은 체크 방법과 수정 방향 제안
```

**결과 품질:** 단순 원인 나열보다 실제 코드 경로를 따라가도록 유도

**주의사항:** 증상과 기대 결과를 함께 주지 않으면 일반론으로 흐르기 쉬움

---

### [xv3_mcp] 보안 검토

**언제 사용:** SQL, 민감 필드 노출, HTTP 모드 인증, 쓰기 도구 점검 시

**프롬프트:**

```text
이 변경사항 또는 파일을 보안 관점으로 리뷰해줘.

집중 항목:
- SQL injection 가능성
- 민감 정보 노출 여부
- HTTP 모드 인증(MCP_API_KEY) 우회 가능성
- 과도한 응답 필드 반환 여부
- 쓰기 도구의 검증 누락 여부

리뷰 형식:
- findings 우선
- 심각도 순 정렬
- 파일/함수 단위로 지적
- 문제가 없으면 잔여 리스크만 간단히 정리
```

**결과 품질:** 리뷰 범위가 분명할 때 효과적

**주의사항:** `get_device`, `list_snmp_templates`는 민감 필드 제외가 핵심 검토 포인트임

---

### [xv3_mcp] 문서 동기화

**언제 사용:** tool 추가/변경 후 README, TOOLS.md 반영이 필요할 때

**프롬프트:**

```text
현재 코드 변경사항을 기준으로 문서를 동기화해줘.

대상 문서:
- TOOLS.md: 도구 설명, 파라미터, 주의사항
- README.md: 사용자 관점에서 드러나는 기능 또는 실행 방법 변경 시만 반영

규칙:
- index.js의 tool 이름과 설명을 기준으로 정리
- TOOLS.md는 한국어 설명 유지
- 과장 없이 실제 동작만 문서화
```

**결과 품질:** 코드-문서 불일치 방지에 유용

**주의사항:** 내부 구현만 바뀌고 사용자 계약이 안 바뀌면 README까지 과도하게 수정할 필요는 없음

---

### [xv3_mcp] PR 설명 작성

**언제 사용:** 코드 변경 후 PR 본문 초안이 필요할 때

**프롬프트:**

```text
현재 변경사항 기준으로 PR 설명 초안을 작성해줘.

포함 항목:
- 변경 요약
- 변경 유형
- 영향 범위
- 검토 포인트
- 테스트/검증 내역

주의:
- 이 저장소에는 별도 test/lint 스크립트가 거의 없으므로 실제로 수행한 검증만 적어줘
- 문서 변경이 있으면 함께 명시
```

**결과 품질:** 팀 PR 템플릿 채우기에 적합

**주의사항:** 실행하지 않은 테스트를 쓴 초안이 자주 나오므로 검증 항목은 실제 수행 기준으로 정리해야 함

---

## 3. 추천 프롬프트 조합

### 신규 도구 추가 작업

1. `MCP 도구 신규 추가`
2. `문서 동기화`
3. `보안 검토`

### 집계/이슈 로직 수정

1. `버그 원인 분석`
2. `이슈 파티션 로직 반영`
3. `문서 동기화`

### API 전환 작업

1. `API 기반 전환 검토 또는 구현`
2. `보안 검토`
3. `PR 설명 작성`

---

## 4. 팀 위키 등록 규칙 제안

이 프로젝트 관련 프롬프트를 팀 위키에 올릴 때는 아래 기준으로 관리하는 것을 권장합니다.

- 제목에는 반드시 `xv3_mcp` 또는 `XV3 NMS MCP`를 포함
- 범용 프롬프트와 프로젝트 전용 프롬프트를 분리
- 프롬프트마다 대상 파일과 기대 결과를 명시
- `index.js`, `TOOLS.md`, `README.md` 동기화 필요 여부를 함께 적기
- 이슈/성능/쓰기 도구처럼 도메인 규칙이 강한 항목은 별도 섹션 유지

---

## 5. 빠른 복사용 한 줄 프롬프트

```text
index.js와 tools/get.js의 기존 패턴을 따라 [도구명] MCP tool을 추가하고 TOOLS.md까지 동기화해줘.
```

```text
tools/issueHelper.js의 월별 파티션 규칙을 유지한 채 [기능명] 이슈 조회 로직을 수정해줘.
```

```text
현재 변경사항을 보안 리뷰 관점에서 점검해줘. SQL injection, 민감 필드 노출, 검증 누락 중심으로 봐줘.
```

```text
이 함수의 입력/출력 계약은 유지한 채 db.query 직접 호출을 서비스 API 계층으로 분리하는 방법을 검토해줘.
```