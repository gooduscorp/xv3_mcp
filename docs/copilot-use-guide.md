# GitHub Copilot Business 팀 업무 활용 방법서

**문서 버전:** v1.0  
**배포일:** 2026년 5월  
**작성팀:** IT서비스 개발팀  
**적용 대상:** 팀원 전원

---

> **이 문서는 무엇인가요?**
> GitHub Copilot Business를 우리 팀 업무에 어떻게 활용할지 정리한 실용 가이드입니다.
> 기능 소개가 아닌 **"어떻게 쓸 것인가"** 에 집중합니다.
> 처음 도입하는 팀원은 1장부터, 이미 사용 중인 팀원은 필요한 챕터만 참고하세요.

---

## 1장. 시작 전에 알아야 할 것

### 1.1 Copilot은 이런 도구입니다

Copilot은 코드를 대신 작성해 주는 도구가 아닙니다. **내가 작성할 코드의 반복적인 부분을 빠르게 처리해 주는 증폭기**입니다.

- ✅ 잘 하는 것: 반복 패턴, 보일러플레이트, 테스트 코드, 문서화, 디버깅 실마리 제공
- ⚠️ 주의가 필요한 것: 도메인 특화 로직, 보안 코드, 최신 라이브러리 API
- ❌ 하면 안 되는 것: 이해 없이 제안 코드 그대로 수락, 보안/인증 코드 무검증 적용

### 1.2 팀 공통 원칙 (반드시 숙지)

```
1. Copilot 제안을 이해하지 못하면 수락하지 않는다
2. Copilot이 생성한 코드도 동일한 코드 리뷰 기준을 적용한다
3. 유용한 프롬프트 패턴은 팀 Wiki에 서비스별로 공유한다
4. Custom Instructions는 팀 합의 없이 단독으로 수정하지 않는다
5. 보안·인증 관련 코드는 반드시 별도 검토를 거친다
```

### 1.3 서비스별 기대 효과 미리 알기

서비스 유형에 따라 Copilot의 효과가 다릅니다. 무조건 믿지도, 무조건 의심하지도 마세요.

| 서비스 | 잘 되는 영역 | 주의할 영역 |
|---|---|---|
| NMS / 모니터링 | API 핸들러, 에러 처리 패턴 | SNMP 처리, 장비 프로토콜 특화 로직 |
| 웹 포털 | React 컴포넌트, API 연동 코드 | 복잡한 상태 관리 로직 |
| 데이터 파이프라인 | 데이터 전처리, 변환 스크립트 | 파이프라인 설계 의사결정 |
| 자산 관리 | CRUD 핸들러, DB 모델 코드 | 보증·EOS 계산 비즈니스 로직 |
| AI 서비스 | 기반 Python 코드 구조 | 최신 ML 라이브러리 API (오제안 多) |
| 인프라 자동화 | YAML, Shell 스크립트 | 환경 의존적인 배포 설정 |

---

## 2장. 환경 설정

### 2.1 IDE 플러그인 설치

**VS Code**
1. Extensions에서 `GitHub Copilot` 검색 후 설치
2. `GitHub Copilot Chat` 도 함께 설치
3. GitHub 계정으로 로그인 (조직 계정 사용)

**JetBrains (IntelliJ, GoLand 등)**
1. Settings → Plugins → `GitHub Copilot` 검색 후 설치
2. Tools → GitHub Copilot → Login to GitHub

**확인 방법:** 에디터 하단 상태바에 Copilot 아이콘이 활성화되면 정상

### 2.2 Copilot CLI 확인 (인프라 담당 필수, 그 외 선택)

현재 설치된 `gh` CLI는 `gh copilot`이 별도 확장 설치 없이 내장 명령어로 포함된 최신 버전입니다. 이 버전의 `gh copilot`은 구버전의 `suggest` / `explain` 서브커맨드 방식이 아닌, **에이전트 모드 기반**으로 동작합니다.

