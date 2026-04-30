/**
 * auth.js — LookEng 인증/세션 관리
 *
 * 사용법: import { auth } from '../js/auth.js';
 *
 * 세션 정보는 localStorage에 저장:
 *   - role    : 'USER' | 'ADMIN'
 *   - userId  : string (숫자)
 *   - email   : string
 */

// ── 경로 헬퍼 ─────────────────────────────────────────────────
/**
 * 현재 페이지 depth에 따라 상대 경로 prefix 반환
 * pages/admin/ → '../../'
 * pages/       → '../'
 * root         → ''
 */
function getPrefix() {
  const path = location.pathname;
  if (path.includes('/admin/')) return '../../';
  if (path.includes('/pages/')) return '../';
  return '';
}

// ── auth 객체 ─────────────────────────────────────────────────
export const auth = {
  // 세션 조회
  getRole()   { return localStorage.getItem('role'); },
  getUserId() { return localStorage.getItem('userId'); },
  getEmail()  { return localStorage.getItem('email'); },
  isLoggedIn(){ return !!this.getRole(); },
  isAdmin()   { return this.getRole() === 'ADMIN'; },

  // 로그인 성공 시 세션 저장
  saveSession({ role, userId, email }) {
    localStorage.setItem('role',   role);
    localStorage.setItem('userId', String(userId));
    localStorage.setItem('email',  email);
  },

  // 로그아웃 시 세션 삭제
  clearSession() {
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
  },

  /**
   * 로그인이 필요한 페이지에서 호출
   * - 미로그인 시 login.html로 리다이렉트
   */
  requireLogin() {
    if (!this.isLoggedIn()) {
      location.replace(`${getPrefix()}pages/login.html`);
    }
  },

  /**
   * 관리자 전용 페이지에서 호출
   * - 미로그인 → login.html
   * - USER 로그인 → 403.html
   */
  requireAdmin() {
    if (!this.isLoggedIn()) {
      location.replace(`${getPrefix()}pages/login.html`);
      return;
    }
    if (!this.isAdmin()) {
      location.replace(`${getPrefix()}pages/403.html`);
    }
  },

  /**
   * 로그인 페이지에서 호출 (이미 로그인된 경우 리다이렉트)
   * - USER  → dashboard.html
   * - ADMIN → admin/word-manage.html
   */
  redirectIfLoggedIn() {
    const role = this.getRole();
    if (role === 'ADMIN') {
      location.replace(`${getPrefix()}pages/admin/word-manage.html`);
    } else if (role === 'USER') {
      location.replace(`${getPrefix()}pages/dashboard.html`);
    }
  },
};
