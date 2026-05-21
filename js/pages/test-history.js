import { TestApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, buildSidebar, renderPagination, formatDate, formatDuration } from '../utils.js';

auth.requireLogin();
buildSidebar('test-history');

const PAGE_SIZE = 10;

const QUIZ_TYPE_LABEL = { SHORT_ANSWER: '주관식', MULTIPLE_CHOICE: '객관식', FILL_IN_BLANK: '빈칸채우기' };

async function loadHistory(page = 0) {
  try {
    const res = await TestApi.getHistory(page, PAGE_SIZE);
    if (!res || !res.success) {
      showToast(res?.message || '기록을 불러오지 못했습니다.', 'error');
      return;
    }

    const { content, totalPages } = res.data;
    renderTable(content);
    renderPagination(
      document.getElementById('pagination'),
      page,
      totalPages,
      loadHistory
    );
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

function renderTable(records) {
  const tbody = document.getElementById('historyBody');

  if (!records || records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">아직 테스트 기록이 없습니다.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td>${formatDate(r.startedAt)}</td>
      <td><span class="session-row__type">${QUIZ_TYPE_LABEL[r.quizType] ?? r.quizType}</span></td>
      <td>${r.totalCount}문제</td>
      <td><strong>${r.accuracy}%</strong></td>
      <td>${formatDuration(r.durationSec)}</td>
      <td>
        <button class="btn btn--sm btn--secondary detail-btn"
                data-session-id="${r.sessionId}">상세</button>
      </td>
    </tr>
  `).join('');
}

loadHistory(0);

// ── 상세 모달 DOM 참조 ──────────────────────────────────────────
const detailModal      = document.getElementById('detailModal');
const detailModalTitle = document.getElementById('detailModalTitle');
const detailSummary    = document.getElementById('detailSummary');
const detailAnswerBody = document.getElementById('detailAnswerBody');

// ── 상세 모달 열기 ─────────────────────────────────────────────
async function openDetailModal(sessionId) {
  detailModalTitle.textContent = '불러오는 중…';
  detailSummary.innerHTML = '';
  detailAnswerBody.innerHTML = '<tr><td colspan="5" class="empty-state">불러오는 중…</td></tr>';
  detailModal.classList.add('is-open');

  try {
    const res = await TestApi.getSessionDetail(sessionId);
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

// ── 상세 모달 렌더링 ────────────────────────────────────────────
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

// ── 상세 모달 닫기 ─────────────────────────────────────────────
function closeDetailModal() {
  detailModal.classList.remove('is-open');
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────
document.getElementById('historyBody').addEventListener('click', (e) => {
  const btn = e.target.closest('.detail-btn');
  if (!btn) return;
  openDetailModal(Number(btn.dataset.sessionId));
});

document.getElementById('detailModalClose').addEventListener('click', closeDetailModal);
document.getElementById('detailModalCloseBtn').addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetailModal(); });
