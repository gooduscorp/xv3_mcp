---
name: 기능 요청 (Feature Request)
about: 새로운 도구 또는 기능 추가 제안
title: 'feat: '
labels: enhancement
assignees: ''
---

## 목표
<!-- 이 기능이 해결하는 문제 또는 추가 이유를 한 문장으로 작성하세요 -->

## 구현 위치
<!-- 변경이 필요한 파일 목록 -->
- [ ] `tools/get.js` / `tools/set.js` / `tools/perf.js` / `tools/issue.js`
- [ ] `index.js` (도구 등록)
- [ ] `TOOLS.md` (문서 업데이트)

## 구현 스펙

### 함수명
```
예: listXxxYyy({ param1, param2, limit = 100 })
```

### 파라미터
| 파라미터 | 필수 | 타입 | 설명 |
|---------|------|------|------|
|  |  |  |  |

### 쿼리 대상 테이블
```
예: xv3.device_info, xv3_issue.issue_log
```

### 응답 형태
```json
{ "count": 1, "items": [ ... ] }
```

## 참고 패턴
<!-- 비슷한 기존 함수/도구 이름 -->
예: `tools/get.js`의 `listDevices()` 패턴과 동일

## 완료 조건
- [ ] 함수 구현
- [ ] `index.js` 도구 등록
- [ ] `TOOLS.md` 업데이트
- [ ] 기존 도구 동작에 영향 없음 확인
