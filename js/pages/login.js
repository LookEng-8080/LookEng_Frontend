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
const adminCodeGroup = document.getElementById('adminCodeGroup');
const signupAdminCode = document.getElementById('signupAdminCode');

// ── 유형 탭 (학생 | 관리자) ───────────────────────────────────
roleTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    currentRole = tab.dataset.role;
    roleTabs.forEach(t => t.classList.toggle('is-active', t === tab));
    adminCodeGroup.hidden = currentRole !== 'admin';
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
  const email     = document.getElementById('signupEmail').value.trim();
  const nickname  = document.getElementById('signupNickname').value.trim();
  const password  = document.getElementById('signupPassword').value;
  const confirm   = document.getElementById('signupPasswordConfirm').value;
const adminCode = document.getElementById('signupAdminCode') ? document.getElementById('signupAdminCode').value.trim() : '';  const btn       = document.getElementById('signupBtn');
  const errorEl   = document.getElementById('signupError');

  if (!isValidEmail(email)) {
    errorEl.textContent = '올바른 이메일 형식을 입력하세요.';
    return;
  }
  if (!nickname) {
    errorEl.textContent = '닉네임을 입력하세요.';
    return;
  }
  // 💡 관리자 가입인데 관리자 코드를 안 적었을 때 방어 로직 추가
  if (currentRole === 'admin' && !adminCode) {
    errorEl.textContent = '관리자 코드를 입력하세요.';
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
    let res;
    // 💡 역할에 따라 호출하는 API와 넘기는 파라미터를 다르게 분리
    if (currentRole === 'admin') {
      res = await AuthApi.adminSignup(email, password, nickname, adminCode);
    } else {
      res = await AuthApi.signup(email, password, nickname);
    }

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

// ======= 기존 login.js 코드 맨 아래에 아래 코드를 그대로 붙여넣으세요 =======

// --- 화면 전환 로직 ---
const loginSection = document.getElementById('loginSection');
const resetSection = document.getElementById('resetSection');

document.getElementById('showResetBtn')?.addEventListener('click', () => {
  loginSection.style.display = 'none';
  resetSection.style.display = 'block';
});

document.getElementById('showLoginBtn')?.addEventListener('click', () => {
  resetSection.style.display = 'none';
  loginSection.style.display = 'block';
});

// --- 비밀번호 재설정 로직 ---
const resetRequestForm = document.getElementById('resetRequestForm');
const resetConfirmForm = document.getElementById('resetConfirmForm');
const resetEmailInput = document.getElementById('resetEmail');
const sendCodeBtn = document.getElementById('sendCodeBtn');

// 1단계: 인증번호 요청
resetRequestForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = resetEmailInput.value.trim();
  sendCodeBtn.disabled = true;
  sendCodeBtn.textContent = '발송 중...';

  try {
    const res = await AuthApi.requestPasswordReset(email);
    if (res && res.success) {
      alert('인증번호가 이메일로 발송되었습니다.');
      resetEmailInput.disabled = true;
      sendCodeBtn.style.display = 'none';
      resetConfirmForm.style.display = 'block';
    } else {
      alert(res?.message || '인증번호 발송 실패. 이메일을 확인해 주세요.');
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = '인증번호 발송';
    }
  } catch (error) {
    alert('서버 통신 오류가 발생했습니다.');
    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = '인증번호 발송';
  }
});

// 2단계: 인증번호 확인 및 비밀번호 변경
resetConfirmForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = resetEmailInput.value.trim();
  const token = document.getElementById('resetToken').value.trim();
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    alert('새 비밀번호가 서로 일치하지 않습니다.');
    return;
  }

  try {
    const res = await AuthApi.resetPassword(email, token, newPassword);
    if (res && res.success) {
      alert('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해 주세요.');
      // 폼 초기화 및 로그인 화면으로 복귀
      resetConfirmForm.reset();
      resetRequestForm.reset();
      resetEmailInput.disabled = false;
      sendCodeBtn.style.display = 'block';
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = '인증번호 발송';
      resetConfirmForm.style.display = 'none';
      
      resetSection.style.display = 'none';
      loginSection.style.display = 'block';
    } else {
      alert(res?.message || '비밀번호 변경 실패. 인증번호를 확인해 주세요.');
    }
  } catch (error) {
    alert('서버 통신 오류가 발생했습니다.');
  }
});

// ── 유틸 ─────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ======= 구글 소셜 로그인 로직 =======
window.onload = function () {
  // 구글 로그인 초기화
  google.accounts.id.initialize({
    // 백엔드(application.yml)에 입력한 구글 클라이언트 ID와 똑같은 값을 여기에 넣으세요.
    client_id: "718119868998-f1okpb4888sjbq49836ic661jbn3p0tq.apps.googleusercontent.com",
    callback: handleGoogleLogin
  });

  // 버튼 렌더링
  const googleBtn = document.getElementById("googleLoginBtn");
  if (googleBtn) {
    google.accounts.id.renderButton(googleBtn, {
      theme: "outline",
      size: "large",
      width: "350", // 폼 너비에 맞춰 조정
      text: "signin_with"
    });
  }
};

// 구글 로그인 성공 후 백엔드 통신 및 리다이렉트 처리
async function handleGoogleLogin(response) {
  const idToken = response.credential; // 구글에서 발급한 JWT 토큰
  const errorEl = document.getElementById('loginError');

  try {
    // API 통신
    // API 통신 (api.js 활용)
    const res = await AuthApi.socialLogin(idToken);

    if (!res || !res.success) {
      errorEl.textContent = res?.message || '구글 로그인에 실패했습니다.';
      return;
    }

    // 성공 시 일반 로그인과 동일하게 세션 저장
    const { role, userId, email } = res.data;
    auth.saveSession({ role, userId, email });

    showToast('구글 로그인에 성공했습니다!', 'success');

    // 일반 로그인처럼 권한에 맞춰 단어장 페이지로 이동
    if (role === 'ADMIN') {
      location.replace('./admin/word-manage.html');
    } else {
      location.replace('./word-list.html');
    }
  } catch (error) {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}
