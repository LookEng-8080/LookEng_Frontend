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

// ── 공통 fetch 래퍼 ──────────────────────────────────────────
/**
 * @param {string} method  - HTTP 메서드 (GET, POST, PATCH, DELETE)
 * @param {string} path    - API 경로 (/api/v1/...)
 * @param {object|null} body - 요청 바디 (GET/DELETE는 null)
 * @returns {Promise<{success, message, data}>}
 */
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
  if (res.status === 401) {
    localStorage.clear();
    const prefix = location.pathname.includes('/admin/') ? '../../' :
                   location.pathname.includes('/pages/') ? '../'    : '';
    location.replace(`${prefix}pages/login.html`);
    return null;
  }

  // 2. 권한 없음 → 403 페이지
  if (res.status === 403) {
    const prefix = location.pathname.includes('/admin/') ? '../../' :
                   location.pathname.includes('/pages/') ? '../'    : '';
    location.replace(`${prefix}pages/403.html`);
    return null;
  }

  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────
export const AuthApi = {
  /**
   * 일반 사용자 회원가입
   * POST /api/v1/auth/signup
   * @returns {{ success, message, data: { userId, email } }}
   */
  signup(email, password) {
    return request('POST', '/api/v1/auth/signup', { email, password });
  },

  /**
   * 관리자 회원가입
   * POST /api/v1/auth/admin/signup
   */
  adminSignup(email, password) {
    return request('POST', '/api/v1/auth/admin/signup', { email, password });
  },

  /**
   * 로그인
   * POST /api/v1/auth/login
   * @returns {{ success, message, data: { userId, email, role } }}
   */
  login(email, password) {
    return request('POST', '/api/v1/auth/login', { email, password });
  },

  /**
   * 로그아웃
   * POST /api/v1/auth/logout
   */
  logout() {
    return request('POST', '/api/v1/auth/logout');
  },
};

// ── Word API ──────────────────────────────────────────────────
export const WordApi = {
  /**
   * 단어 목록 조회 (페이지네이션)
   * GET /api/v1/words?page=0&size=20&sort=id,asc
   * sort 옵션: 'id,asc' | 'english,asc' | 'english,desc'
   * @returns {{ success, message, data: { content[], totalElements, totalPages, currentPage, pageSize } }}
   */
  getList(page = 0, size = 20, sort = 'id,asc') {
    return request('GET', `/api/v1/words?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`);
  },

  /**
   * 단어 상세 조회
   * GET /api/v1/words/:id
   * @returns {{ success, message, data: { id, english, meaning, pronunciation, exampleSentence, isMemorized, isBookmarked, createdAt, updatedAt } }}
   */
  getDetail(id) {
    return request('GET', `/api/v1/words/${id}`);
  },

  /**
   * 단어 추가 (ADMIN 전용)
   * POST /api/v1/words
   * @param {{ english, meaning, pronunciation, exampleSentence }} data
   */
  create(data) {
    return request('POST', '/api/v1/words', data);
  },

  /**
   * 단어 수정 (ADMIN 전용)
   * PATCH /api/v1/words/:id
   * @param {object} data - 변경할 필드만 포함 (모든 필드 optional)
   */
  update(id, data) {
    return request('PATCH', `/api/v1/words/${id}`, data);
  },

  /**
   * 단어 삭제 (ADMIN 전용)
   * DELETE /api/v1/words/:id
   */
  delete(id) {
    return request('DELETE', `/api/v1/words/${id}`);
  },
};

// ── Test API ──────────────────────────────────────────────────
export const TestApi = {
  /**
   * 테스트 세션 시작
   * POST /api/v1/test/sessions
   * quizType: 'SHORT_ANSWER' | 'MULTIPLE_CHOICE'
   * @returns {{ success, message, data: { sessionId, currentIndex, totalCount, isFinished, quizType, currentQuestion } }}
   */
  start(totalCount, quizType = 'SHORT_ANSWER') {
    return request('POST', '/api/v1/test/sessions', { totalCount, quizType });
  },

  /**
   * 답안 제출
   * POST /api/v1/test/sessions/:sessionId/answers
   * @returns {{ success, message, data: { sessionId, currentIndex, totalCount, isCorrect, isFinished, currentQuestion } }}
   */
  submitAnswer(sessionId, wordId, userAnswer) {
    return request('POST', `/api/v1/test/sessions/${sessionId}/answers`, { wordId, userAnswer });
  },

  /**
   * 테스트 종료
   * POST /api/v1/test/sessions/:sessionId/finish
   * @returns {{ success, message, data: { sessionId, totalCount, correctCount, accuracy, durationSec, wrongAnswers[], finishedAt } }}
   */
  finish(sessionId, durationSec) {
    return request('POST', `/api/v1/test/sessions/${sessionId}/finish`, { durationSec });
  },

  /**
   * 테스트 기록 조회
   * GET /api/v1/test/sessions?page=0&size=10
   * @returns {{ success, message, data: { content[], totalElements, totalPages, currentPage, pageSize } }}
   */
  getHistory(page = 0, size = 10) {
    return request('GET', `/api/v1/test/sessions?page=${page}&size=${size}`);
  },
};
