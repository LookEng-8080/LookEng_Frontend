# CLAUDE.md — LookEng Frontend

프론트엔드 개발 가이드 (Claude Code 전용 컨텍스트 문서)

## Project Overview

LookEng(루킹)는 TOEIC 핵심 단어 학습 플랫폼입니다.
취업·전공으로 바쁜 대학생이 자투리 시간에 단어를 암기하고, 테스트로 성취감을 얻는 것이 목적입니다.

- **팀:** 8080조 (5인, sw공학)
- **개발 기간:** 2026-04-10 ~ 2026-05-29 (약 7주)
- **방법론:** Hybrid Scrum
- **프론트엔드 스택:** HTML + CSS + Vanilla JS (프레임워크 없음)
- **백엔드:** Spring Boot (포트 8080) — 세션 기반 인증 (JWT 없음)

---

## Repository Structure

```
lookeng-frontend/
│
├── index.html                         ← 진입점 → login.html 리다이렉트
│
├── pages/                             ← 화면별 HTML
│   ├── login.html                     ← 로그인
│   ├── register.html                  ← 회원가입
│   ├── word-list.html                 ← 단어 목록 (일반 사용자 메인)
│   ├── word-detail.html               ← 단어 상세 (뜻, 품사, 예문)
│   ├── test.html                      ← 테스트 진행 (주관식/객관식)
│   ├── test-result.html               ← 테스트 결과 (정답률, 오답 목록)
│   ├── test-history.html              ← 테스트 기록 목록
│   ├── 403.html                       ← 권한 없음 (접근 제어 실패 시)
│   └── admin/
│       ├── word-manage.html           ← 관리자: 단어 CRUD
│       └── user-manage.html           ← 관리자: 사용자 목록 조회
│
├── css/
│   ├── global.css                     ← CSS 변수, reset, 공통 폰트/레이아웃
│   ├── components.css                 ← 버튼, 카드, 모달, 토스트, 페이지네이션
│   └── pages/
│       ├── login.css
│       ├── register.css
│       ├── word-list.css
│       ├── word-detail.css
│       ├── test.css
│       ├── test-result.css
│       ├── test-history.css
│       └── admin.css                  ← 관리자 페이지 공통
│
├── js/
│   ├── api.js                         ← 모든 fetch() 호출 집중 (핵심!)
│   ├── auth.js                        ← 세션 확인, 역할 검증, 리다이렉트
│   ├── utils.js                       ← 날짜 포맷, 토스트, 공통 DOM 유틸
│   └── pages/
│       ├── login.js
│       ├── register.js
│       ├── word-list.js
│       ├── word-detail.js
│       ├── test.js
│       ├── test-result.js
│       ├── test-history.js
│       └── admin/
│           ├── word-manage.js
│           └── user-manage.js
│
└── assets/
    ├── logo.svg
    └── icons/
```

---

## Commands

```bash
# VS Code Live Server 사용 (권장)
# 1. VS Code에서 index.html 열기
# 2. 우하단 "Go Live" 클릭 → http://127.0.0.1:5500

# 백엔드 동시 실행 필요 (별도 터미널)
cd ../LookEng_Backend
./gradlew bootRun         # http://localhost:8080
```

> ⚠️ **CORS**: 백엔드가 `http://127.0.0.1:5500` origin을 허용하도록 설정되어 있어야 함.
> 백엔드 `WebMvcConfigurer`의 `allowedOrigins`에 Live Server URL이 포함되어야 한다.

---

## Architecture: 인증 흐름

### 세션 기반 인증 (JSESSIONID 쿠키)

```
로그인 성공
  → 백엔드가 JSESSIONID 쿠키 Set
  → localStorage에 { role, userId, email } 저장
  → 역할에 따라 리다이렉트

보호 페이지 진입 시 (auth.js)
  → localStorage에 role 있으면 통과
  → 없으면 login.html 리다이렉트

API 호출 시
  → credentials: 'include' 필수 (쿠키 자동 전송)
  → 401 응답 → login.html 리다이렉트
  → 403 응답 → 403.html 리다이렉트

로그아웃
  → POST /api/v1/auth/logout
  → localStorage 전체 삭제
  → login.html 리다이렉트
```

### 역할별 접근 제어

