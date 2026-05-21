import { TestApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, buildSidebar, formatDate, formatDuration } from '../utils.js';

// 1. 인증 확인 및 사이드바 렌더링
auth.requireLogin();
buildSidebar('test-history');

// 2. URL 쿼리에서 세션 id 추출
const params = new URLSearchParams(location.search);
const sessionId = params.get('id');
if (!sessionId) {
  location.replace('test-history.html');
}

// 3. 뒤로가기 버튼 바인딩
document.getElementById('backBtn').addEventListener('click', () => {
  location.href = 'test-history.html';
});

const QUIZ_TYPE_LABEL = {
  SHORT_ANSWER: '주관식',
  MULTIPLE_CHOICE: '객관식',
  FILL_IN_BLANK: '빈칸채우기',
};

// 4. 상세 데이터 로드
async function loadDetail() {
  try {
    const res = await TestApi.getSessionDetail(sessionId);
    if (!res || !res.success) {
      showToast(res?.message || '세션을 불러오지 못했습니다.', 'error');
      return;
    }
    renderSummary(res.data);
    renderAnswers(res.data.answers);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// 5. 요약 카드 렌더링
function renderSummary(data) {
  document.getElementById('statDate').textContent     = formatDate(data.createdAt);
  document.getElementById('statType').textContent     = QUIZ_TYPE_LABEL[data.quizType] ?? data.quizType;
  document.getElementById('statTotal').textContent    = `${data.totalQuestions}문제`;
  document.getElementById('statCorrect').textContent  = `${data.correctCount}개`;
  document.getElementById('statIncorrect').textContent = `${data.incorrectCount}개`;
  document.getElementById('statDuration').textContent = formatDuration(data.elapsedSeconds);
}

// 6. 전체 답안 테이블 렌더링
function renderAnswers(answers) {
  const tbody = document.getElementById('answersBody');

  if (!answers || answers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">제출된 답안이 없습니다.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = answers.map(a => `
    <tr class="${a.isCorrect ? 'answer-row--correct' : 'answer-row--wrong'}">
      <td>${a.sequence}</td>
      <td class="en">${a.english}</td>
      <td>${a.korean}</td>
      <td class="${a.isCorrect ? '' : 'wrong-answer'}">${a.userAnswer ?? '—'}</td>
      <td>
        <span class="answer-badge ${a.isCorrect ? 'answer-badge--correct' : 'answer-badge--wrong'}">
          ${a.isCorrect ? '✓' : '✗'}
        </span>
      </td>
    </tr>
  `).join('');
}

loadDetail();
