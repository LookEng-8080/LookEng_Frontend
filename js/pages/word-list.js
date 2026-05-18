import { WordApi, UserWordApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, buildSidebar, renderPagination, getPosClass } from '../utils.js';

auth.requireLogin();
buildSidebar('word-list');

// ADMIN이면 단어 추가 버튼 노출
if (auth.isAdmin()) {
  document.getElementById('addWordBtn').hidden = false;
}

// ADMIN은 학습 기능(필터 탭) 미노출
if (auth.isAdmin()) {
  document.getElementById('filterTabs').hidden = true;
}

// ── 상수 ─────────────────────────────────────────────────────
const PAGE_SIZE = 20;

// ── 상태 ─────────────────────────────────────────────────────
let currentPage    = 0;
let currentSort    = 'english,asc';
let totalElements  = 0;
let memorizedCount = 0;
let currentFilter  = 'all'; // 'all' | 'bookmarked' | 'memorized'
let filteredWords  = [];
let searchKeyword  = '';
let searchDebounce = null;

// ── DOM 참조 ──────────────────────────────────────────────────
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const sortSelect  = document.getElementById('sortSelect');

// ── 진도 바 ──────────────────────────────────────────────────
function updateProgress() {
  const pct = totalElements > 0 ? Math.round((memorizedCount / totalElements) * 100) : 0;
  document.getElementById('progressFill').style.width = `${pct}%`;
  document.getElementById('progressCount').textContent = `암기완료 ${memorizedCount} / ${totalElements}`;
}

// ── 전체 단어 로드 (페이지네이션) ────────────────────────────
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