| 역할 | 접근 가능 페이지 |
|------|-----------------|
| `USER` | word-list, word-detail, test, test-result, test-history |
| `ADMIN` | word-list, word-detail, admin/word-manage, admin/user-manage |

> 관리자는 테스트 기능에 접근하지 않음 (PBI 정의 기준)

---

## API Integration

### Base URL

```js
const BASE_URL = 'http://localhost:8080';
```

### 공통 응답 형식

모든 API 응답은 아래 형식을 따름:

```json
{
  "success": true,
  "message": "성공 메시지",
  "data": { ... }
}
```

오류 시:
```json
{
  "success": false,
  "message": "오류 메시지",
  "data": null
}
```

### api.js 패턴 (반드시 이 형식 사용)

```js
// api.js — 모든 API 호출은 여기에 작성
const BASE_URL = 'http://localhost:8080';

// 1. 공통 fetch 래퍼
async function request(method, path, body = null) {
  const options = {
    method,
    credentials: 'include',              // JSESSIONID 쿠키 자동 전송
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(BASE_URL + path, options);
  const json = await res.json();

  // 인증 오류 처리
  if (res.status === 401) { location.href = '/pages/login.html'; return; }
  if (res.status === 403) { location.href = '/pages/403.html'; return; }

  return json; // { success, message, data }
}

// 2. 개별 API 함수 (예시)
export const AuthApi = {
  login:  (email, password) => request('POST', '/api/v1/auth/login', { email, password }),
  signup: (email, password) => request('POST', '/api/v1/auth/signup', { email, password }),
  logout: ()                => request('POST', '/api/v1/auth/logout'),
};

export const WordApi = {
  getList:   (page = 0, size = 20, sort = 'id,asc') =>
    request('GET', `/api/v1/words?page=${page}&size=${size}&sort=${sort}`),
  getDetail: (id)           => request('GET',    `/api/v1/words/${id}`),
  create:    (data)         => request('POST',   '/api/v1/words', data),
  update:    (id, data)     => request('PATCH',  `/api/v1/words/${id}`, data),
  delete:    (id)           => request('DELETE', `/api/v1/words/${id}`),
};

export const TestApi = {
  start:      (totalCount, quizType) =>
    request('POST', '/api/v1/test/sessions', { totalCount, quizType }),
  answer:     (sessionId, wordId, userAnswer) =>
    request('POST', `/api/v1/test/sessions/${sessionId}/answers`, { wordId, userAnswer }),
  finish:     (sessionId, durationSec) =>
    request('POST', `/api/v1/test/sessions/${sessionId}/finish`, { durationSec }),
  getHistory: (page = 0, size = 10) =>
    request('GET', `/api/v1/test/sessions?page=${page}&size=${size}`),
};
```

### 전체 API 엔드포인트 목록

| Method | Path | 인증 | 역할 | 설명 |
|--------|------|------|------|------|
| POST | `/api/v1/auth/signup` | ✗ | - | 일반 사용자 회원가입 |
| POST | `/api/v1/auth/admin/signup` | ✗ | - | 관리자 회원가입 |
| POST | `/api/v1/auth/login` | ✗ | - | 로그인 → JSESSIONID 발급 |
| POST | `/api/v1/auth/logout` | ✅ | USER/ADMIN | 로그아웃 → 세션 무효화 |
| GET | `/api/v1/words` | ✅ | USER/ADMIN | 단어 목록 (페이지네이션) |
| GET | `/api/v1/words/{id}` | ✅ | USER/ADMIN | 단어 상세 |
| POST | `/api/v1/words` | ✅ | ADMIN | 단어 추가 |
| PATCH | `/api/v1/words/{id}` | ✅ | ADMIN | 단어 수정 |
| DELETE | `/api/v1/words/{id}` | ✅ | ADMIN | 단어 삭제 |
| POST | `/api/v1/test/sessions` | ✅ | USER | 테스트 시작 |
| POST | `/api/v1/test/sessions/{id}/answers` | ✅ | USER | 답안 제출 |
| POST | `/api/v1/test/sessions/{id}/finish` | ✅ | USER | 테스트 종료 |
| GET | `/api/v1/test/sessions` | ✅ | USER | 테스트 기록 조회 |

