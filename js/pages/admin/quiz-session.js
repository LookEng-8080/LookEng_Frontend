import { AdminApi } from '../../api.js';
import { auth } from '../../auth.js';
import { showToast, buildSidebar, formatDate, formatDuration } from '../../utils.js';

// 1. 진입 보호
auth.requireAdmin();

// 2. 사이드바 렌더링
buildSidebar('admin-quiz');

// ── 상태 ─────────────────────────────────────────────────────
const QUIZ_TYPE_LABEL = { SHORT_ANSWER: '주관식', MULTIPLE_CHOICE: '객관식' };

// ── DOM 참조 ─────────────────────────────────────────────────
const userGrid      = document.getElementById('userGrid');
const sessionsModal = document.getElementById('sessionsModal');
const modalUserName = document.getElementById('modalUserName');
const sessionList   = document.getElementById('sessionList');

// ── 유저 목록 로드 ────────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await AdminApi.getUsers();
    if (!res || !res.success) {
      showToast(res?.message || '유저 목록을 불러오지 못했습니다.', 'error');
      return;
    }
    renderUserGrid(res.data.content);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// ── 유저 그리드 렌더링 ────────────────────────────────────────
function renderUserGrid(users) {
  const userOnly = users.filter(u => u.role === 'USER');

  if (!userOnly.length) {
    userGrid.innerHTML = '<div class="user-grid-empty">등록된 유저가 없습니다.</div>';
    return;
  }

  userGrid.innerHTML = userOnly.map(u => `
    <div class="user-card" data-user-id="${u.id}" data-user-name="${u.nickname || u.email}">
      <div class="user-card__name">${u.nickname || '(닉네임 없음)'}</div>
      <div class="user-card__meta">${u.email}</div>
    </div>
  `).join('');
}

// ── 유저 세션 기록 모달 오픈 ──────────────────────────────────
async function openSessionModal(userId, userName) {
  modalUserName.textContent = `${userName}의 퀴즈 기록`;
  sessionList.innerHTML = '<div class="session-list__loading">불러오는 중…</div>';
  sessionsModal.classList.add('is-open');

  try {
    const res = await AdminApi.getUserSessions(userId);
    if (!res || !res.success) {
      showToast(res?.message || '기록을 불러오지 못했습니다.', 'error');
      sessionsModal.classList.remove('is-open');
      return;
    }
    renderSessionList(res.data.content);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
    sessionsModal.classList.remove('is-open');
  }
}

// ── 세션 기록 렌더링 ──────────────────────────────────────────
function getAccuracyClass(accuracy) {
  if (accuracy >= 80) return 'session-row__accuracy--high';
  if (accuracy >= 50) return 'session-row__accuracy--mid';
  return 'session-row__accuracy--low';
}

function renderSessionList(records) {
  if (!records || !records.length) {
    sessionList.innerHTML = '<div class="session-list__empty">퀴즈 기록이 없습니다.</div>';
    return;
  }

  sessionList.innerHTML = records.map(r => {
    const typeLabel = QUIZ_TYPE_LABEL[r.quizType] ?? r.quizType;
    const accuracyClass = getAccuracyClass(r.accuracy);
    return `
      <div class="session-row">
        <span class="session-row__date">${formatDate(r.finishedAt || r.startedAt)}</span>
        <span class="session-row__type">${typeLabel}</span>
        <span class="session-row__count">${r.totalCount}문제</span>
        <span class="session-row__accuracy ${accuracyClass}">${r.accuracy}%</span>
        <span class="session-row__duration">${formatDuration(r.durationSec)}</span>
      </div>
    `;
  }).join('');
}

// ── 모달 닫기 ─────────────────────────────────────────────────
function closeModal() {
  sessionsModal.classList.remove('is-open');
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────

// 유저 카드 클릭 (이벤트 위임)
userGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.user-card');
  if (!card) return;
  openSessionModal(Number(card.dataset.userId), card.dataset.userName);
});

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCloseBtn').addEventListener('click', closeModal);

// 오버레이 클릭 시 닫기
sessionsModal.addEventListener('click', (e) => {
  if (e.target === sessionsModal) closeModal();
});

// ESC 키 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── 초기 로드 ────────────────────────────────────────────────
loadUsers();
