---
name: Copilot Agent 작업 위임
about: Copilot Coding Agent에게 구현을 위임할 명확한 스펙 이슈
title: 'copilot: '
labels: copilot-task
assignees: ''
---

> **이 이슈는 Copilot Coding Agent에게 할당됩니다.**
> 스펙이 구체적일수록 Agent가 정확하게 구현합니다.

## 목표
<!-- Agent가 수행해야 할 작업을 한 문장으로 -->

## 구현 위치 (변경 파일 목록)
- `tools/__.js`
- `index.js`
- `TOOLS.md`

## 상세 스펙

### 함수 시그니처
```js
async function funcName({ param1, param2, limit = 100 } = {}) { ... }
```

### 파라미터 설명
| 파라미터 | 필수 | 타입 | 설명 |
|---------|------|------|------|
|  |  |  |  |

### SQL / 비즈니스 로직
```sql
-- 사용할 테이블, JOIN 조건, WHERE 조건을 명시
```

### 따라야 할 기존 패턴
```
tools/get.js의 listIssues() 함수 구조를 그대로 따를 것
```

### 지켜야 할 컨벤션 (반드시 확인)
- [ ] 모든 응답은 `ok()` / `err()` 헬퍼 사용
- [ ] 배열 응답은 `{ count: N, items: [...] }` 형태
- [ ] 모든 SQL은 parameterized query (`?` 바인딩)
- [ ] 민감 정보(`ro_community`, 패스워드)는 SELECT 제외
- [ ] 쓰기 함수: `create_id` / `modify_id` = `'mcp'`
- [ ] `index.js` 도구 등록 및 `TOOLS.md` 동시 업데이트

## 완료 조건
- [ ] 구현 함수 정상 동작
- [ ] `index.js` 도구 등록
- [ ] `TOOLS.md` 항목 추가
- [ ] 기존 도구 동작 이상 없음