### 주요 응답 필드 요약

**단어 목록 응답 (`data.content[]`):**
```
id, english, meaning, pronunciation, exampleSentence,
isMemorized(항상 false), isBookmarked(항상 false), createdAt, updatedAt
```

**테스트 시작 응답 (`data`):**
```
sessionId, currentIndex(0), totalCount, isFinished(false),
quizType(SHORT_ANSWER|MULTIPLE_CHOICE),
currentQuestion: { wordId, english, meaning, pronunciation, exampleSentence }
```

**답안 제출 응답 (`data`):**
```
sessionId, currentIndex(증가), totalCount, isCorrect, isFinished,
currentQuestion(isFinished=true이면 null)
```

**테스트 종료 응답 (`data`):**
```
sessionId, totalCount, correctCount, accuracy(소수점 1자리),
durationSec, wrongAnswers[], finishedAt
```

---

## Coding Conventions

### 공통 원칙
- **`var` 사용 금지** → `const` / `let` 사용
- 비동기 처리는 **`async/await`** (`.then()` 체이닝 사용 안 함)
- API 호출은 반드시 **`try/catch`** 로 감싸고 에러 처리
- 함수 하나는 **한 가지 일만** (단일 책임 원칙)
- 매직 넘버 금지 → 상수로 분리 (`const PAGE_SIZE = 20;`)

### 파일 네이밍
```
kebab-case 사용
word-list.html / word-list.css / word-list.js  ← HTML·CSS·JS 파일명 일치
admin/word-manage.html → admin/word-manage.js
```

### HTML 컨벤션
```html
<!-- 1. 시맨틱 태그 사용 -->
<header>, <main>, <nav>, <section>, <article>, <footer>

<!-- 2. JS에서 접근하는 요소는 id 사용, 스타일용은 class 사용 -->
<button id="loginBtn" class="btn btn--primary">로그인</button>

<!-- 3. data-* 속성으로 동적 데이터 바인딩 -->
<tr data-word-id="42">

<!-- 4. CSS는 <head>에서, JS는 </body> 직전에 로드 -->
<link rel="stylesheet" href="../css/global.css">
<link rel="stylesheet" href="../css/pages/word-list.css">
...
<script src="../js/api.js"></script>
<script src="../js/auth.js"></script>
<script src="../js/pages/word-list.js"></script>
```

### CSS 컨벤션
```css
/* 1. global.css에 CSS 변수 정의 */
:root {
  --color-primary: #4A90E2;
  --color-danger:  #E74C3C;
  --color-text:    #333333;
  --font-size-base: 16px;
  --border-radius: 8px;
}

/* 2. BEM 네이밍: block__element--modifier */
.word-card { }
.word-card__title { }
.word-card__title--hidden { }

/* 3. 모바일 우선 작성, 큰 화면은 min-width로 확장 */
.container { width: 100%; }
@media (min-width: 768px) { .container { max-width: 1024px; } }
```

### JavaScript 컨벤션
```js
// 1. 변수/함수: camelCase
const userId = 1;
function fetchWordList() {}

// 2. 상수: UPPER_SNAKE_CASE
const MAX_WORD_COUNT = 50;
const BASE_URL = 'http://localhost:8080';

// 3. async/await + try/catch 필수 패턴
async function loadWords() {
  try {
    const res = await WordApi.getList(currentPage);
    if (!res.success) {
      showToast(res.message, 'error');
      return;
    }
    renderWordList(res.data.content);
  } catch (err) {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// 4. DOM 조작은 함수 분리 (fetch 로직과 렌더 로직 분리)
function renderWordList(words) {
  const list = document.getElementById('wordList');
  list.innerHTML = words.map(buildWordCard).join('');
}
function buildWordCard(word) {
  return `<div class="word-card" data-word-id="${word.id}">...</div>`;
}

// 5. 이벤트 위임 활용 (동적 요소)
document.getElementById('wordList').addEventListener('click', (e) => {
  const card = e.target.closest('[data-word-id]');
  if (!card) return;
  const wordId = card.dataset.wordId;
  // ...
});

// 6. 주석: 로직 블록 앞에 한 줄 설명 (백엔드와 동일 관행)
// 1. 페이지 진입 시 세션 확인
auth.requireLogin();
// 2. 단어 목록 초기 로드
loadWords(0);
// 3. 정렬 셀렉터 이벤트 바인딩
bindSortSelector();
```

