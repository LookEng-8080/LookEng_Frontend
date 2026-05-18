import { WordApi } from '../../api.js';
import { auth } from '../../auth.js';
import { showToast, buildSidebar, renderPagination, getPosClass } from '../../utils.js';

// 1. 진입 보호: 비로그인 → login.html, USER → 403.html
auth.requireAdmin();

// 2. 사이드바 렌더링
buildSidebar('admin-word');

// ── 상수 ─────────────────────────────────────────────────────
const PAGE_SIZE          = 20;
const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const CSV_SAMPLE_HEADER  = 'english,korean,partOfSpeech,exampleSentence,pronunciationUrl\n';
const CSV_SAMPLE_ROWS    = 'abundant,풍부한,adjective,The region has abundant natural resources.,\napple,사과,noun,I eat an apple.,https://example.com/audio/apple.mp3';
const POS_OPTIONS        = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction'];

// ── 단어 목록 상태 ────────────────────────────────────────────
let currentPage   = 0;
let totalPages    = 0;
let editingWordId = null;
let wordCache     = {};
let selectedPos   = null;

// ── CSV 상태 ──────────────────────────────────────────────────
let selectedFile = null;

// ── DOM 참조: 단어 목록 ───────────────────────────────────────
const wordList     = document.getElementById('wordList');
const pagination   = document.getElementById('pagination');
const wordModal    = document.getElementById('wordModal');
const modalTitle   = document.getElementById('modalTitle');
const fieldEnglish = document.getElementById('fieldEnglish');
const fieldMeaning = document.getElementById('fieldMeaning');
const fieldExample = document.getElementById('fieldExample');

// ── DOM 참조: CSV 업로드 ──────────────────────────────────────
const csvDropZone       = document.getElementById('csvDropZone');
const csvFileInput      = document.getElementById('csvFileInput');
const csvFileInfo       = document.getElementById('csvFileInfo');
const csvFileName       = document.getElementById('csvFileName');
const csvFileSize       = document.getElementById('csvFileSize');
const csvClearBtn       = document.getElementById('csvClearBtn');
const csvUploadBtn      = document.getElementById('csvUploadBtn');
const csvResult         = document.getElementById('csvResult');
const csvSampleDownload = document.getElementById('csvSampleDownload');

// ══════════════════════════════════════════════════════════════
// 품사 버튼
// ══════════════════════════════════════════════════════════════

function initPosButtons() {
  const container = document.getElementById('posButtons');
  container.innerHTML = POS_OPTIONS.map(pos =>
    `<button type="button" class="pos-btn" data-pos="${pos}">${pos}</button>`
  ).join('');

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.pos-btn');
    if (!btn) return;
    e.preventDefault();
    container.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('pos-btn--active'));
    btn.classList.add('pos-btn--active');
    selectedPos = btn.dataset.pos;
  });
}

function setPosBtnActive(pos) {
  const container = document.getElementById('posButtons');
  container.querySelectorAll('.pos-btn').forEach(b => {
    b.classList.toggle('pos-btn--active', b.dataset.pos === pos);
  });
  selectedPos = pos || null;
}

// ══════════════════════════════════════════════════════════════
// 단어 목록
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// 모달 (단어 추가 / 수정)
// ══════════════════════════════════════════════════════════════

function openModal(mode, word = null) {
  editingWordId = mode === 'edit' ? word.id : null;
  modalTitle.textContent = mode === 'edit' ? '단어 수정' : '단어 추가';

  if (mode === 'edit' && word) {
    fieldEnglish.value = word.english         || '';
    fieldMeaning.value = word.korean          || '';
    fieldExample.value = word.exampleSentence || '';
    setPosBtnActive(word.partOfSpeech || null);
  } else {
    fieldEnglish.value = '';
    fieldMeaning.value = '';
    fieldExample.value = '';
    setPosBtnActive(null);
  }

  wordModal.classList.add('is-open');
  fieldEnglish.focus();
}

function closeModal() {
  wordModal.classList.remove('is-open');
  editingWordId = null;
}

