# GitHub Copilot 팀 프로젝트 운영 가이드

> **기준 프로젝트**: xv3_mcp (XV3 NMS MCP Server)  
> **목적**: 기존 코딩 방식에서 AI 협업 중심의 개발 문화로의 전환 로드맵

---

## 1. 왜 전환이 필요한가

### 기존 방식의 한계
| 항목 | 기존 방식 |
|------|-----------|
| 기능 추가 | 개발자가 직접 코드 작성 |
| 코드 리뷰 | 동료 리뷰어가 로직·문법 함께 검토 |
| 문서화 | 개발 후 별도 작업으로 진행 |
| 이슈 분석 | 담당자가 직접 로그·코드 분석 |
| 온보딩 | 코드를 읽으며 구조 파악 |

### Copilot 도입 후 목표 상태
| 항목 | 전환 후 방식 |
|------|-------------|
| 기능 추가 | 이슈 작성 → Copilot Coding Agent 위임 → 리뷰·머지 |
| 코드 리뷰 | 로직·보안·아키텍처에만 집중 (문법/패턴은 AI가 처리) |
| 문서화 | 코드 작성과 동시에 자동 초안 생성 |
| 이슈 분석 | Copilot Chat으로 빠른 1차 분석 후 판단 |
| 온보딩 | Copilot Chat으로 코드 질의응답 |

---

## 2. GitHub Copilot 도구 생태계

이 프로젝트에서 활용할 Copilot 도구와 역할을 명확히 구분한다.

### 2.1 도구별 사용 시나리오

| 도구 | 주요 용도 | 사용 시점 |
|------|-----------|-----------|
| **Copilot (IDE 자동완성)** | 코드 자동완성, 함수 시그니처 제안 | 코딩 중 항상 |
| **Copilot Chat (IDE)** | 코드 설명, 리팩토링, 단위 테스트 초안 | 작업 중 질의 |
| **Copilot CLI** | 터미널 명령 생성, 코드 리뷰, 리포 탐색 | CLI 작업·리뷰 |
| **Copilot for PR** | PR 설명 자동생성, 코드 리뷰 코멘트 | PR 생성·리뷰 시 |
| **Copilot Coding Agent** | 이슈 기반 코드 자동 구현·PR 생성 | 명확한 스펙 이슈 처리 |
| **Copilot Instructions** | 팀 컨텍스트 제공, 코딩 컨벤션 전달 | 항상 (파일로 관리) |

### 2.2 이 프로젝트(xv3_mcp)에서의 활용 예시

```
# Copilot CLI — 현재 브랜치의 변경사항 리뷰
gh copilot suggest "현재 변경사항에서 SQL Injection 위험 요소 찾아줘"

# Copilot Chat — 새 도구 추가 시
"tools/get.js 패턴을 참고해서 xv3_issue.issue_log 조회 함수 추가해줘"

# Copilot Coding Agent — 이슈 위임
Issue에 상세 스펙 작성 → Copilot에게 할당 → PR 자동 생성
```

---

## 3. 팀 역할 재정의

기존의 "모두가 코드를 작성한다" 에서 역할을 분화한다.

### 3.1 역할 분류

```
┌─────────────────────────────────────────────────────┐
│                    팀 구성원 역할                      │
├──────────────────┬──────────────────────────────────┤
│  AI 조율자       │ 이슈 스펙 작성, Agent 위임,        │
│  (Tech Lead)     │ 아키텍처 결정, 최종 승인           │
├──────────────────┼──────────────────────────────────┤
│  AI 협업 개발자  │ Copilot과 페어 프로그래밍,         │
│                  │ AI 제안 코드 검증·수정             │
├──────────────────┼──────────────────────────────────┤
│  AI 리뷰어       │ 보안·성능·아키텍처 관점 리뷰,      │
│                  │ Copilot 리뷰 결과 검증             │
└──────────────────┴──────────────────────────────────┘
```

### 3.2 "AI 조율자"가 집중해야 할 일

- **이슈 스펙의 품질** — Copilot이 올바르게 구현하려면 이슈가 구체적이어야 함
- **아키텍처 가드레일** — AI가 만든 코드가 기존 설계를 벗어나지 않도록 관리
- **Copilot Instructions 유지** — `.github/copilot-instructions.md` 최신화
- **AI 생성 코드 비율 추적** — 품질 지표 모니터링

---

## 4. 워크플로우 전환

### 4.1 기존 vs 전환 후 플로우

```
【기존 플로우】
이슈 등록 → 담당자 배정 → 코드 작성(수시간~수일) → PR → 리뷰 → 머지

【전환 후 플로우 A: Copilot Coding Agent 위임】
이슈 등록(구체적 스펙) → Copilot Agent 할당 → PR 자동 생성(수분~수십분)
→ 리뷰(아키텍처·보안 집중) → 수정 요청 또는 머지

【전환 후 플로우 B: IDE 협업 개발】
이슈 등록 → 개발자 + Copilot 페어 프로그래밍 → PR
→ Copilot PR 요약 자동생성 → 리뷰 → 머지
```