```bash
# 정상 동작 확인
gh copilot --help

# 인터랙티브 모드 진입 (대화형 에이전트 세션 시작)
gh copilot -i

# 비인터랙티브 모드 (단발성 프롬프트 실행 후 종료)
gh copilot -p "도커 컨테이너 로그 실시간 확인하는 명령어 알려줘"
```

### 2.3 Custom Instructions 확인

각 서비스 저장소에는 `.github/copilot-instructions.md` 파일이 있습니다.
작업 전 해당 파일을 한 번 읽고 시작하세요. 수정이 필요하면 팀장에게 제안하세요.

```
📁 저장소별 Custom Instructions 위치
  nms-xv3/               → .github/copilot-instructions.md
  it-portal/             → .github/copilot-instructions.md
  data-pipeline/         → .github/copilot-instructions.md
  asset-mgmt/            → .github/copilot-instructions.md
  ai-service/            → .github/copilot-instructions.md
  infra-automation/      → .github/copilot-instructions.md
```

---

## 3장. 일상 업무 활용법

### 3.1 인라인 제안 잘 활용하는 법

코드를 작성하다 보면 Copilot이 회색 글자로 제안을 표시합니다.

| 동작 | 단축키 (VS Code) |
|---|---|
| 제안 수락 | `Tab` |
| 제안 거절 | `Esc` |
| 다음 제안 보기 | `Alt + ]` |
| 이전 제안 보기 | `Alt + [` |
| 단어 단위 수락 | `Ctrl + →` |

**제안 품질을 높이는 팁**

```
❌ 나쁜 예: 함수 이름만 쓰고 제안 기다리기
  func h(w http.ResponseWriter, r *http.Request) {

✅ 좋은 예: 의도를 주석으로 먼저 명확히 쓰기
  // GET /devices/:id - 장비 ID로 장비 상세 정보 조회, 없으면 404 반환
  func GetDeviceByID(w http.ResponseWriter, r *http.Request) {
```

**컨텍스트 관리 (중요)**
- 지금 작업과 관련된 파일만 에디터 탭에 열어두세요
- 관련 없는 파일이 많을수록 제안 품질이 떨어집니다
- 멀티 서비스 작업 시 서비스별로 VS Code 워크스페이스를 분리하면 효과적입니다

---

### 3.2 Copilot Chat 활용법

Chat은 Copilot의 핵심입니다. IDE 사이드바 또는 `Ctrl + Alt + I`로 열 수 있습니다.

#### 자주 쓰는 프롬프트 패턴

**코드 설명 요청**
```
이 함수가 하는 일을 단계별로 설명해줘
이 코드에서 side effect가 발생할 수 있는 부분이 있어?
```

**디버깅**
```
[에러 로그 전체 붙여넣기]
이 에러의 원인과 해결 방법을 단계별로 설명해줘
```

**테스트 코드 생성**
```
이 함수의 단위 테스트를 경계값과 에러 케이스 포함해서 작성해줘
```

**보안 점검**
```
이 코드에서 SQL injection 또는 입력값 검증 누락 가능성이 있어?
인증/인가 처리에 문제가 있는 부분이 있어?
```

**리팩토링**
```
이 함수를 [팀 코딩 컨벤션]에 맞게 리팩토링해줘
중복 코드를 제거하고 가독성을 높여줘
```

**서비스별 특화 프롬프트 예시**

| 서비스 | 유용한 프롬프트 예시 |
|---|---|
| NMS | "이 SNMP 응답 구조를 파싱해서 DeviceStatus 모델에 매핑해줘" |
| 웹 포털 | "이 컴포넌트를 Custom Hook으로 분리하고 재사용 가능하게 만들어줘" |
| 데이터 파이프라인 | "이 입력 DataFrame을 받아서 [조건]으로 변환하는 함수 작성해줘. 입력 예시: [예시]" |
| 자산 관리 | "warranty_master 테이블 구조 기반으로 UPSERT 로직 작성해줘" |
| AI 서비스 | "이 텍스트 청크 리스트를 nomic-embed-text 형식에 맞게 배치 임베딩 처리해줘" |
| 인프라 | "이 GitHub Actions 워크플로우에 docker build 후 registry push 스텝 추가해줘" |

