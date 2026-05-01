import { TestApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, buildSidebar, renderPagination, formatDate, formatDuration } from '../utils.js';

auth.requireLogin();
buildSidebar('test');

const PAGE_SIZE = 10;

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
        <td colspan="5" class="empty-state">아직 테스트 기록이 없습니다.</td>
      </tr>`;
    return;
  }

  const quizTypeLabel = { SHORT_ANSWER: '주관식', MULTIPLE_CHOICE: '객관식' };

  tbody.innerHTML = records.map(r => `
    <tr>
      <td>${formatDate(r.startedAt)}</td>
      <td>${quizTypeLabel[r.quizType] ?? r.quizType}</td>
      <td>${r.totalCount}문제</td>
      <td><strong>${r.accuracy}%</strong></td>
      <td>${formatDuration(r.durationSec)}</td>
    </tr>
  `).join('');
}

loadHistory(0);