async function handleSave() {
  const english         = fieldEnglish.value.trim();
  const meaning         = fieldMeaning.value.trim();
  const exampleSentence = fieldExample.value.trim();

  if (!english) { showToast('영단어를 입력하세요.', 'error'); fieldEnglish.focus(); return; }
  if (!meaning) { showToast('뜻을 입력하세요.', 'error'); fieldMeaning.focus(); return; }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.classList.add('btn--loading');
  saveBtn.disabled = true;

  try {
    let res;
    if (editingWordId) {
      const prev = wordCache[editingWordId] || {};
      const payload = {};
      if (english         !== (prev.english         || '')) payload.english         = english;
      if (meaning         !== (prev.korean          || '')) payload.korean          = meaning;
      if (exampleSentence !== (prev.exampleSentence || '')) payload.exampleSentence = exampleSentence;
      if (selectedPos     !== (prev.partOfSpeech    || null)) payload.partOfSpeech  = selectedPos;

      if (!Object.keys(payload).length) { showToast('변경된 내용이 없습니다.', 'info'); return; }
      res = await WordApi.update(editingWordId, payload);
    } else {
      const payload = { english, korean: meaning };
      if (selectedPos)     payload.partOfSpeech   = selectedPos;
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

// ══════════════════════════════════════════════════════════════
// 삭제
// ══════════════════════════════════════════════════════════════

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
    const nextPage = (wordList.querySelectorAll('.word-card[data-word-id]').length === 1 && currentPage > 0)
      ? currentPage - 1 : currentPage;
    await loadWords(nextPage);
  } catch {
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// CSV 일괄 업로드
// ══════════════════════════════════════════════════════════════

function initCsvUpload() {
  // 1. 샘플 파일 Blob URL 생성
  const sampleBlob = new Blob([CSV_SAMPLE_HEADER + CSV_SAMPLE_ROWS], { type: 'text/csv' });
  csvSampleDownload.href = URL.createObjectURL(sampleBlob);

  // 2. 클릭으로 파일 선택
  csvDropZone.addEventListener('click', () => csvFileInput.click());
  csvDropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') csvFileInput.click();
  });

  // 3. 파일 input change
  csvFileInput.addEventListener('change', () => {
    if (csvFileInput.files.length > 0) applyFile(csvFileInput.files[0]);
  });

  // 4. 드래그앤드롭
  csvDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    csvDropZone.classList.add('csv-drop-zone--active');
  });
  csvDropZone.addEventListener('dragleave', () => {
    csvDropZone.classList.remove('csv-drop-zone--active');
  });
  csvDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    csvDropZone.classList.remove('csv-drop-zone--active');
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  });

  // 5. 버튼 이벤트
  csvClearBtn.addEventListener('click', clearCsvFile);
  csvUploadBtn.addEventListener('click', handleCsvUpload);
}

function applyFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('.csv 파일만 업로드할 수 있습니다.', 'error');
    return;
  }
  if (file.size > MAX_CSV_SIZE_BYTES) {
    showToast('파일 크기가 5MB를 초과합니다.', 'error');
    return;
  }

  selectedFile          = file;
  csvFileName.textContent = file.name;
  csvFileSize.textContent = formatFileSize(file.size);
  csvFileInfo.hidden    = false;
  csvUploadBtn.disabled = false;
  clearCsvResult();
}

function clearCsvFile() {
  selectedFile          = null;
  csvFileInput.value    = '';
  csvFileInfo.hidden    = true;
  csvUploadBtn.disabled = true;
  clearCsvResult();
}

async function handleCsvUpload() {
  if (!selectedFile) return;

  csvUploadBtn.disabled    = true;
  csvUploadBtn.textContent = '업로드 중...';
  clearCsvResult();

  try {
    const res = await WordApi.bulkUpload(selectedFile);
    if (!res) return;

    if (res.success) {
      const { totalRequested, successCount, failCount } = res.data;
      showCsvResult('success',
        `✅ 업로드 완료 — 총 ${totalRequested}개 중 ${successCount}개 추가됨` +
        (failCount > 0 ? ` (실패: ${failCount}개)` : '')
      );
      clearCsvFile();
      await loadWords(0);
    } else {
      showCsvResult('error', `❌ ${res.message}`);
    }
  } catch {
    showCsvResult('error', '❌ 네트워크 오류가 발생했습니다.');
  } finally {
    csvUploadBtn.textContent = '업로드';
    csvUploadBtn.disabled    = (selectedFile === null);
  }
}

function showCsvResult(type, message) {
  csvResult.hidden      = false;
  csvResult.className   = `csv-result csv-result--${type}`;
  csvResult.textContent = message;
}

function clearCsvResult() {
  csvResult.hidden      = true;
  csvResult.textContent = '';
}

function formatFileSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ══════════════════════════════════════════════════════════════
// 이벤트 바인딩
// ══════════════════════════════════════════════════════════════

document.getElementById('addWordBtn').addEventListener('click', () => openModal('add'));
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('saveBtn').addEventListener('click', handleSave);

wordModal.addEventListener('click', (e) => {
  if (e.target === wordModal) closeModal();
});

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

wordModal.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    handleSave();
  }
  if (e.key === 'Escape') closeModal();
});

// ══════════════════════════════════════════════════════════════
// 초기 로드
// ══════════════════════════════════════════════════════════════
initPosButtons();
initCsvUpload();
loadWords(0);
