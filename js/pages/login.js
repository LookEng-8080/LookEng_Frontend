import { AuthApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, createEyeSvg } from '../utils.js';

auth.redirectIfLoggedIn();

// ── 로고 눈 렌더링 ────────────────────────────────────────────
document.getElementById('logoEye').appendChild(createEyeSvg(0.54));
document.getElementById('logoEye2').appendChild(createEyeSvg(0.54));

// ── 별 파티클 생성 ────────────────────────────────────────────
(function createStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 60; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 3 + 1;
    star.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      animation-delay: ${Math.random() * 3}s;
      animation-duration: ${1.5 + Math.random() * 2}s;
    `;
    container.appendChild(star);
  }
})();

// ── 상태 ─────────────────────────────────────────────────────
let currentRole = 'student'; // 회원가입 시 사용: 'student' | 'admin'

// ── DOM 참조 ─────────────────────────────────────────────────
const roleTabsContainer = document.getElementById('roleTabs');
const roleTabs   = document.querySelectorAll('.role-tab');
const funcTabs   = document.querySelectorAll('.func-tab');
const loginForm  = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// ── 유형 탭 (학생 | 관리자) ───────────────────────────────────
roleTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    currentRole = tab.dataset.role;
    roleTabs.forEach(t => t.classList.toggle('is-active', t === tab));
    clearErrors();
  });
});

// ── 기능 탭 (로그인 | 회원가입) ──────────────────────────────
funcTabs.forEach(tab => {
  tab.addEventListener('click', () => switchFunc(tab.dataset.func));
});

function switchFunc(func) {
  funcTabs.forEach(t => t.classList.toggle('is-active', t.dataset.func === func));
  // 회원가입일 때만 학생/관리자 탭 표시
  roleTabsContainer.hidden = func !== 'signup';
  loginForm.hidden  = func !== 'login';
  signupForm.hidden = func !== 'signup';
  clearErrors();
}

function clearErrors() {
  document.getElementById('loginError').textContent  = '';
  document.getElementById('signupError').textContent = '';
}

// ── 로그인 제출 ───────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');
  const errorEl  = document.getElementById('loginError');

  if (!isValidEmail(email)) {
    errorEl.textContent = '올바른 이메일 형식을 입력하세요.';
    return;
  }
  if (!password) {
    errorEl.textContent = '비밀번호를 입력하세요.';
    return;
  }

  btn.classList.add('btn--loading');
  btn.textContent = '로그인 중...';

  try {
    const res = await AuthApi.login(email, password);
    if (!res || !res.success) {
      errorEl.textContent = res?.message || '로그인에 실패했습니다.';
      return;
    }
    const { role, userId } = res.data;
    auth.saveSession({ role, userId, email });

    if (role === 'ADMIN') {
      location.replace('./admin/word-manage.html');
    } else {
      location.replace('./word-list.html');
    }
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  } finally {
    btn.classList.remove('btn--loading');
    btn.textContent = '로그인';
  }
});

// ── 회원가입 제출 ─────────────────────────────────────────────
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('signupEmail').value.trim();
  const nickname = document.getElementById('signupNickname').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm  = document.getElementById('signupPasswordConfirm').value;
  const btn      = document.getElementById('signupBtn');
  const errorEl  = document.getElementById('signupError');

  if (!isValidEmail(email)) {
    errorEl.textContent = '올바른 이메일 형식을 입력하세요.';
    return;
  }
  if (!nickname) {
    errorEl.textContent = '닉네임을 입력하세요.';
    return;
  }
  if (!password) {
    errorEl.textContent = '비밀번호를 입력하세요.';
    return;
  }
  if (password !== confirm) {
    errorEl.textContent = '비밀번호가 일치하지 않습니다.';
    return;
  }

  btn.classList.add('btn--loading');
  btn.textContent = '가입 중...';

  try {
    const apiFn = currentRole === 'admin' ? AuthApi.adminSignup : AuthApi.signup;
    const res = await apiFn(email, password, nickname);
    if (!res || !res.success) {
      errorEl.textContent = res?.message || '회원가입에 실패했습니다.';
      return;
    }
    showToast('회원가입이 완료되었습니다!', 'success');
    signupForm.reset();
    switchFunc('login');
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  } finally {
    btn.classList.remove('btn--loading');
    btn.textContent = '회원가입';
  }
});

// ── 유틸 ─────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
