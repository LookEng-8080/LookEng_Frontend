import { TestApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, formatDuration } from '../utils.js';

auth.requireLogin();

// ── 오늘 날짜 표시 ────────────────────────────────────────────
(function setDate() {
  const d = new Date();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  document.getElementById('todayDate').textContent =
    `${month}월 ${day}일 (${weekdays[d.getDay()]})`;
})();

// ── 로그아웃 ─────────────────────────────────────────────────
import { AuthApi } from '../api.js';
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try { await AuthApi.logout(); } catch (_) {}
  auth.clearSession();
  location.replace('./login.html');
});

// ── 상태 ─────────────────────────────────────────────────────
let sessionId      = null;
let totalCount     = 10;
let quizType       = 'SHORT_ANSWER';
let currentIndex   = 0;
let currentQuestion = null;
let startTime      = null;

// ── 화면 전환 ─────────────────────────────────────────────────
function showView(id) {
  ['setupView', 'quizView', 'resultView'].forEach(v => {
    document.getElementById(v).hidden = v !== id;
  });
}

// ── 설정 화면 ─────────────────────────────────────────────────
const slider      = document.getElementById('totalCountSlider');
const countDisplay = document.getElementById('totalCountDisplay');

slider.addEventListener('input', () => {
  totalCount = Number(slider.value);
  countDisplay.textContent = totalCount;
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
    chip.classList.add('chip--active');
    quizType = chip.dataset.type;
  });
});

document.getElementById('startBtn').addEventListener('click', startTest);

async function startTest() {
  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  btn.textContent = '불러오는 중...';

  try {
    const res = await TestApi.start(totalCount, quizType);
    if (!res || !res.success) {
      showToast(res?.message || '테스트를 시작할 수 없습니다.', 'error');
      return;
    }

    sessionId      = res.data.sessionId;
    totalCount     = res.data.totalCount;
    currentIndex   = 0;
    startTime      = Date.now();

    initDots(totalCount);
    showView('quizView');
    renderQuestion(res.data.currentQuestion);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '시작하기';
  }
}

// ── 문제 렌더링 ───────────────────────────────────────────────
function renderQuestion(question) {
  currentQuestion = question;

  document.getElementById('qPos').textContent      = question.pronunciation || '';
  document.getElementById('qWord').textContent     = question.english;
  document.getElementById('qSentence').textContent = question.exampleSentence || '';

  const progressPct = Math.round((currentIndex / totalCount) * 100);
  document.getElementById('progressText').textContent = `${currentIndex + 1} / ${totalCount}`;
  document.getElementById('progressFill').style.width = `${progressPct}%`;

  if (quizType === 'SHORT_ANSWER') {
    document.getElementById('shortAnswerArea').hidden    = false;
    document.getElementById('multipleChoiceArea').hidden = true;
    const input = document.getElementById('answerInput');
    input.value = '';
    input.disabled = false;
    input.focus();
    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.disabled = false;
    confirmBtn.textContent = '확인';
  } else {
    document.getElementById('shortAnswerArea').hidden    = true;
    document.getElementById('multipleChoiceArea').hidden = false;
    renderChoices(question);
  }
}

// ── 주관식 제출 ───────────────────────────────────────────────
document.getElementById('confirmBtn').addEventListener('click', () => {
  const val = document.getElementById('answerInput').value.trim();
  if (!val) return;
  submitAnswer(val);
});

document.getElementById('answerInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = document.getElementById('answerInput').value.trim();
    if (!val) return;
    submitAnswer(val);
  }
});

// ── 객관식 렌더링 ─────────────────────────────────────────────
function renderChoices(question) {
  const grid = document.getElementById('choicesGrid');
  // 백엔드에서 보기(choices)를 내려준다면 사용, 없으면 meaning만 정답으로
  const choices = question.choices || [question.meaning];
  grid.innerHTML = choices.map((choice, i) =>
    `<button class="choice-btn" data-index="${i}">${escapeHtml(choice)}</button>`
  ).join('');

  grid.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
      btn.classList.add('selected');
      submitAnswer(btn.textContent);
    });
  });
}

