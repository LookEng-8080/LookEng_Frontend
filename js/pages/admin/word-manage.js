import { WordApi } from '../../api.js';
import { auth } from '../../auth.js';
import { showToast, buildSidebar, renderPagination, getPosClass } from '../../utils.js';

// 1. 진입 보호: 비로그인 → login.html, USER → 403.html
auth.requireAdmin();

// 2. 사이드바 렌더링
buildSidebar('admin-word');

// ── 상태 ─────────────────────────────────────────────────────
const PAGE_SIZE = 20;
let currentPage = 0;
let totalPages  = 0;
let editingWordId = null; // null이면 추가 모드, 숫자이면 수정 모드
let wordCache = {};       // { [id]: wordData } — 수정 시 기존 값 참조용

// ── DOM 참조 ─────────────────────────────────────────────────
const wordList    = document.getElementById('wordList');
const pagination  = document.getElementById('pagination');
const wordModal   = document.getElementById('wordModal');
const modalTitle  = document.getElementById('modalTitle');
const fieldEnglish      = document.getElementById('fieldEnglish');
const fieldMeaning      = document.getElementById('fieldMeaning');
const fieldPronunciation = document.getElementById('fieldPronunciation');
const fieldExample      = document.getElementById('fieldExample');

// ── 단어 목록 로드 ────────────────────────────────────────────
async function loadWords(page) {
  try {
    const res = await WordApi.getList(page, PAGE_SIZE);
    if (!res || !res.success) {
      showToast(res?.message || '단어 목록을 불러오지 못했습니다.', 'error');
      return;
    }
    const { content, totalPages: tp, currentPage: cp } = res.data;
    currentPage = cp ?? page;
    totalPages  = tp;

    content.forEach(w => { wordCache[w.id] = w; });

    renderWordList(content);
    renderPagination(pagination, currentPage, totalPages, (p) => loadWords(p));
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// ── 단어 카드 렌더링 ─────────────────────────────────────────
function renderWordList(words) {
  if (!words.length) {
    wordList.innerHTML = `
      <li class="word-list-empty">
        <div class="word-list-empty__icon">📝</div>
        <p class="word-list-empty__text">등록된 단어가 없습니다.</p>
      </li>`;
    return;
  }

  wordList.innerHTML = words.map(w => {
    const posClass = getPosClass(w.partOfSpeech || '');
    const posBadge = w.partOfSpeech
      ? `<span class="pos-badge ${posClass}">${w.partOfSpeech}</span>`
      : '';
    const example = w.exampleSentence
      ? `<p class="word-card__example">${w.exampleSentence}</p>`
      : '';
    return `
      <li class="word-card" data-word-id="${w.id}">
        <div class="word-card__top">
          <div class="word-card__front-top">
            <strong class="word-card__english en">${w.english}</strong>
            ${posBadge}
          </div>
          <div class="word-card__actions">
            <button class="btn btn--ghost btn--sm edit-btn" data-id="${w.id}">수정</button>
            <button class="btn btn--danger btn--sm delete-btn" data-id="${w.id}">삭제</button>
          </div>
        </div>
        <p class="word-card__korean">${w.korean ?? '-'}</p>
        ${example}
      </li>`;
  }).join('');
}

// ── 모달 열기/닫기 ─────────────────────────────────────────
function openModal(mode, word = null) {
  editingWordId = mode === 'edit' ? word.id : null;
  modalTitle.textContent = mode === 'edit' ? '단어 수정' : '단어 추가';

  if (mode === 'edit' && word) {
    fieldEnglish.value       = word.english        || '';
    fieldMeaning.value       = word.korean         || '';
    fieldPronunciation.value = word.pronunciation  || '';
    fieldExample.value       = word.exampleSentence || '';
  } else {
    fieldEnglish.value       = '';
    fieldMeaning.value       = '';
    fieldPronunciation.value = '';
    fieldExample.value       = '';
  }

  wordModal.classList.add('is-open');
  fieldEnglish.focus();
}

function closeModal() {
  wordModal.classList.remove('is-open');
  editingWordId = null;
}

// ── 저장 (추가 / 수정) ────────────────────────────────────────
async function handleSave() {
  const english       = fieldEnglish.value.trim();
  const meaning       = fieldMeaning.value.trim();
  const pronunciation = fieldPronunciation.value.trim();
  const exampleSentence = fieldExample.value.trim();

  if (!english) { showToast('영단어를 입력하세요.', 'error'); fieldEnglish.focus(); return; }
  if (!meaning) { showToast('뜻을 입력하세요.', 'error'); fieldMeaning.focus(); return; }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.classList.add('btn--loading');
  saveBtn.disabled = true;

  try {
    let res;
    if (editingWordId) {
      // 수정: 변경된 필드만 전송 (PATCH)
      const prev = wordCache[editingWordId] || {};
      const payload = {};
      if (english         !== (prev.english        || '')) payload.english         = english;
      if (meaning         !== (prev.korean         || '')) payload.korean          = meaning;
      if (pronunciation   !== (prev.pronunciation  || '')) payload.pronunciation   = pronunciation;
      if (exampleSentence !== (prev.exampleSentence|| '')) payload.exampleSentence = exampleSentence;

      if (!Object.keys(payload).length) { showToast('변경된 내용이 없습니다.', 'info'); return; }
      res = await WordApi.update(editingWordId, payload);
    } else {
      // 추가
      const payload = { english, korean: meaning };
      if (pronunciation)   payload.pronunciation   = pronunciation;
      if (exampleSentence) payload.exampleSentence = exampleSentence;
      res = await WordApi.create(payload);
    }

    if (!res || !res.success) {
      showToast(res?.message || '저장에 실패했습니다.', 'error');
      return;
    }

    showToast(editingWordId ? '단어가 수정되었습니다.' : '단어가 추가되었습니다.', 'success');
    closeModal();
    await loadWords(editingWordId ? currentPage : 0);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  } finally {
    saveBtn.classList.remove('btn--loading');
    saveBtn.disabled = false;
  }
}

// ── 삭제 ─────────────────────────────────────────────────────
async function handleDelete(id) {
  const word = wordCache[id];
  const label = word ? `'${word.english}'` : '이 단어';
  if (!confirm(`${label}을(를) 삭제하시겠습니까?`)) return;

  try {
    const res = await WordApi.delete(id);
    if (!res || !res.success) {
      showToast(res?.message || '삭제에 실패했습니다.', 'error');
      return;
    }
    delete wordCache[id];
    showToast('단어가 삭제되었습니다.', 'success');
    // 현재 페이지가 마지막이고 1개만 남았으면 이전 페이지로
    const nextPage = (wordList.querySelectorAll('.word-card[data-word-id]').length === 1 && currentPage > 0)
      ? currentPage - 1 : currentPage;
    await loadWords(nextPage);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────
document.getElementById('addWordBtn').addEventListener('click', () => openModal('add'));
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('saveBtn').addEventListener('click', handleSave);

// 모달 오버레이 클릭 시 닫기
wordModal.addEventListener('click', (e) => {
  if (e.target === wordModal) closeModal();
});

// 이벤트 위임: 수정/삭제 버튼
wordList.addEventListener('click', (e) => {
  const editBtn   = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (editBtn) {
    const id = Number(editBtn.dataset.id);
    const word = wordCache[id];
    if (word) openModal('edit', word);
  }
  if (deleteBtn) {
    handleDelete(Number(deleteBtn.dataset.id));
  }
});

// Enter 키로 저장
wordModal.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    handleSave();
  }
  if (e.key === 'Escape') closeModal();
});

// ── 초기 로드 ────────────────────────────────────────────────
loadWords(0);
