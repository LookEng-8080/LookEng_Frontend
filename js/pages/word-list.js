import { WordApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, buildSidebar, renderPagination, getPosClass } from '../utils.js';

auth.requireLogin();
buildSidebar('word-list');

// ADMIN이면 단어 추가 버튼 노출
if (auth.isAdmin()) {
  document.getElementById('addWordBtn').hidden = false;
}

// ── 상태 ─────────────────────────────────────────────────────
const PAGE_SIZE = 20;
let currentPage = 0;
let currentSort = 'english,asc';
let totalElements = 0;

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

// ── 단어 로드 ─────────────────────────────────────────────────
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

// ── 카드 렌더링 ───────────────────────────────────────────────
function renderWordGrid(words) {
  const grid = document.getElementById('wordGrid');

  if (words.length === 0) {
    grid.innerHTML = '<div class="empty-state">등록된 단어가 없습니다.</div>';
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
  // 암기완료 버튼 클릭 → 플립 없이 상태만 토글
  const memorizeBtn = e.target.closest('.memorize-btn');
  if (memorizeBtn) {
    e.stopPropagation();
    toggleMemorized(memorizeBtn.dataset.wordId);
    return;
  }

  // 카드 클릭 → 플립
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

// ── 정렬 셀렉터 ───────────────────────────────────────────────
document.getElementById('sortSelect').addEventListener('change', (e) => {
  loadWords(0, e.target.value);
});

// ── 초기 로드 ─────────────────────────────────────────────────
loadWords(0);
