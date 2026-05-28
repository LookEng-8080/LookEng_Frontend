# CLAUDE.md — js/

## 파일 구조

```
js/
├── api.js              ← 모든 fetch() 호출 집중 (반드시 여기서만 호출)
├── auth.js             ← 세션 관리, 역할 검증, 리다이렉트
├── utils.js            ← 공통 유틸 (토스트, 날짜 포맷, 사이드바, 페이지네이션)
└── pages/
    ├── login.js
    ├── landing.js
    ├── word-list.js
    ├── dashboard.js
    ├── test.js
    ├── test-history.js
    ├── password-reset.js
    └── admin/
        ├── word-manage.js
        └── quiz-session.js
```

---

## api.js — API 호출 패턴

모든 API 호출은 `api.js`에서만 작성한다. 페이지 JS에서 직접 `fetch()` 사용 금지.

```js
const BASE_URL = 'http://localhost:8080';

// JSON 요청 래퍼 (일반 API)
async function request(method, path, body = null) { ... }

// 파일 업로드 래퍼 (CSV 업로드, multipart/form-data)
async function requestFormData(method, path, formData) { ... }
// → 413 처리 포함 (5MB 초과 시 백엔드 자동 에러 응답)
```

### API 객체

| 객체 | 엔드포인트 그룹 |
|------|----------------|
| `AuthApi` | `/api/v1/auth/*` — 로그인, 회원가입, 로그아웃, 탈퇴, 비밀번호 재설정, 소셜 |
| `WordApi` | `/api/v1/words/*` — CRUD, 검색, CSV 업로드 |
| `UserWordApi` | `/api/v1/user/words/*` — 북마크/암기 토글, 목록 조회 |
| `TestApi` | `/api/v1/test/sessions/*` — 세션 시작, 답안, 종료, 기록, 상세 |
| `ProgressApi` | `/api/v1/user/progress` — 진도율·등급 |
| `AdminApi` | `/api/v1/admin/*` — 사용자 목록, 테스트 기록, 세션 상세 |

### 공통 에러 처리 (request 내부)

```js
if (res.status === 401) {
    localStorage.clear();
    location.href = '/pages/login.html';
    return;
}
if (res.status === 403) {
    location.href = '/pages/403.html';
    return;
}
```

---

## auth.js — 인증 헬퍼

```js
// localStorage 읽기
auth.getRole()       // 'USER' | 'ADMIN' | null
auth.getUserId()     // Long | null
auth.getEmail()      // string | null

// 상태 확인
auth.isLoggedIn()    // role이 있으면 true
auth.isAdmin()       // role === 'ADMIN'

// 세션 관리
auth.saveSession({ role, userId, email })  // 로그인 후 저장
auth.clearSession()                        // 로그아웃 후 삭제

// 페이지 접근 제어
auth.requireLogin()       // 미로그인 시 login.html 리다이렉트
auth.requireAdmin()       // ADMIN 아니면 403.html 리다이렉트
auth.redirectIfLoggedIn() // 로그인된 상태면 역할별 홈으로 리다이렉트
```

---

## utils.js — 공통 유틸

```js
// 토스트 알림 (우하단, 3초 자동 제거)
showToast(message, type)  // type: 'info' | 'success' | 'error'

// 날짜·시간 포맷
formatDate(dateStr)        // ISO → 'YYYY.MM.DD'
formatDuration(seconds)   // 초 → 'M분 SS초'

// 품사 CSS 클래스
getPosClass(pos)           // 품사명 → CSS class 문자열

// 특수 UI 생성
createEyeSvg(size)         // 마우스 추적 눈 SVG (랜딩 페이지용)

// 사이드바
buildSidebar(activeMenu)   // 사이드바 HTML 렌더링 + 로그아웃/탈퇴 이벤트 바인딩

// 페이지네이션
renderPagination(container, currentPage, totalPages, onPageChange)
```

---

## 코딩 컨벤션

```js
// 변수/함수: camelCase, 상수: UPPER_SNAKE_CASE
const PAGE_SIZE = 20;
const BASE_URL = 'http://localhost:8080';

// async/await + try/catch 필수
async function loadWords() {
    try {
        const res = await WordApi.getList(currentPage);
        if (!res.success) { showToast(res.message, 'error'); return; }
        renderWordList(res.data.content);
    } catch (err) {
        showToast('네트워크 오류가 발생했습니다.', 'error');
    }
}

// fetch 로직과 렌더 로직 분리
function renderWordList(words) { ... }

// 이벤트 위임 활용 (동적 요소)
document.getElementById('list').addEventListener('click', (e) => {
    const card = e.target.closest('[data-word-id]');
    if (!card) return;
});

// 주석: 번호 블록 (백엔드와 동일 관행)
// 1. 세션 확인
// 2. 데이터 로드
// 3. 이벤트 바인딩
```

### HTML 작성 규칙
- JS 접근용 식별자: `id` 속성
- 스타일링 목적: `class` 속성
- 동적 데이터 바인딩: `data-*` 속성 (`data-word-id`, `data-session-id`)
- CSS는 `<head>`에, JS는 `</body>` 직전에 로드
- `var` 사용 금지 → `const` / `let`

### HTTP 상태별 처리

| 상태 | 처리 방식 |
|------|----------|
| 200/201 | `res.data` 사용 |
| 400 | `res.message` 토스트 |
| 401 | login.html 리다이렉트 (api.js 공통) |
| 403 | 403.html 리다이렉트 (api.js 공통) |
| 404/409 | `res.message` 토스트 |
| network 오류 | catch 블록에서 "네트워크 오류" 토스트 |
