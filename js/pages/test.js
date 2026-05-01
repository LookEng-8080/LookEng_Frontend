import { TestApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, formatDuration, buildSidebar } from '../utils.js';

auth.requireLogin();
buildSidebar('test');

// ── 상태 ─────────────────────────────────────────────────────
let sessionId       = null;
let totalCount      = 10;
let currentIndex    = 0;
let currentQuestion = null;
let startTime       = null;

// ── 화면 전환 ─────────────────────────────────────────────────
function showView(id) {
  ['setupView', 'quizView', 'resultView'].forEach(v => {
    document.getElementById(v).hidden = v !== id;
  });
}

// ── 설정 화면 ─────────────────────────────────────────────────
const slider       = document.getElementById('totalCountSlider');
const countDisplay = document.getElementById('totalCountDisplay');

slider.addEventListener('input', () => {
  totalCount = Number(slider.value);
  countDisplay.textContent = totalCount;
});

document.getElementById('startBtn').addEventListener('click', startTest);

async function startTest() {
  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  btn.textContent = '불러오는 중...';

  try {
    const res = await TestApi.start(totalCount, 'SHORT_ANSWER');
    if (!res || !res.success) {
      showToast(res?.message || '테스트를 시작할 수 없습니다.', 'error');
      return;
    }

    sessionId    = res.data.sessionId;
    totalCount   = res.data.totalCount;
    currentIndex = 0;
    startTime    = Date.now();

    initDots(totalCount);
    showView('quizView');
    renderQuestion(res.data.question);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '시작하기';
  }
}

// ── 문제 렌더링 (한글 뜻 표시 → 영단어 입력) ──────────────────
function renderQuestion(question) {
  currentQuestion = question;

  document.getElementById('qPos').textContent      = question.partOfSpeech || '';
  document.getElementById('qWord').textContent     = question.korean;
  document.getElementById('qSentence').textContent = question.exampleSentence || '';

  const progressPct = Math.round((currentIndex / totalCount) * 100);
  document.getElementById('progressText').textContent = `${currentIndex + 1} / ${totalCount}`;
  document.getElementById('progressFill').style.width = `${progressPct}%`;

  const input = document.getElementById('answerInput');
  input.value = '';
  input.disabled = false;
  input.focus();

  const confirmBtn = document.getElementById('confirmBtn');
  confirmBtn.disabled = false;
  confirmBtn.textContent = '확인';
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

// ── 답안 제출 ────────────────────────────────────────────────
async function submitAnswer(userInput) {
  const confirmBtn = document.getElementById('confirmBtn');
  const input      = document.getElementById('answerInput');
  confirmBtn.disabled = true;
  input.disabled      = true;

  try {
    const res = await TestApi.submitAnswer(sessionId, currentQuestion.wordId, userInput);
    if (!res || !res.success) {
      showToast(res?.message || '오류가 발생했습니다.', 'error');
      confirmBtn.disabled = false;
      input.disabled      = false;
      return;
    }

    // Jackson boolean 직렬화: isCorrect→correct, isFinished→finished
    const { correct, finished, nextQuestion } = res.data;

    showFeedback(correct);
    updateDot(currentIndex, correct);

    setTimeout(async () => {
      if (finished) {
        await finishTest();
      } else {
        currentIndex++;
        renderQuestion(nextQuestion);
      }
    }, 800);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
    confirmBtn.disabled = false;
    input.disabled      = false;
  }
}

// ── 정/오답 피드백 ────────────────────────────────────────────
function showFeedback(isCorrect) {
  const input = document.getElementById('answerInput');
  input.style.borderColor = isCorrect ? 'var(--color-success)' : 'var(--color-danger)';
  setTimeout(() => { input.style.borderColor = ''; }, 700);
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
  const { totalCount: total, correctCount, accuracy, durationSec, wrongWords } = data;

  document.getElementById('resultAccuracy').textContent = `${accuracy}%`;
  document.getElementById('resultSummary').textContent  = `${total}문제 중 ${correctCount}개 정답`;
  document.getElementById('resultCorrect').textContent  = `${correctCount} / ${total}`;
  document.getElementById('resultDuration').textContent = formatDuration(durationSec);

  const wrongSection = document.getElementById('wrongAnswerSection');
  if (wrongWords && wrongWords.length > 0) {
    wrongSection.hidden = false;
    // 퀴즈 방향: 한글 뜻 표시 → 영단어 입력
    // wrongWords[i]: { english(정답), korean(출제된 한글 뜻), userInput(내 답) }
    document.getElementById('wrongAnswerBody').innerHTML = wrongWords.map(w =>
      `<tr>
        <td>${escapeHtml(w.korean ?? '-')}</td>
        <td class="wrong-answer">${escapeHtml(w.userInput ?? '-')}</td>
        <td class="correct-answer en">${escapeHtml(w.english ?? '-')}</td>
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