### 4.2 이슈 작성 기준 — Copilot이 실행할 수 있는 이슈

Copilot Coding Agent에게 위임하려면 이슈가 **실행 가능한 스펙**이어야 한다.

**나쁜 이슈 예시:**
```
제목: xv3_issue 조회 기능 추가
내용: xv3_issue 테이블에서 이벤트 조회하는 기능 만들어주세요
```

**좋은 이슈 예시 (이 프로젝트 기준):**
```markdown
## 목표
xv3_issue DB의 issue_log 테이블에서 이벤트를 조회하는 MCP 도구 추가

## 구현 위치
- tools/issue.js (새 파일 생성)
- index.js에 도구 등록

## 구현 스펙
### 함수: listEvents(args)
- DB: xv3_issue.issue_log
- 파라미터: device_id(optional), severity(optional), issue_type(optional),
            start_date(optional), end_date(optional), active_only(optional), limit(default:100)
- JOIN: xv3.device_info(device_name, device_ip), xv3.issue_type(issue_name), xv3.issue_severity(severity_name)
- 반환: tools/get.js의 listIssues()와 동일 응답 구조

## 참고 패턴
- tools/get.js의 listIssues() 함수 구조를 그대로 따를 것
- 응답은 index.js의 ok() 헬퍼를 통해 { count, items } 형태로 반환
- 에러는 err() 헬퍼를 통해 isError: true 형태로 반환

## 완료 조건
- [ ] tools/issue.js 파일 생성
- [ ] index.js에 'list_events' 도구 등록
- [ ] 기존 도구와 동일한 응답 형태 검증
```

---

## 5. 브랜칭 전략

### 5.1 브랜치 명명 규칙 (AI 작업 추적 포함)

```
feature/ISSUE-{번호}-{기능명}          # 사람이 직접 구현
copilot/ISSUE-{번호}-{기능명}          # Copilot Agent가 생성한 브랜치
fix/ISSUE-{번호}-{버그명}
refactor/{모듈명}-{내용}
```

### 5.2 브랜치 전략 다이어그램

```
main
 ├── develop
 │    ├── feature/ISSUE-42-close-issue-xv3   ← 개발자 직접
 │    ├── copilot/ISSUE-45-list-events       ← Copilot Agent
 │    └── fix/ISSUE-48-port-default-3334
 └── release/v1.x
```

### 5.3 머지 기준

| 브랜치 출처 | 필수 리뷰어 수 | 추가 체크 |
|------------|------------|---------|
| 개발자 직접 작성 | 1명 | 일반 리뷰 |
| Copilot Agent 생성 | **2명** | 보안·논리 검증 강화 |
| 핵심 모듈 변경 | **2명** | 아키텍처 검토 |

---

## 6. PR 워크플로우

### 6.1 PR 템플릿 (`.github/PULL_REQUEST_TEMPLATE.md`)

```markdown
## 변경 개요
<!-- Copilot PR 요약 버튼 클릭 또는 직접 작성 -->

## 관련 이슈
Closes #

## 구현 방식
- [ ] 직접 구현
- [ ] Copilot 제안 수용
- [ ] Copilot Agent 자동 생성 (전체)
- [ ] Copilot Agent 자동 생성 후 수동 수정

## 리뷰 포인트
<!-- 리뷰어가 집중해야 할 부분 -->

## 테스트
- [ ] 로컬 실행 확인
- [ ] 기존 도구 동작 이상 없음 확인

## AI 생성 코드 검증 체크리스트 (Copilot Agent PR 필수)
- [ ] SQL 쿼리 parameterized 확인
- [ ] 필수 파라미터 검증 로직 확인
- [ ] 기존 응답 형태(ok/err 헬퍼) 준수 확인
- [ ] 하드코딩된 값 없음 확인
- [ ] 민감 정보(패스워드, 커뮤니티 문자열) 응답 제외 확인
```

### 6.2 Copilot PR 리뷰 활용 방법

1. PR 생성 후 Copilot PR 요약 자동 생성 → **Description에 붙여넣기**
2. GitHub PR 페이지에서 `Copilot → Review` 실행 → AI 1차 리뷰 수행
3. 사람 리뷰어는 AI 리뷰 결과를 먼저 확인 후, **아키텍처·보안·비즈니스 로직**에 집중

---

## 7. Copilot Instructions 관리 전략

`.github/copilot-instructions.md`는 팀의 **AI와의 계약서**다.

### 7.1 관리 원칙