#### Chat에서 코드 범위 지정하기
코드를 **드래그하여 선택한 뒤 Chat을 열면** 해당 코드에 대한 질문임을 자동으로 인식합니다. 전체 파일보다 범위를 좁혀 질문할수록 정확한 답변이 옵니다.

---

### 3.3 Copilot Edits 활용법 (다중 파일 수정)

여러 파일을 동시에 수정해야 할 때 사용합니다. `Ctrl + Shift + I`로 Edits 모드를 엽니다.

**언제 쓰나요?**
- 공통 모듈 인터페이스 변경 시 연관 파일 일괄 수정
- 필드명·타입 변경을 모델/핸들러/테스트 파일에 동시 적용
- 에러 처리 패턴을 여러 파일에 일관되게 적용

**사용 절차**
1. Edits 패널에서 수정할 파일들을 추가 (Add Files)
2. 수정 의도를 자연어로 명확하게 입력
3. 제안된 diff를 파일별로 검토
4. 수락(Accept) 또는 부분 수정 후 적용

```
프롬프트 예시:
"warranty_end 필드를 API 응답에서 제거하고, D-day 계산 로직을
repository 레이어에서 service 레이어로 이동시켜줘.
영향받는 모델, 핸들러, 테스트 파일 모두 반영해줘."
```

---

### 3.4 Agent Mode 활용법 (자율 작업)

비교적 독립적인 기능 단위 구현에 활용합니다. 복잡하거나 다른 서비스와 연동이 많은 작업에는 사용을 자제하세요.

**적합한 작업 유형**
- 단순 CRUD API 엔드포인트 신규 생성
- 새 테이블 모델 및 마이그레이션 코드 생성
- 단독 유틸리티 함수 및 테스트 코드 일괄 생성
- React 단순 폼 컴포넌트 생성

**사용 시 주의사항**
- Agent가 파일을 생성·수정하기 전에 반드시 계획(Plan)을 먼저 확인
- 터미널 명령 실행 제안이 나오면 내용을 확인 후 직접 실행 여부 결정
- 생성된 코드는 반드시 직접 검토 후 커밋

---

### 3.5 Copilot CLI 활용법 (인프라/스크립트)

터미널 작업이 많은 경우 유용합니다. 현재 버전은 에이전트 기반으로 동작하며, 인터랙티브 세션과 단발성 실행 두 가지 모드를 제공합니다.

#### 모드 구분

| 모드 | 플래그 | 용도 |
|---|---|---|
| 인터랙티브 | `-i` | 대화를 이어가며 복잡한 작업 처리 |
| 비인터랙티브 | `-p "프롬프트"` | 단발성 질의, 스크립트/CI 자동화 |

#### 인터랙티브 모드 (`-i`)

```bash
# 에이전트 세션 진입
gh copilot -i

# 세션 진입 후 자연어로 작업 지시
> nginx 설정 파일 문법 검사하고 reload 해줘
> 이 awk 명령어가 무슨 뜻인지 설명해줘: awk -F: '{print $1}' /etc/passwd
> feature 브랜치를 main에 squash merge하는 방법 알려줘
```

세션 내에서 사용 가능한 주요 슬래시 커맨드:

| 슬래시 커맨드 | 기능 |
|---|---|
| `/model` | 사용할 LLM 모델 변경 |
| `/undo` | 직전 작업 및 파일 변경 롤백 |
| `/new` | 이전 세션을 유지한 채 새 세션 시작 |
| `/clear` | 현재 세션 초기화 |
| `/cd <경로>` | 작업 디렉터리 변경 |
| `/tasks` | 백그라운드 작업 목록 확인 |

#### 비인터랙티브 모드 (`-p`)

