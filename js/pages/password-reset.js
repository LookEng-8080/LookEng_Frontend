import { AuthApi } from '../api.js';
import { auth } from '../auth.js';

// 이미 로그인된 사용자는 접근 불가 (대시보드나 단어장으로 리다이렉트)
auth.redirectIfLoggedIn();

const resetRequestForm = document.getElementById('resetRequestForm');
const resetConfirmForm = document.getElementById('resetConfirmForm');
const emailInput = document.getElementById('email');
const sendCodeBtn = document.getElementById('sendCodeBtn');

// 1단계: 인증번호 발송 요청
resetRequestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();

  sendCodeBtn.disabled = true;
  sendCodeBtn.textContent = '발송 중...';

  try {
    const res = await AuthApi.requestPasswordReset(email);
    if (res && res.success) {
      alert(res.message || '비밀번호 재설정 인증번호가 이메일로 발송되었습니다.');
      
      // 이메일 입력창은 수정 못 하게 막고 2단계 인증 번호 폼을 오픈
      emailInput.disabled = true;
      sendCodeBtn.style.display = 'none';
      resetConfirmForm.style.display = 'block';
    } else {
      alert(res?.message || '인증번호 발송에 실패했습니다. 이메일을 다시 확인해 주세요.');
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = '인증번호 발송';
    }
  } catch (error) {
    console.error('인증번호 요청 실패:', error);
    alert('서버와 통신 중 오류가 발생했습니다.');
    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = '인증번호 발송';
  }
});

// 2단계: 인증번호 확인 및 실제 비밀번호 재설정 확정
resetConfirmForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const token = document.getElementById('token').value.trim();
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // 프론트엔드 1차 검증: 비밀번호 일치 여부
  if (newPassword !== confirmPassword) {
    alert('새로운 비밀번호가 서로 일치하지 않습니다.');
    return;
  }

  try {
    const res = await AuthApi.resetPassword(email, token, newPassword);
    if (res && res.success) {
      alert(res.message || '비밀번호가 성공적으로 변경되었습니다. 새로운 비밀번호로 로그인해 주세요.');
      location.replace('./login.html'); // 성공 시 즉시 로그인 화면으로 대체
    } else {
      alert(res?.message || '비밀번호 변경에 실패했습니다. 인증번호 유효시간(3분)을 확인해 주세요.');
    }
  } catch (error) {
    console.error('비밀번호 재설정 실패:', error);
    alert('서버와 통신 중 오류가 발생했습니다.');
  }
});