- **변경 시 PR 필수** — instructions 파일은 반드시 PR 리뷰를 거쳐 변경
- **버전 명시** — 파일 상단에 `Last updated` 날짜와 변경 이유 기록
- **검증 책임** — instructions 변경 후 Copilot Chat으로 의도대로 동작하는지 검증

### 7.2 이 프로젝트에 반드시 포함할 내용

```markdown
# 이 프로젝트의 핵심 컨벤션 (반드시 지켜야 할 것들)

1. 모든 도구 함수는 ok()/err() 헬퍼를 통해 응답 반환
2. 배열 응답은 { count: N, items: [...] } 형태
3. 쓰기 함수: create_id/modify_id는 'mcp'로 고정
4. 상태 코드: device.status (UP=1/DOWN=0), interface.status (UP=1/DOWN=2)
5. 민감 정보(ro_community, 패스워드)는 SELECT 절에서 제외
6. 모든 SQL은 parameterized query 사용
7. 도구 추가 시 index.js(스키마)와 TOOLS.md 동시 업데이트
```

### 7.3 분기별 Instructions 리뷰

- 분기 1회 팀 전체가 instructions 파일 리뷰
- 새로운 패턴/컨벤션 발견 시 즉시 추가
- 더 이상 유효하지 않은 내용 제거

---

## 8. 코드 리뷰 기준 전환

### 8.1 AI 시대 리뷰어의 역할 변화

```
【기존 리뷰 포인트】          【전환 후 리뷰 포인트】
✓ 문법 오류               → Copilot이 처리 (IDE)
✓ 명명 컨벤션             → Copilot이 처리 (instructions 기반)
✓ 기본 보안 패턴          → Copilot PR Review가 1차 처리
─────────────────────────────────────────────────────
✓ 아키텍처 일관성         ← 사람 리뷰어 집중 영역
✓ 비즈니스 로직 정확성    ← 사람 리뷰어 집중 영역
✓ DB 쿼리 성능            ← 사람 리뷰어 집중 영역
✓ AI 환각(Hallucination)  ← 사람 리뷰어 집중 영역 (신규)
✓ 존재하지 않는 컬럼/테이블 참조 ← 신규 확인 항목
```

### 8.2 AI 생성 코드 전용 리뷰 체크리스트

```markdown
## AI 코드 리뷰 체크리스트

### 정확성 검증
- [ ] 존재하지 않는 테이블/컬럼을 참조하지 않는가?
- [ ] JOIN 조건이 의도한 관계를 정확히 표현하는가?
- [ ] NULL 처리가 실제 데이터 특성에 맞게 되어 있는가?
- [ ] 에러 메시지가 실제 존재하는 필드명을 사용하는가?

### 보안 검증
- [ ] 모든 사용자 입력이 parameterized query로 처리되는가?
- [ ] 민감 정보(패스워드, 커뮤니티 문자열)가 응답에 포함되지 않는가?
- [ ] SQL에 동적 테이블명/컬럼명이 사용되었다면 화이트리스트 검증이 있는가?

### 패턴 준수
- [ ] 기존 코드베이스의 응답 형태와 일치하는가?
- [ ] 에러 처리 방식이 기존 도구들과 동일한가?
- [ ] TOOLS.md가 함께 업데이트되었는가?
```

---

## 9. 단계적 도입 로드맵

### Phase 1 — 기반 구축 (1~2주)

**목표**: 팀 전체가 Copilot을 일상적으로 사용하는 환경 조성

```
□ 팀원 전원 GitHub Copilot 라이선스 활성화
□ VS Code / JetBrains Copilot 플러그인 설치 및 설정
□ .github/copilot-instructions.md 팀 리뷰 및 보완
□ PR 템플릿 (.github/PULL_REQUEST_TEMPLATE.md) 추가
□ Issue 템플릿 (.github/ISSUE_TEMPLATE/) 추가
□ 팀 내 Copilot 기본 사용법 세션 진행 (2시간)
```

### Phase 2 — 협업 습관 형성 (3~4주)

**목표**: Copilot을 포함한 개발 루틴 정착

```
□ 모든 새 기능은 Copilot과 페어 프로그래밍으로 진행
□ PR 생성 시 Copilot PR 요약 필수 사용
□ 코드 리뷰 시 Copilot Review 1차 실행 후 사람 리뷰
□ 주 1회 "Copilot으로 해결한 것 공유" 세션 (15분)
□ 잘 작성된 이슈 vs 부실한 이슈 사례 팀 공유
```

### Phase 3 — Agent 위임 도입 (5~8주)

**목표**: 반복적·명확한 작업은 Copilot Coding Agent에 위임

