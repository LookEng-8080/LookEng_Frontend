import { WordApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, buildSidebar, renderPagination, getPosClass } from '../utils.js';

auth.requireLogin();
buildSidebar('word-list');

// ADMIN이면 단어 추가 버튼 노출
if (auth.isAdmin()) {
  document.getElementById('addWordBtn').hidden = false;
}

// ── 상수 ─────────────────────────────────────────────────────
const PAGE_SIZE = 20;

// ── 상태 ─────────────────────────────────────────────────────
let currentPage    = 0;
let currentSort    = 'english,asc';
let totalElements  = 0;
let searchKeyword  = '';
let searchDebounce = null;

// ── DOM 참조 ──────────────────────────────────────────────────
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const sortSelect  = document.getElementById('sortSelect');

// ── 진도 바 ──────────────────────────────────────────────────
function getMemorizedCount() {
  return Object.keys(localStorage).filter(k => k.startsWith('memorized_')).length;
}

function updateProgress() {
  const memorized = getMemorizedCount();
  const pct = totalElements > 0 ? Math.round((memorized / totalElements) * 100) : 0;
  document.getElementById('progressFill').style.width = `${pct}%`;
  document.getElementById('progressCount').textContent = `암기완료 ${memorized} / ${totalElements}`;
}

// ── 단어 목록 로드 ────────────────────────────────────────────
async function loadWords(page = 0, sort = currentSort) {
  currentPage = page;
  currentSort = sort;

  try {
    const res = await WordApi.getList(page, PAGE_SIZE, sort);
    if (!res || !res.success) {
      showToast(res?.message || '단어 목록을 불러오지 못했습니다.', 'error');
      return;
    }

    const { content, totalElements: total, totalPages } = res.data;
    totalElements = total;

    document.getElementById('totalCount').textContent = `총 ${total}개`;
    renderWordGrid(content);
    updateProgress();
    renderPagination(
      document.getElementById('pagination'),
      page,
      totalPages,
      (p) => loadWords(p, currentSort)
    );
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// ── 단어 검색 ────────────────────────────────────────────────
async function searchWords(keyword, page = 0) {
  try {
    const res = await WordApi.search(keyword, page, PAGE_SIZE);
    if (!res || !res.success) {
      showToast(res?.message || '검색에 실패했습니다.', 'error');
      return;
    }

    const { content, pageInfo } = res.data;
    const total = pageInfo.totalElements;
    const totalPages = pageInfo.totalPages;

    document.getElementById('totalCount').textContent =
      `"${keyword}" 검색 결과 ${total}개`;

    renderWordGrid(content);

    renderPagination(
      document.getElementById('pagination'),
      page,
      totalPages,
      (p) => searchWords(keyword, p)
    );
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

function loadByKeyword(keyword, page = 0) {
  if (keyword.trim()) {
    searchWords(keyword.trim(), page);
  } else {
    loadWords(page, currentSort);
  }
}

// ── 카드 렌더링 ───────────────────────────────────────────────
function renderWordGrid(words) {
  const grid = document.getElementById('wordGrid');

  if (words.length === 0) {
    grid.innerHTML = '<div class="empty-state">단어가 없습니다.</div>';
    return;
  }

  grid.innerHTML = words.map(buildWordCard).join('');
}

function buildWordCard(word) {
  const posClass = getPosClass(word.partOfSpeech);
  const posLabel = word.partOfSpeech || '';
  const memorized = localStorage.getItem(`memorized_${word.id}`) === '1';
  const memorizedClass = memorized ? 'word-card-wrapper--memorized' : '';
  const sentence = word.exampleSentence ? escapeHtml(word.exampleSentence) : '';

  // pronunciationUrl 있으면 data 속성으로 전달
  const pronunciationAttr = word.pronunciationUrl
    ? `data-pronunciation-url="${escapeHtml(word.pronunciationUrl)}"`
    : '';

  return `
    <div class="word-card-wrapper ${memorizedClass}" data-word-id="${word.id}">
      <div class="word-card">
        <div class="word-card__face word-card__front">
          <div class="word-card__front-top">
            <h2 class="word-card__english en">${escapeHtml(word.english)}</h2>
            ${posLabel ? `<span class="pos-badge ${posClass}">${escapeHtml(posLabel)}</span>` : ''}
          </div>
          <p class="word-card__sentence">${sentence}</p>
          <div class="word-card__bottom">
            <button
              class="pronunciation-btn"
              data-english="${escapeHtml(word.english)}"
              ${pronunciationAttr}
              title="발음 듣기"
              aria-label="${escapeHtml(word.english)} 발음 듣기"
            >🔊</button>
          </div>
        </div>
        <div class="word-card__face word-card__back">
          <p class="word-card__meaning">${escapeHtml(word.korean)}</p>
        </div>
      </div>
      <button class="memorize-btn" data-word-id="${word.id}" title="암기완료 토글">✓</button>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 발음 재생 ────────────────────────────────────────────────
function playPronunciation(btn) {
  const english = btn.dataset.english;
  const url     = btn.dataset.pronunciationUrl;

  // 재생 중 표시
  btn.classList.add('pronunciation-btn--playing');
  const restore = () => btn.classList.remove('pronunciation-btn--playing');

  if (url) {
    // pronunciationUrl 있으면 오디오 파일 재생
    const audio = new Audio(url);
    audio.play().catch(() => {
      // 오디오 재생 실패 시 TTS로 대체
      speakTTS(english);
    });
    audio.addEventListener('ended', restore);
    audio.addEventListener('error', () => {
      restore();
      speakTTS(english);
    });
  } else {
    // pronunciationUrl 없으면 Web Speech API TTS 재생
    speakTTS(english, restore);
  }
}

function speakTTS(text, onEnd = null) {
  if (!window.speechSynthesis) {
    showToast('이 브라우저는 발음 청취를 지원하지 않습니다.', 'error');
    if (onEnd) onEnd();
    return;
  }

  // 이전 발음 중지
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = 'en-US';
  utterance.rate  = 0.9;
  utterance.pitch = 1;

  if (onEnd) {
    utterance.addEventListener('end',   onEnd);
    utterance.addEventListener('error', onEnd);
  }

  window.speechSynthesis.speak(utterance);
}

// ── 이벤트 위임 — 카드 클릭 & 암기완료 버튼 & 발음 버튼 ─────
document.getElementById('wordGrid').addEventListener('click', (e) => {
  // 1. 발음 버튼
  const pronunciationBtn = e.target.closest('.pronunciation-btn');
  if (pronunciationBtn) {
    e.stopPropagation();
    playPronunciation(pronunciationBtn);
    return;
  }

  // 2. 암기완료 버튼
  const memorizeBtn = e.target.closest('.memorize-btn');
  if (memorizeBtn) {
    e.stopPropagation();
    toggleMemorized(memorizeBtn.dataset.wordId);
    return;
  }

  // 3. 카드 클릭 → 플립
  const wrapper = e.target.closest('.word-card-wrapper');
  if (wrapper) {
    const card = wrapper.querySelector('.word-card');
    card.classList.toggle('is-flipped');
  }
});

function toggleMemorized(wordId) {
  const key = `memorized_${wordId}`;
  const isMemorized = localStorage.getItem(key) === '1';

  if (isMemorized) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, '1');
  }

  const wrapper = document.querySelector(`[data-word-id="${wordId}"].word-card-wrapper`);
  if (wrapper) {
    wrapper.classList.toggle('word-card-wrapper--memorized', !isMemorized);
  }

  updateProgress();
}

// ── 검색창 이벤트 ─────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  const keyword = searchInput.value;
  searchClear.hidden = keyword.length === 0;

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchKeyword = keyword;
    loadByKeyword(keyword, 0);
  }, 300);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(searchDebounce);
    searchKeyword = searchInput.value;
    loadByKeyword(searchKeyword, 0);
  }
  if (e.key === 'Escape') {
    clearSearch();
  }
});

searchClear.addEventListener('click', clearSearch);

function clearSearch() {
  searchInput.value = '';
  searchClear.hidden = true;
  searchKeyword = '';
  loadWords(0, currentSort);
}

// ── 정렬 셀렉터 ───────────────────────────────────────────────
sortSelect.addEventListener('change', (e) => {
  if (searchKeyword.trim()) return;
  loadWords(0, e.target.value);
});

// ── 초기 로드 ─────────────────────────────────────────────────
loadWords(0);
