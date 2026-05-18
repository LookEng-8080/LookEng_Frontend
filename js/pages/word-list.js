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
let searchKeyword  = '';      // 현재 검색어 (비어있으면 전체 목록)
let searchDebounce = null;    // 디바운스 타이머

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

    // 검색 결과 페이지네이션
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

// ── 검색어에 따라 목록 또는 검색 결과 표시 ───────────────────
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

  return `
    <div class="word-card-wrapper ${memorizedClass}" data-word-id="${word.id}">
      <div class="word-card">
        <div class="word-card__face word-card__front">
          <div class="word-card__front-top">
            <h2 class="word-card__english en">${escapeHtml(word.english)}</h2>
            ${posLabel ? `<span class="pos-badge ${posClass}">${escapeHtml(posLabel)}</span>` : ''}
          </div>
          <p class="word-card__sentence">${sentence}</p>
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

// ── 이벤트 위임 — 카드 클릭 & 암기완료 버튼 ──────────────────
document.getElementById('wordGrid').addEventListener('click', (e) => {
  const memorizeBtn = e.target.closest('.memorize-btn');
  if (memorizeBtn) {
    e.stopPropagation();
    toggleMemorized(memorizeBtn.dataset.wordId);
    return;
  }

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

  // 300ms 디바운스
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

// ── 정렬 셀렉터 (검색 중엔 비활성) ───────────────────────────
sortSelect.addEventListener('change', (e) => {
  if (searchKeyword.trim()) return; // 검색 중엔 정렬 무시
  loadWords(0, e.target.value);
});

// ── 초기 로드 ─────────────────────────────────────────────────
loadWords(0);
