import { AdminApi } from '../../api.js';
import { auth } from '../../auth.js';
import { showToast, buildSidebar, formatDate, formatDuration } from '../../utils.js';

// 1. 진입 보호
auth.requireAdmin();

// 2. 사이드바 렌더링
buildSidebar('admin-quiz');

// ── 상태 ─────────────────────────────────────────────────────
const QUIZ_TYPE_LABEL = {
  SHORT_ANSWER: '주관식',
  MULTIPLE_CHOICE: '객관식',
  FILL_IN_BLANK: '빈칸채우기',
};

// ── DOM 참조 ─────────────────────────────────────────────────
const userGrid      = document.getElementById('userGrid');
const sessionsModal = document.getElementById('sessionsModal');
const modalUserName = document.getElementById('modalUserName');
const sessionList   = document.getElementById('sessionList');

const detailModal      = document.getElementById('detailModal');
const detailModalTitle = document.getElementById('detailModalTitle');
const detailSummary    = document.getElementById('detailSummary');
const detailAnswerBody = document.getElementById('detailAnswerBody');

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
  modalUserName.textContent = `${userName}의 테스트 기록`;
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
    sessionList.innerHTML = '<div class="session-list__empty">테스트 기록이 없습니다.</div>';
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
        <button class="btn btn--sm btn--primary detail-btn"
                data-session-id="${r.sessionId}">상세</button>
      </div>
    `;
  }).join('');
}

// ── 세션 상세 모달 오픈 ───────────────────────────────────────
async function openDetailModal(sessionId) {
  detailModalTitle.textContent = '불러오는 중…';
  detailSummary.innerHTML = '';
  detailAnswerBody.innerHTML = '<tr><td colspan="5" class="empty-state">불러오는 중…</td></tr>';
  detailModal.classList.add('is-open');

  try {
    const res = await AdminApi.getSessionDetail(sessionId);
    if (!res || !res.success) {
      showToast(res?.message || '상세 정보를 불러오지 못했습니다.', 'error');
      closeDetailModal();
      return;
    }
    renderDetailModal(res.data);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
    closeDetailModal();
  }
}

// ── 세션 상세 모달 렌더링 ─────────────────────────────────────
function renderDetailModal(data) {
  detailModalTitle.textContent =
    `${formatDate(data.createdAt)} — ${QUIZ_TYPE_LABEL[data.quizType] ?? data.quizType}`;

  detailSummary.innerHTML = `
    <div class="detail-summary__item">
      <span class="detail-summary__label">유형</span>
      <span class="detail-summary__value">
        <span class="session-row__type">${QUIZ_TYPE_LABEL[data.quizType] ?? data.quizType}</span>
      </span>
    </div>
    <div class="detail-summary__item">
      <span class="detail-summary__label">점수</span>
      <span class="detail-summary__value">${data.score} / ${data.totalQuestions}</span>
    </div>
    <div class="detail-summary__item">
      <span class="detail-summary__label">정답</span>
      <span class="detail-summary__value detail-summary__value--correct">${data.correctCount}</span>
    </div>
    <div class="detail-summary__item">
      <span class="detail-summary__label">오답</span>
      <span class="detail-summary__value detail-summary__value--wrong">${data.incorrectCount}</span>
    </div>
  `;

  if (!data.answers?.length) {
    detailAnswerBody.innerHTML = '<tr><td colspan="5" class="empty-state">답안 데이터가 없습니다.</td></tr>';
    return;
  }

  detailAnswerBody.innerHTML = data.answers.map(a => `
    <tr>
      <td>${a.sequence}</td>
      <td class="en">${a.english}</td>
      <td>${a.korean}</td>
      <td class="${a.correct ? '' : 'wrong-answer'}">${a.userAnswer ?? '(미입력)'}</td>
      <td>${a.correct
        ? '<span style="color:var(--color-success);font-weight:700">✓</span>'
        : '<span style="color:var(--color-danger);font-weight:700">✗</span>'}</td>
    </tr>
  `).join('');
}

// ── 모달 닫기 ─────────────────────────────────────────────────
function closeDetailModal() {
  detailModal.classList.remove('is-open');
}

function closeSessionModal() {
  sessionsModal.classList.remove('is-open');
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────

// 유저 카드 클릭 (이벤트 위임)
userGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.user-card');
  if (!card) return;
  openSessionModal(Number(card.dataset.userId), card.dataset.userName);
});

// 세션 목록 → 상세 버튼 클릭 (이벤트 위임)
sessionList.addEventListener('click', (e) => {
  const btn = e.target.closest('.detail-btn');
  if (!btn) return;
  openDetailModal(Number(btn.dataset.sessionId));
});

// 세션 모달 닫기
document.getElementById('modalClose').addEventListener('click', closeSessionModal);
document.getElementById('modalCloseBtn').addEventListener('click', closeSessionModal);
sessionsModal.addEventListener('click', (e) => {
  if (e.target === sessionsModal) closeSessionModal();
});

// 상세 모달 닫기
document.getElementById('detailModalClose').addEventListener('click', closeDetailModal);
document.getElementById('detailModalCloseBtn').addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) closeDetailModal();
});

// ESC 키: 상세 모달 열려 있으면 상세만, 아니면 세션 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (detailModal.classList.contains('is-open')) {
    closeDetailModal();
  } else {
    closeSessionModal();
  }
});

// ── 초기 로드 ────────────────────────────────────────────────
loadUsers();