// ── 필터 단어 로드 (북마크/암기완료) ─────────────────────────
async function loadFilteredWords(type) {
  try {
    const res = type === 'bookmarked'
      ? await UserWordApi.getBookmarked()
      : await UserWordApi.getMemorized();

    if (!res || !res.success) {
      showToast(res?.message || '단어 목록을 불러오지 못했습니다.', 'error');
      return;
    }

    // 필터 유형에 맞게 isBookmarked/isMemorized 기본값 보장
    filteredWords = (res.data || []).map(w => ({
      ...w,
      isBookmarked: type === 'bookmarked' ? true : (w.isBookmarked ?? false),
      isMemorized:  type === 'memorized'  ? true : (w.isMemorized  ?? false),
    }));
    document.getElementById('totalCount').textContent = `총 ${filteredWords.length}개`;
    renderWordGrid(sortWords(filteredWords, currentSort));
    document.getElementById('pagination').innerHTML = '';
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// ── 카드 렌더링 ───────────────────────────────────────────────
function renderWordGrid(words) {
  const grid = document.getElementById('wordGrid');

  if (words.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📭</div>
        <div class="empty-state__title">단어가 없습니다.</div>
      </div>`;
    return;
  }

  grid.innerHTML = words.map(buildWordCard).join('');
}

function buildWordCard(word) {
  // 일반 목록은 id, 필터 목록(BookmarkedWordDto/MemorizedWordDto)은 wordId
  const wordId = word.id ?? word.wordId;
  const posClass = getPosClass(word.partOfSpeech);
  const posLabel = word.partOfSpeech || '';
  const memorizedClass = word.isMemorized ? 'word-card-wrapper--memorized' : '';
  const memorizeActive = word.isMemorized ? 'memorize-btn--on' : '';
  const bookmarkActive = word.isBookmarked ? 'bookmark-btn--on' : '';
  const sentence = word.exampleSentence ? escapeHtml(word.exampleSentence) : '';

  // pronunciationUrl 있으면 data 속성으로 전달
  const pronunciationAttr = word.pronunciationUrl
    ? `data-pronunciation-url="${escapeHtml(word.pronunciationUrl)}"`
    : '';

  // ADMIN에게는 학습 버튼 미노출
  const actionBtns = auth.isAdmin() ? '' : `
      <button class="memorize-btn ${memorizeActive}" data-word-id="${wordId}" title="암기완료 토글">✓</button>
      <button class="bookmark-btn ${bookmarkActive}" data-word-id="${wordId}" title="북마크 토글">★</button>`;

  return `
    <div class="word-card-wrapper ${memorizedClass}" data-word-id="${wordId}">
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
      ${actionBtns}
    </div>
  `;
}

function popBtn(btn) {
  if (!btn) return;
  btn.classList.remove('btn-pop');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => btn.classList.add('btn-pop'));
  });
  btn.addEventListener('animationend', () => btn.classList.remove('btn-pop'), { once: true });
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

  btn.classList.add('pronunciation-btn--playing');
  const restore = () => btn.classList.remove('pronunciation-btn--playing');

  if (url) {
    const audio = new Audio(url);
    audio.play().catch(() => {
      speakTTS(english);
    });
    audio.addEventListener('ended', restore);
    audio.addEventListener('error', () => {
      restore();
      speakTTS(english);
    });
  } else {
    speakTTS(english, restore);
  }
}

function speakTTS(text, onEnd = null) {
  if (!window.speechSynthesis) {
    showToast('이 브라우저는 발음 청취를 지원하지 않습니다.', 'error');
    if (onEnd) onEnd();
    return;
  }

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

// ── 이벤트 위임 — 카드 클릭 & 버튼 ──────────────────────────
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

  // 3. 북마크 버튼
  const bookmarkBtn = e.target.closest('.bookmark-btn');
  if (bookmarkBtn) {
    e.stopPropagation();
    toggleBookmark(bookmarkBtn.dataset.wordId);
    return;
  }

  // 4. 카드 클릭 → 플립
  const wrapper = e.target.closest('.word-card-wrapper');
  if (wrapper) {
    const card = wrapper.querySelector('.word-card');
    card.classList.toggle('is-flipped');
  }
});

// ── 암기완료 토글 ─────────────────────────────────────────────
async function toggleMemorized(wordId) {
  try {
    const res = await UserWordApi.toggleMemorize(wordId);
    if (!res || !res.success) {
      showToast(res?.message || '오류가 발생했습니다.', 'error');
      return;
    }

    const isMemorized = res.data.isMemorized;

    // 1. 진도 카운트 업데이트
    memorizedCount += isMemorized ? 1 : -1;
    updateProgress();

    // 2. 카드 UI 업데이트
    const wrapper = document.querySelector(`.word-card-wrapper[data-word-id="${wordId}"]`);
    if (wrapper) {
      wrapper.classList.toggle('word-card-wrapper--memorized', isMemorized);
      const btn = wrapper.querySelector('.memorize-btn');
      if (btn) { btn.classList.toggle('memorize-btn--on', isMemorized); popBtn(btn); }
    }

    // 3. '암기완료' 필터 뷰에서 해제 시 카드 제거
    if (currentFilter === 'memorized' && !isMemorized) {
      wrapper?.remove();
      const remaining = document.querySelectorAll('.word-card-wrapper').length;
      document.getElementById('totalCount').textContent = `총 ${remaining}개`;
      if (remaining === 0) renderWordGrid([]);
    }
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// ── 북마크 토글 ───────────────────────────────────────────────
async function toggleBookmark(wordId) {
  try {
    const res = await UserWordApi.toggleBookmark(wordId);
    if (!res || !res.success) {
      showToast(res?.message || '오류가 발생했습니다.', 'error');
      return;
    }

    const isBookmarked = res.data.isBookmarked;

    // 1. 카드 UI 업데이트
    const wrapper = document.querySelector(`.word-card-wrapper[data-word-id="${wordId}"]`);
    if (wrapper) {
      const btn = wrapper.querySelector('.bookmark-btn');
      if (btn) { btn.classList.toggle('bookmark-btn--on', isBookmarked); popBtn(btn); }
    }

    // 2. '북마크' 필터 뷰에서 해제 시 카드 제거
    if (currentFilter === 'bookmarked' && !isBookmarked) {
      wrapper?.remove();
      const remaining = document.querySelectorAll('.word-card-wrapper').length;
      document.getElementById('totalCount').textContent = `총 ${remaining}개`;
      if (remaining === 0) renderWordGrid([]);
    }
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// ── 필터 탭 ──────────────────────────────────────────────────
document.getElementById('filterTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.filter-tab');
  if (!tab || tab.dataset.filter === currentFilter) return;

  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('filter-tab--active'));
  tab.classList.add('filter-tab--active');
  currentFilter = tab.dataset.filter;

  document.getElementById('pagination').innerHTML = '';

  if (currentFilter === 'all') {
    loadWords(0, currentSort);
  } else {
    loadFilteredWords(currentFilter);
  }
});

// ── 클라이언트 정렬 ───────────────────────────────────────────
function sortWords(words, sort) {
  if (!words || words.length === 0) return words;
  const dir = sort.endsWith('desc') ? -1 : 1;
  return [...words].sort((a, b) => {
    const va = (a.english || '').toLowerCase();
    const vb = (b.english || '').toLowerCase();
    return dir * va.localeCompare(vb);
  });
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
  currentSort = e.target.value;
  if (searchKeyword.trim()) return;
  if (currentFilter === 'all') {
    loadWords(0, currentSort);
  } else if (filteredWords.length > 0) {
    renderWordGrid(sortWords(filteredWords, currentSort));
  } else {
    loadFilteredWords(currentFilter);
  }
});

// ── 초기 로드 ─────────────────────────────────────────────────
async function init() {
  // 1. 단어 목록과 암기완료 목록을 병렬 조회
  const [wordsRes, memorizedRes] = await Promise.all([
    WordApi.getList(0, PAGE_SIZE, currentSort).catch(() => null),
    auth.isAdmin() ? Promise.resolve(null) : UserWordApi.getMemorized().catch(() => null),
  ]);

  if (!wordsRes || !wordsRes.success) {
    showToast(wordsRes?.message || '단어 목록을 불러오지 못했습니다.', 'error');
    return;
  }

  const { content, totalElements: total, totalPages } = wordsRes.data;
  totalElements = total;
  memorizedCount = memorizedRes?.success ? (memorizedRes.data || []).length : 0;

  document.getElementById('totalCount').textContent = `총 ${total}개`;
  renderWordGrid(content);
  updateProgress();
  renderPagination(
    document.getElementById('pagination'),
    0,
    totalPages,
    (p) => loadWords(p, currentSort)
  );
}

init();