```bash
# 단발성 질의 (결과 출력 후 즉시 종료)
gh copilot -p "docker compose로 특정 서비스만 재시작하는 명령어"
gh copilot -p "GitHub Actions에서 특정 job이 실패했을 때 Slack 알림 보내는 step 작성해줘"

# CI/CD 파이프라인에서 자동화 용도로 활용 가능
gh copilot -p "현재 디렉터리의 Go 파일에서 미사용 import 제거하는 명령어"
```

#### 이전 세션 이어서 작업

```bash
# 가장 최근 세션 이어서 시작
gh copilot -i --continue

# 특정 세션 ID로 재개
gh copilot -i --resume <SESSION_ID>
```

---

## 4장. PR 기반 협업 절차

### 4.1 전체 흐름

```
① Issue 생성
   └─ 제목: [서비스명] 작업 내용 (예: [asset-mgmt] 보증 만료 알림 API 추가)
   └─ 내용: 요구사항, 완료 기준, 관련 테이블/API 명시

② 작업 유형 판단
   └─ 단순/반복 작업 → Copilot Cloud Agent에 이슈 할당
   └─ 도메인 로직 포함 → 담당자 직접 개발 + Copilot 보조

③ 개발
   └─ Feature Branch 생성 (규칙: feature/이슈번호-작업명)
   └─ 서비스 저장소 Custom Instructions 기반 Copilot 활용
   └─ 커밋 메시지: Copilot Chat "이 변경사항에 맞는 커밋 메시지 작성해줘"

④ PR 생성
   └─ Copilot이 PR 요약 자동 생성 → 내용 확인 후 보완
   └─ 체크리스트 작성 (아래 4.2 참고)

⑤ 리뷰
   └─ Copilot Code Review 자동 실행 (1차)
   └─ 팀원 리뷰 요청 (2차, 최종 승인)

⑥ 머지 후
   └─ Issue 클로즈
   └─ 유용했던 프롬프트 패턴은 팀 Wiki에 등록
```

### 4.2 PR 체크리스트 (템플릿)

PR 생성 시 아래 항목을 Description에 포함하세요.

```markdown
## 변경 요약
<!-- Copilot 자동 생성 요약을 기반으로 보완 -->

## 변경 유형
- [ ] 신규 기능
- [ ] 버그 수정
- [ ] 리팩토링
- [ ] 인프라/설정 변경

## Copilot 활용 내역
- [ ] 인라인 제안 활용
- [ ] Chat으로 로직 검토
- [ ] 테스트 코드 자동 생성
- [ ] Copilot Code Review 1차 완료

## 검토 필요 항목
<!-- 리뷰어가 집중해야 할 부분 명시 -->

## 테스트 확인
- [ ] 단위 테스트 통과
- [ ] 로컬 환경 동작 확인
- [ ] 엣지 케이스 확인
```

---

## 5장. 서비스별 활용 가이드

### 5.1 NMS / 모니터링 서비스 (Go)

**Copilot 적극 활용 영역**
- REST API 라우터 및 핸들러 구조 생성
- Go 표준 에러 핸들링 패턴 (`if err != nil` 블록)
- Context 기반 타임아웃 처리
- 응답 DTO 구조체 생성

**직접 작성 권장 영역**
- SNMP OID 매핑 및 장비 프로토콜 처리 로직
- 성능 수집 알고리즘 (임계값 판단, 이상 탐지)
- 장비 상태 판단 비즈니스 로직

**주요 Custom Instructions 요약**
```
- Go 표준 에러 핸들링 패턴 준수
- DB 모델(Entity)과 API 응답(DTO) 명확히 분리
- 모든 DB 조회에 Context + 타임아웃 처리
- HTTP 핸들러는 얇게, 비즈니스 로직은 서비스 레이어로
```

---

### 5.2 웹 포털 (React / Node.js)

**Copilot 적극 활용 영역**
- 함수형 컴포넌트 + Hooks 기반 UI 구조 생성
- REST API 연동 코드 (fetch, axios + 타입 정의)
- 폼 컴포넌트, 테이블 컴포넌트 반복 구조