// ── 답안 제출 공통 ────────────────────────────────────────────
async function submitAnswer(userAnswer) {
  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) confirmBtn.disabled = true;

  const input = document.getElementById('answerInput');
  if (input) input.disabled = true;

  try {
    const res = await TestApi.submitAnswer(sessionId, currentQuestion.wordId, userAnswer);
    if (!res || !res.success) {
      showToast(res?.message || '오류가 발생했습니다.', 'error');
      if (confirmBtn) confirmBtn.disabled = false;
      if (input) input.disabled = false;
      return;
    }

    const { isCorrect, isFinished, currentQuestion: nextQuestion } = res.data;

    showFeedback(isCorrect);
    updateDot(currentIndex, isCorrect);

    setTimeout(async () => {
      if (isFinished) {
        await finishTest();
      } else {
        currentIndex++;
        renderQuestion(nextQuestion);
      }
    }, 800);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
    if (confirmBtn) confirmBtn.disabled = false;
    if (input) input.disabled = false;
  }
}

// ── 정/오답 피드백 ────────────────────────────────────────────
function showFeedback(isCorrect) {
  if (quizType === 'MULTIPLE_CHOICE') {
    const grid = document.getElementById('choicesGrid');
    grid.querySelectorAll('.choice-btn.selected').forEach(btn => {
      btn.classList.add(isCorrect ? 'correct' : 'wrong');
    });
  }
  // 주관식은 배경색 토글
  const input = document.getElementById('answerInput');
  if (input) {
    input.style.borderColor = isCorrect ? 'var(--color-success)' : 'var(--color-danger)';
    setTimeout(() => { input.style.borderColor = ''; }, 700);
  }
}

// ── 도트 인디케이터 ───────────────────────────────────────────
function initDots(count) {
  const container = document.getElementById('quizDots');
  container.innerHTML = Array.from({ length: count }, (_, i) =>
    `<div class="quiz-dot ${i === 0 ? 'quiz-dot--current' : ''}" id="dot-${i}"></div>`
  ).join('');
}

function updateDot(index, isCorrect) {
  const dot = document.getElementById(`dot-${index}`);
  if (!dot) return;
  dot.classList.remove('quiz-dot--current');
  dot.classList.add(isCorrect ? 'quiz-dot--correct' : 'quiz-dot--wrong');
  dot.textContent = isCorrect ? '✓' : '✗';

  const next = document.getElementById(`dot-${index + 1}`);
  if (next) next.classList.add('quiz-dot--current');
}

// ── 테스트 종료 ───────────────────────────────────────────────
async function finishTest() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);

  try {
    const res = await TestApi.finish(sessionId, elapsed);
    if (!res || !res.success) {
      showToast(res?.message || '결과를 불러오지 못했습니다.', 'error');
      return;
    }
    renderResult(res.data);
    showView('resultView');
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

function renderResult(data) {
  const { totalCount: total, correctCount, accuracy, durationSec, wrongAnswers } = data;

  document.getElementById('resultAccuracy').textContent = `${accuracy}%`;
  document.getElementById('resultSummary').textContent  = `${total}문제 중 ${correctCount}개 정답`;
  document.getElementById('resultCorrect').textContent  = `${correctCount} / ${total}`;
  document.getElementById('resultDuration').textContent = formatDuration(durationSec);

  const wrongSection = document.getElementById('wrongAnswerSection');
  if (wrongAnswers && wrongAnswers.length > 0) {
    wrongSection.hidden = false;
    document.getElementById('wrongAnswerBody').innerHTML = wrongAnswers.map(w =>
      `<tr>
        <td class="en">${escapeHtml(w.english)}</td>
        <td class="wrong-answer">${escapeHtml(w.userAnswer ?? '-')}</td>
        <td class="correct-answer">${escapeHtml(w.correctAnswer ?? w.meaning ?? '-')}</td>
      </tr>`
    ).join('');
  } else {
    wrongSection.hidden = true;
  }
}

// ── 그만하기 버튼 ─────────────────────────────────────────────
document.getElementById('quitBtn').addEventListener('click', () => {
  if (confirm('테스트를 그만하시겠습니까? 진행 기록은 저장되지 않습니다.')) {
    resetSetup();
    showView('setupView');
  }
});

// ── 다시 시작 ─────────────────────────────────────────────────
document.getElementById('retryBtn').addEventListener('click', () => {
  resetSetup();
  showView('setupView');
});

function resetSetup() {
  sessionId    = null;
  currentIndex = 0;
  startTime    = null;
}

// ── 유틸 ─────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
