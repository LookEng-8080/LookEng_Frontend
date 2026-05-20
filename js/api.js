/**
 * api.js — LookEng API 호출 모음
 *
 * 모든 fetch() 호출은 이 파일에서만 작성한다.
 * 사용법: import { AuthApi, WordApi, TestApi } from '../js/api.js';
 *
 * 공통 응답 형식: { success: boolean, message: string, data: object }
 * 인증: JSESSIONID 쿠키 기반 (credentials: 'include' 필수)
 */

const BASE_URL = 'http://localhost:8080';

// ── 공통 fetch 래퍼 (JSON) ────────────────────────────────────
async function request(method, path, body = null) {
  const options = {
    method,
    credentials: 'include',           // JSESSIONID 쿠키 자동 전송
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(BASE_URL + path, options);

  // 1. 인증 만료 → 로그인 페이지
  if (res.status === 401 && !path.includes('/auth/')) {
    localStorage.clear();
    const prefix = location.pathname.includes('/admin/') ? '../../' :
                   location.pathname.includes('/pages/') ? '../'    : '';
    location.replace(`${prefix}pages/login.html`);
    return null;
  }

  // 2. 권한 없음 → 403 페이지
  if (res.status === 403 && !path.includes('/auth/')) {
    const prefix = location.pathname.includes('/admin/') ? '../../' :
                   location.pathname.includes('/pages/') ? '../'    : '';
    location.replace(`${prefix}pages/403.html`);
    return null;
  }

  // 3. 204 No Content (DELETE 성공 등 바디 없는 응답)
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return { success: true, message: '', data: null };
  }

  return res.json();
}

// ── 공통 fetch 래퍼 (FormData / 파일 업로드) ─────────────────
async function requestFormData(method, path, formData) {
  const options = {
    method,
    credentials: 'include',
    body: formData,
  };

  const res = await fetch(BASE_URL + path, options);

  if (res.status === 413) {
    return { success: false, message: '파일 크기(5MB)를 초과했습니다.' };
  }

  if (res.status === 401 && !path.includes('/auth/')) {
    localStorage.clear();
    const prefix = location.pathname.includes('/admin/') ? '../../' :
                   location.pathname.includes('/pages/') ? '../'    : '';
    location.replace(`${prefix}pages/login.html`);
    return null;
  }

  if (res.status === 403 && !path.includes('/auth/')) {
    const prefix = location.pathname.includes('/admin/') ? '../../' :
                   location.pathname.includes('/pages/') ? '../'    : '';
    location.replace(`${prefix}pages/403.html`);
    return null;
  }

  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────
export const AuthApi = {
  signup(email, password, nickname) {
    return request('POST', '/api/v1/auth/signup', { email, password, nickname });
  },

  adminSignup(email, password, nickname, adminCode) {
    return request('POST', '/api/v1/auth/admin/signup', { email, password, nickname, adminCode });
  },

  login(email, password) {
    return request('POST', '/api/v1/auth/login', { email, password });
  },

  logout() {
    return request('POST', '/api/v1/auth/logout');
  },
  
  withdraw() {
    return request('DELETE', '/api/v1/auth/withdraw');
  },

  requestPasswordReset(email) {
    return request('POST', '/api/v1/auth/password/reset-request', { email });
  },

  resetPassword(email, token, newPassword) {
    return request('POST', '/api/v1/auth/password/reset', { 
      email, 
      token: parseInt(token, 10), 
      newPassword 
    });
  },
  
  // --- 구글 소셜 로그인 ---
  socialLogin(idToken) {
    return request('POST', '/api/v1/auth/social', { idToken });
  },
};

// ── Word API ──────────────────────────────────────────────────
export const WordApi = {
  getList(page = 0, size = 20, sort = 'id,asc') {
    return request('GET', `/api/v1/words?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`);
  },

  getDetail(id) {
    return request('GET', `/api/v1/words/${id}`);
  },

  create(data) {
    return request('POST', '/api/v1/words', data);
  },

  update(id, data) {
    return request('PATCH', `/api/v1/words/${id}`, data);
  },

  delete(id) {
    return request('DELETE', `/api/v1/words/${id}`);
  },

  /**
   * 단어 검색 (영어/한글 부분 일치)
   * GET /api/v1/words/search?keyword=...&page=0&size=20
   */
  search(keyword, page = 0, size = 20) {
    return request('GET', `/api/v1/words/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`);
  },

  /**
   * CSV 일괄 단어 추가 (ADMIN 전용)
   * POST /api/v1/words/bulk — multipart/form-data
   */
  bulkUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    return requestFormData('POST', '/api/v1/words/bulk', formData);
  },
};

// ── Test API ──────────────────────────────────────────────────
export const TestApi = {
  start(totalCount, quizType = 'SHORT_ANSWER') {
    return request('POST', '/api/v1/test/sessions', { totalCount, quizType });
  },

  submitAnswer(sessionId, wordId, userInput) {
    return request('POST', `/api/v1/test/sessions/${sessionId}/answers`, { wordId, userInput });
  },

  finish(sessionId, durationSec) {
    return request('POST', `/api/v1/test/sessions/${sessionId}/finish`, { durationSec });
  },

  getHistory(page = 0, size = 10) {
    return request('GET', `/api/v1/test/sessions?page=${page}&size=${size}`);
  },
};

// ── UserWord API ──────────────────────────────────────────────
export const UserWordApi = {
  /**
   * 북마크 단어 목록 조회
   * GET /api/v1/user/words/bookmarked
   * @returns {{ success, message, data: WordResponseDto[] }}
   */
  getBookmarked() {
    return request('GET', '/api/v1/user/words/bookmarked');
  },

  /**
   * 암기 완료 단어 목록 조회
   * GET /api/v1/user/words/memorized
   * @returns {{ success, message, data: WordResponseDto[] }}
   */
  getMemorized() {
    return request('GET', '/api/v1/user/words/memorized');
  },

  /**
   * 북마크 토글
   * PATCH /api/v1/user/words/:wordId/bookmark
   * @returns {{ success, message, data: { wordId, isBookmarked } }}
   */
  toggleBookmark(wordId) {
    return request('PATCH', `/api/v1/user/words/${wordId}/bookmark`);
  },

  /**
   * 암기 상태 토글
   * PATCH /api/v1/user/words/:wordId/memorize
   * @returns {{ success, message, data: { wordId, isMemorized, memorizedAt } }}
   */
  toggleMemorize(wordId) {
    return request('PATCH', `/api/v1/user/words/${wordId}/memorize`);
  },
};

// ── Admin API ─────────────────────────────────────────────────
export const AdminApi = {
  getUsers() {
    return request('GET', '/api/v1/admin/users');
  },

  getUserSessions(userId, page = 0, size = 10) {
    return request('GET', `/api/v1/admin/users/${userId}/test-sessions?page=${page}&size=${size}`);
  },
};