```
□ Copilot Coding Agent 사용 가이드라인 수립
□ "Agent 위임 가능 이슈" 레이블 생성 및 운영
□ Agent 생성 PR 리뷰 프로세스 정착
□ Agent 위임 작업 비율 추적 시작
□ 성공/실패 사례 회고 및 이슈 템플릿 개선
```

### Phase 4 — 최적화 및 확산 (9~12주)

**목표**: 팀만의 Copilot 활용 패턴 확립 및 생산성 측정

```
□ 생산성 지표 측정 및 Before/After 비교
□ 팀 내 Best Practice 문서화
□ 다른 팀/프로젝트에 경험 공유
□ Copilot Instructions 고도화 (프로젝트 성장에 맞게)
□ 새로운 Copilot 기능 도입 검토 (Workspaces 등)
```

---

## 10. 생산성 측정 지표

### 10.1 추적할 지표

| 지표 | 측정 방법 | 목표 |
|------|-----------|------|
| PR 생성까지 소요 시간 | GitHub Insights | 30% 단축 |
| 리뷰 사이클 수 | PR 코멘트 횟수 | 20% 감소 |
| Agent 위임 비율 | copilot/ 브랜치 비율 | 전체 PR의 30%+ |
| 버그 발생률 | 핫픽스 PR 수 | 현상 유지 또는 감소 |
| 온보딩 시간 | 첫 PR까지 소요일 | 50% 단축 |

### 10.2 월간 회고 질문

```
1. 이번 달 Copilot 덕분에 가장 많이 절약된 작업은?
2. Copilot이 잘못된 코드를 만들어낸 사례가 있었는가?
3. Instructions 파일에 추가/수정할 내용이 있는가?
4. Agent에 위임했을 때 성공한 이슈의 공통점은?
5. 다음 달에 새로 시도해볼 Copilot 활용 방법은?
```

---

## 11. 이 프로젝트(xv3_mcp)에 즉시 적용할 항목

### 11.1 리포 구조 변경 사항

```
xv3_mcp/
├── .github/
│   ├── copilot-instructions.md     ✅ 이미 존재 (내용 보강 필요)
│   ├── PULL_REQUEST_TEMPLATE.md    🔲 추가 필요
│   └── ISSUE_TEMPLATE/
│       ├── feature_request.md      🔲 추가 필요
│       ├── bug_report.md           🔲 추가 필요
│       └── copilot_task.md         🔲 추가 필요 (Agent 위임용)
├── docs/
│   └── copilot-team-guide.md       ✅ 이 파일
└── ...
```

### 11.2 현재 발견된 이슈 → Agent 위임 후보

코드 리뷰에서 발견된 아래 항목들은 스펙이 명확하므로 Copilot Agent 위임에 적합하다.

| 이슈 | Agent 위임 적합도 | 이유 |
|------|-----------------|------|
| 포트 기본값 3333→3334 수정 | ⭐⭐⭐ 매우 적합 | 1줄 수정, 명확 |
| `'use strict'` 추가 (get.js, set.js) | ⭐⭐⭐ 매우 적합 | 기계적 작업 |
| `n` 파라미터 `Number(n)` 래핑 | ⭐⭐⭐ 매우 적합 | 기계적 작업 |
| self-loop 방지 검증 추가 | ⭐⭐ 적합 | 로직 단순 |
| 장비 존재 검증 순서 수정 | ⭐⭐ 적합 | 패턴 명확 |
| 트랜잭션 도입 | ⭐ 부적합 | 아키텍처 결정 필요 |
| HTTP 인증 추가 | ⭐ 부적합 | 설계 결정 필요 |

### 11.3 첫 번째 팀 Sprint 제안

```
Sprint 목표: Copilot 협업 체계 구축 + 코드 리뷰 발견 이슈 처리

Week 1:
  [Agent 위임] 포트 기본값·use strict·Number(n) 수정 이슈 생성 및 Agent 할당
  [직접 작업] PR 템플릿·이슈 템플릿 추가
  [팀 작업] copilot-instructions.md 보강 (상태 코드 gotcha 등)

Week 2:
  [페어 프로그래밍] self-loop 방지·장비존재 검증 수정
  [회고] Agent PR 리뷰 경험 공유, 이슈 템플릿 개선
```

---

## 12. 참고 자료

- [GitHub Copilot 공식 문서](https://docs.github.com/copilot)
- [Copilot Coding Agent](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-coding-agent)
- [Copilot Instructions 가이드](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Copilot for Pull Requests](https://docs.github.com/en/copilot/using-github-copilot/creating-a-pull-request-summary-with-github-copilot)
- 이 프로젝트 관련: `.github/copilot-instructions.md`, `CLAUDE.md`, `TOOLS.md`

---

*이 문서는 팀의 경험이 쌓이면서 지속적으로 업데이트되어야 합니다.*  
*마지막 업데이트: 2026-05-13*
