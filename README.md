# XV3 NMS MCP Server

XV3 NMS(Network Management System)의 MariaDB 데이터를 AI 클라이언트(Claude Desktop 등)에 노출하는 **MCP(Model Context Protocol) 서버**입니다.
네트워크 장비 조회, 이슈 확인, 성능 데이터 분석, 설정 변경 등 41개 도구를 자연어로 사용할 수 있습니다.

---

## 지원 도구 요약

| 유형 | 수 | 주요 기능 |
|------|----|-----------|
| 조회(GET) | 26 | 장비 목록/상세, 인터페이스, IP/MAC, 알람, 이슈, 토폴로지, 설정 백업 등 |
| 변경(SET) | 11 | 장비 설명·모니터링·비활성화, 그룹 CRUD, 토폴로지 링크, 이슈 종료 |
| 성능(PERF) | 4 | 수집 항목 목록, 장비/인터페이스 성능 시계열, Top-N 성능 순위 |

전체 도구 파라미터 및 응답 형식은 [TOOLS.md](./TOOLS.md)를 참조하세요.

---

## 빠른 시작

### 1. 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/gooduscorp/xv3_mcp.git
cd xv3_mcp
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 DB 접속 정보를 입력합니다:

```env
DB_HOST=192.168.1.100      # XV3 NMS DB 서버 IP
DB_USER=xv3_user
DB_PASSWORD=your_password
DB_NAME=xv3
DB_CONNECTION_LIMIT=10
DB_TIMEZONE=+09:00         # 서울 기준
```

---

## 사용 방법

### 방법 A — Claude Desktop (stdio 모드, 권장)

사용자 PC에 Node.js가 설치되어 있어야 합니다.

**Claude Desktop 설정 파일** (`claude_desktop_config.json`)에 아래를 추가합니다:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "xv3-nms": {
      "command": "node",
      "args": ["C:/path/to/xv3_mcp/index.js"],
      "env": {
        "DB_HOST": "192.168.1.100",
        "DB_USER": "xv3_user",
        "DB_PASSWORD": "your_password",
        "DB_NAME": "xv3",
        "DB_TIMEZONE": "+09:00"
      }
    }
  }
}
```

> `.env` 파일이 있으면 `env` 항목은 생략해도 됩니다. 단, `env`가 있으면 해당 값이 우선 적용됩니다.

Claude Desktop을 재시작하면 채팅창에서 바로 사용할 수 있습니다.

---

### 방법 B — HTTP 서버 모드 (중앙 배포)

사내 서버 한 대에 MCP 서버를 띄우고 여러 사용자가 공유하는 방식입니다.

```bash
# 서버 시작 (포트 3334)
node index.js --http 3334
# 또는
npm run start:http
```

서버가 정상 기동되면 헬스체크로 확인합니다:

```bash
curl http://localhost:3334/health
# {"status":"ok","server":"xv3-nms-mcp","sessions":0}
```

#### MCP 클라이언트 연결 설정 예시

HTTP 모드를 지원하는 MCP 클라이언트(Claude Desktop 1.x 이상 등)에서:

```json
{
  "mcpServers": {
    "xv3-nms": {
      "url": "http://서버IP:3334/mcp"
    }
  }
}
```

#### 방화벽 / 포트 개방

```bash
# Linux (firewalld)
firewall-cmd --permanent --add-port=3334/tcp && firewall-cmd --reload

# Linux (ufw)
ufw allow 3334/tcp
```

#### systemd로 서비스 등록 (Linux)

```ini
# /etc/systemd/system/xv3-mcp.service
[Unit]
Description=XV3 NMS MCP Server
After=network.target

[Service]
Type=simple
User=xv3
WorkingDirectory=/opt/xv3_mcp
ExecStart=/usr/bin/node index.js --http 3334
Restart=always
RestartSec=5
EnvironmentFile=/opt/xv3_mcp/.env

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now xv3-mcp
systemctl status xv3-mcp
```

#### PM2로 프로세스 관리 (Node.js 환경)

```bash
npm install -g pm2
pm2 start index.js --name xv3-mcp -- --http 3334
pm2 save
pm2 startup   # 부팅 시 자동 시작 설정
```

---

## 두 방식 비교

| 항목 | stdio (방법 A) | HTTP 서버 (방법 B) |
|------|---------------|-------------------|
| 설치 위치 | 사용자 PC 각각 | 서버 1대 |
| DB 접근 | 사용자 PC → DB 직접 | 서버 → DB |
| 업데이트 | PC마다 개별 | 서버 1회 |
| 다중 사용자 | 각자 독립 프로세스 | 세션 단위 공유 |
| 권장 대상 | 소규모 / 개인 사용 | 팀 전체 배포 |

---

## 사용 예시

Claude Desktop 채팅창에서 자연어로 질문하면 됩니다:

```
현재 DOWN 상태인 장비 목록 알려줘
서울 사이트의 Critical 이슈 있어?
Core-SW-01 장비 설명을 "2층 코어 스위치"로 바꿔줘
topology_map 1번에서 A장비와 B장비 사이 링크 삭제해줘
CPU 사용률 Top 5 장비 뽑아줘
B1_Core 장비의 최근 24시간 메모리 사용률 추이 보여줘
Gi1/0/1 포트의 In/Out bps 시계열 데이터 조회해줘
```

---

## 사전 요건

| 항목 | 버전 |
|------|------|
| Node.js | 18 이상 |
| XV3 NMS DB | MariaDB 10.x 이상 |
| MCP 클라이언트 | Claude Desktop (최신 버전) |

DB 계정에는 **SELECT** 권한(조회 도구)과 **UPDATE/INSERT/DELETE** 권한(변경 도구)이 필요합니다.

---

## 보안 주의사항

- `.env` 파일은 절대 git에 커밋하지 마세요 (`.gitignore`에 포함됨).
- HTTP 모드로 외부에 노출 시 **리버스 프록시(Nginx 등) + HTTPS** 적용을 권장합니다.
- DB 계정은 최소 권한 원칙에 따라 xv3 DB만 접근 가능하도록 제한하세요.