**직접 작성 권장 영역**
- 멀티테넌트 권한 처리 로직
- 복잡한 전역 상태 설계

**주요 Custom Instructions 요약**
```
- 함수형 컴포넌트 + Hooks만 사용 (클래스 컴포넌트 금지)
- PropTypes 또는 TypeScript 타입 명시 필수
- CSS Module 방식 적용
- API 호출은 별도 service 파일로 분리
```

---

### 5.3 데이터 파이프라인 (Python)

**Copilot 적극 활용 영역**
- 데이터 전처리·변환 스크립트
- Pandas/Polars 데이터 처리 코드
- Telegraf/InfluxDB 설정 및 쿼리

**직접 작성 권장 영역**
- 파이프라인 아키텍처 설계 의사결정
- 대용량 처리 최적화 로직

**프롬프트 팁**
```
입출력 예시를 함께 제공할수록 정확도가 높아집니다.

예:
"이 함수를 작성해줘.
 입력: [{'device_id': '001', 'cpu': 85.2, 'ts': '2026-05-01'}]
 출력: device_id별 cpu 평균을 DataFrame으로 반환"
```

**주요 Custom Instructions 요약**
```
- type hint 필수 작성
- Pydantic 모델로 데이터 검증
- 비동기 처리 우선 고려
- 환경변수는 os.environ 또는 dotenv 사용
```

---

### 5.4 자산 관리 시스템 (Go)

**Copilot 적극 활용 영역**
- CRUD API 핸들러 및 DB 모델 생성
- UPSERT 쿼리 (`warranty_master` 등)
- 목록 조회 + 필터링 API 패턴

**직접 작성 권장 영역**
- 보증 만료 D-day 계산 로직 (API 레이어에서 처리)
- EOS/EOL 판단 비즈니스 로직
- 이력 관리 INSERT-only 패턴 설계

**주요 Custom Instructions 요약**
```
- warranty_end는 DB에 저장, D-day 계산은 API 레이어에서만 수행
- EOS/EOL 데이터는 INSERT-only (수정 금지, 이력 보존)
- 자산 등록·변경은 warranty_master UPSERT 패턴 사용
- 모든 D-day 계산은 쿼리 시점 기준으로 수행
```

---

### 5.5 AI 서비스 (Python / LLM / RAG)

**Copilot 적극 활용 영역**
- Python 기반 API 서버 구조 (FastAPI 등)
- 데이터 전처리 및 청크 분할 로직
- 프롬프트 템플릿 문자열 처리

**주의가 필요한 영역 (검증 필수)**
- LangChain, LlamaIndex 등 빠르게 변하는 라이브러리 API
  → 존재하지 않는 메서드 제안 사례 빈번 (약 12%)
  → 반드시 공식 문서와 대조 확인
- nomic-embed-text-v2-moe 임베딩 처리 → task prefix 필수 여부 직접 확인
- Ollama API 파라미터 → 버전별 차이 있으므로 제안 그대로 사용 금지

**주요 Custom Instructions 요약**
```
- LLM API 호출 시 num_ctx 파라미터 명시 (기본값 4096 부족할 수 있음)
- 임베딩 배치 처리 우선, 단건 루프 지양
- RAG 컨텍스트 길이 제한 명시
- 환경변수로 모델명·엔드포인트 주입
```

---

### 5.6 인프라 자동화 (Shell / YAML / GitHub Actions)

**Copilot 적극 활용 영역**
- GitHub Actions 워크플로우 작성
- Docker / Docker Compose 파일 구성
- Shell 스크립트, 배포 자동화
- Ansible Playbook 작성

**직접 작성 권장 영역**
- 환경별(dev/staging/prod) 배포 의사결정 분기 로직
- 시크릿·환경변수 설계

**주요 Custom Instructions 요약**
```
- 환경변수 하드코딩 절대 금지
- 시크릿은 반드시 GitHub Secrets 참조
- Docker 이미지 태그에 latest 사용 금지 (버전 명시)
- 스크립트 상단에 set -euo pipefail 적용
```

---