---

## Error Handling 패턴

```js
// utils.js — 공통 토스트 함수
function showToast(message, type = 'info') {
  // type: 'info' | 'success' | 'error'
  // 화면 우하단에 3초간 표시
}

// auth.js — 인증 체크 헬퍼
const auth = {
  // 로그인 필요 페이지: USER 또는 ADMIN 둘 다 허용
  requireLogin() {
    const role = localStorage.getItem('role');
    if (!role) location.replace('/pages/login.html');
  },
  // 관리자 전용 페이지
  requireAdmin() {
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN') location.replace('/pages/403.html');
  },
  // 로그인 페이지에서 이미 로그인된 경우 리다이렉트
  redirectIfLoggedIn() {
    const role = localStorage.getItem('role');
    if (role === 'ADMIN')  location.replace('/pages/admin/word-manage.html');
    if (role === 'USER')   location.replace('/pages/word-list.html');
  },
};
```

| HTTP 상태 | 처리 방식 |
|-----------|----------|
| 200 / 201 | `res.data` 사용, `res.message` 필요시 토스트 |
| 400 | `res.message` 로 사용자에게 토스트 표시 |
| 401 | `login.html` 리다이렉트 (api.js 공통 처리) |
| 403 | `403.html` 리다이렉트 (api.js 공통 처리) |
| 404 | `res.message` 토스트 표시 |
| 409 | `res.message` 토스트 표시 (중복 이메일 등) |
| network 오류 | catch 블록에서 "네트워크 오류" 토스트 |

---

## PBI 구현 현황 (우선순위 순)

### Sprint 1 대상 (우선순위 1~4, MVP)

| 우선순위 | 기능 | 관련 페이지 | 추가기능 |
|---------|------|------------|---------|
| 1 | 테스트 — 뜻 보고 영어 입력 | test.html | No |
| 1 | 단계별 성장/보상 — 등급 부여 | word-list.html | Yes |
| 1 | 관리자 — 사용자 목록 조회 | admin/user-manage.html | Yes |
| 1 | 관리자 회원가입 | register.html (admin flow) | No |
| 1 | 홈 — 전체 단어 학습 진도율 시각화 | word-list.html | No |
| 1 | 관리자 — 단어 목록 조회 | admin/word-manage.html | No |
| 1 | 사용자 — 단어 목록 조회(페이지네이션) | word-list.html | No |
| 2 | 관리자 — 단어 추가 | admin/word-manage.html | No |
| 2 | 성장 — 현재 등급/다음 등급 시각화 | word-list.html | Yes |
| 2 | 관리자 — 사용자별 학습 진도율 | admin/user-manage.html | Yes |
| 2 | 단어 상세 (뜻, 품사, 예문) | word-detail.html | No |
| 2 | 관리자 로그인 | login.html | No |
| 2 | 테스트 — 정/오답 판정 | test.html | No |
| 3 | 테스트 결과 (정답률, 소요시간, 오답목록) | test-result.html | No |
| 3 | 관리자 — 단어 수정 | admin/word-manage.html | No |
| 3 | 단어 뜻 숨기기/보기 토글 | word-list.html | No |
| 3 | 일반 사용자 회원가입 | register.html | No |
| 4 | 관리자 — 단어 삭제 | admin/word-manage.html | No |
| 4 | 단어 목록 정렬 (알파벳/랜덤) | word-list.html | No |
| 4 | 일반 사용자 로그인 | login.html | No |
| 4 | 객관식(4지선다) 퀴즈 | test.html | No |

### Sprint 2 대상 (우선순위 5+, 추가기능)

| 우선순위 | 기능 | 관련 페이지 |
|---------|------|------------|
| 5 | 테스트 기록 조회 | test-history.html |
| 5 | 권한별 화면 분리 | auth.js |
| 5 | 단어 검색 | word-list.html |
| 6 | 예문 빈칸 퀴즈 | test.html |
| 6 | 암기완료/북마크 표시 | word-list.html |
| 6+ | 로그아웃, 소셜 로그인, 비밀번호 재설정 등 | login.html |