## 6장. 자주 하는 실수와 해결법

### 실수 1: 제안 코드를 검토 없이 수락

**증상:** 코드가 동작하긴 하는데 팀 컨벤션과 다르거나, 실제로는 존재하지 않는 함수를 호출함

**해결:**
- Tab을 누르기 전에 3초만 읽기
- 최신 라이브러리 관련 코드는 공식 문서와 대조
- 이해가 안 되면 Chat에 "이 코드가 무엇을 하는지 설명해줘" 먼저 질문

---

### 실수 2: 프롬프트가 너무 막연함

**증상:** Chat 답변이 일반적이고 팀 상황에 맞지 않음

**해결:**
```
❌ "이 API 작성해줘"
✅ "Go로 GET /api/v1/devices 엔드포인트를 작성해줘.
    쿼리 파라미터: site_id(필수), status(선택)
    응답: DeviceListResponse 구조체 배열
    에러 처리: 팀 표준 에러 응답 형식 사용"
```

---

### 실수 3: 여러 서비스 파일을 동시에 열어 작업

**증상:** NMS 코드 작업 중에 웹 포털 파일도 열려 있어 제안이 섞임

**해결:**
- VS Code 멀티 워크스페이스 활용하여 서비스별로 창 분리
- 작업 전 관련 없는 파일 탭 닫기

---

### 실수 4: AI 서비스 라이브러리 API 맹신

**증상:** LangChain, LlamaIndex 관련 제안 코드 실행 시 AttributeError 발생

**해결:**
- AI/ML 관련 라이브러리는 Chat 제안 후 반드시 공식 문서 확인
- 버전 명시 후 질문: "langchain 0.2.x 기준으로 작성해줘"

---

### 실수 5: Custom Instructions를 무시하고 작업

**증상:** 팀 컨벤션과 다른 패턴의 코드가 제안됨

**해결:**
- 저장소 `.github/copilot-instructions.md` 파일이 있는지 확인
- 없다면 팀장에게 생성 요청
- Instructions가 있어도 동작 안 하면 VS Code에서 Copilot 설정 재확인

---

## 7장. 팀 Wiki 관리 규칙

### 7.1 프롬프트 라이브러리 등록 기준

다음 조건을 만족하는 프롬프트는 팀 Wiki에 등록하세요.

- 같은 패턴을 2회 이상 사용했다
- 팀원이 공통으로 겪는 작업 유형이다
- 기존 Wiki에 없는 서비스·케이스다

**등록 형식**
```markdown
### [서비스명] 프롬프트 제목

**언제 사용:** (상황 설명)
**프롬프트:**
(실제 프롬프트 내용)
**결과 품질:** ⭐⭐⭐⭐ (5점 만점)
**주의사항:** (있을 경우)
```

### 7.2 Custom Instructions 변경 절차

1. 변경 필요 내용을 Slack 또는 팀 회의에서 제안
2. 팀원 과반 동의 확인
3. 저장소 `.github/copilot-instructions.md` PR로 수정
4. 변경 내용 팀 Wiki에 이력 기록

---

## 8장. 참고 자료

| 자료 | 링크 |
|---|---|
| GitHub Copilot 공식 문서 | https://docs.github.com/copilot |
| Copilot Chat 프롬프트 가이드 | https://docs.github.com/copilot/using-github-copilot/prompt-engineering-for-github-copilot |
| Custom Instructions 설정 방법 | https://docs.github.com/copilot/customizing-copilot/adding-repository-custom-instructions |
| Copilot CLI 가이드 | https://docs.github.com/copilot/github-copilot-in-the-cli |
| 팀 프롬프트 라이브러리 Wiki | (내부 Wiki 링크) |
| 서비스별 Custom Instructions | (각 저장소 .github/copilot-instructions.md) |

---

*문의 및 피드백: IT서비스 개발팀 Slack 채널 또는 팀장에게 직접 전달해 주세요.*
*본 문서는 팀 내부 활용을 위한 문서이며, 외부 배포를 금합니다.*