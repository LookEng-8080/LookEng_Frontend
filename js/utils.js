/**
 * utils.js — LookEng 공통 유틸리티
 *
 * 사용법: import { showToast, formatDate, buildSidebar, getPosLabel } from '../js/utils.js';
 */

import { AuthApi } from './api.js';
import { auth } from './auth.js';

// ── Toast 알림 ────────────────────────────────────────────────
/**
 * 화면 우하단에 토스트 메시지 표시 (3초 후 자동 제거)
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 */
export function showToast(message, type = 'info') {
  // 기존 토스트 제거
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // 애니메이션 트리거
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('is-visible'));
  });

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── 날짜 포맷 ─────────────────────────────────────────────────
/**
 * ISO 날짜 문자열을 'YYYY.MM.DD' 형식으로 변환
 * @param {string} dateStr
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/**
 * 초(second)를 'M분 SS초' 형식으로 변환
 * @param {number} seconds
 */
export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}초`;
  return `${m}분 ${String(s).padStart(2, '0')}초`;
}

// ── 품사 배지 ─────────────────────────────────────────────────
/**
 * 품사 문자열로부터 CSS 클래스 반환
 */
export function getPosClass(pos) {
  if (!pos) return 'pos-badge--default';
  const p = pos.toLowerCase();
  if (p.includes('noun'))      return 'pos-badge--noun';
  if (p.includes('verb'))      return 'pos-badge--verb';
  if (p.includes('adj'))       return 'pos-badge--adjective';
  if (p.includes('adv'))       return 'pos-badge--adverb';
  return 'pos-badge--default';
}

// ── 경로 헬퍼 ─────────────────────────────────────────────────
function getPrefix() {
  const path = location.pathname;
  if (path.includes('/admin/')) return '../';   // admin/ → pages/ 기준
  return '';                                     // pages/ 기준
}

// ── LOOkEng 눈 SVG 생성기 ─────────────────────────────────────
/**
 * 인터랙티브 눈 SVG 엘리먼트를 반환 (마우스 추적)
 * @param {number} size - 눈 크기 배율 (기본 1 = 44px)
 */
export function createEyeSvg(size = 1) {
  const w = 44 * size;
  const h = 44 * size;
  const svgNS = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.style.cssText = 'cursor:pointer; display:block; overflow:visible;';

  // 그라데이션 정의
  const defs = document.createElementNS(svgNS, 'defs');
  const irisGrad = document.createElementNS(svgNS, 'radialGradient');
  const uid = Math.random().toString(36).slice(2, 6);
  irisGrad.id = `irisGrad-${uid}`;
  irisGrad.setAttribute('cx', '45%');
  irisGrad.setAttribute('cy', '40%');
  [['0%','#5B7EA1'],['40%','#3A6186'],['70%','#2C4A6E'],['100%','#1B2F45']].forEach(([offset, color]) => {
    const stop = document.createElementNS(svgNS, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    irisGrad.appendChild(stop);
  });
  defs.appendChild(irisGrad);
  svg.appendChild(defs);

  // 흰자
  const sclera = document.createElementNS(svgNS, 'ellipse');
  sclera.setAttribute('cx', '22'); sclera.setAttribute('cy', '22');
  sclera.setAttribute('rx', '18'); sclera.setAttribute('ry', '16');
  sclera.setAttribute('fill', '#F0F0F0');
  svg.appendChild(sclera);

  // 홍채
  const iris = document.createElementNS(svgNS, 'circle');
  iris.setAttribute('cx', '22'); iris.setAttribute('cy', '22'); iris.setAttribute('r', '11');
  iris.setAttribute('fill', `url(#irisGrad-${uid})`);
  iris.style.transition = 'cx 0.08s, cy 0.08s';
  svg.appendChild(iris);

  // 동공
  const pupil = document.createElementNS(svgNS, 'circle');
  pupil.setAttribute('cx', '22'); pupil.setAttribute('cy', '22'); pupil.setAttribute('r', '5');
  pupil.setAttribute('fill', '#0A0F18');
  pupil.style.transition = 'cx 0.08s, cy 0.08s';
  svg.appendChild(pupil);

  // 하이라이트
  const hl = document.createElementNS(svgNS, 'ellipse');
  hl.setAttribute('cx', '18'); hl.setAttribute('cy', '17');
  hl.setAttribute('rx', '3.5'); hl.setAttribute('ry', '3');
  hl.setAttribute('fill', 'white'); hl.setAttribute('opacity', '0.85');
  svg.appendChild(hl);

  // 마우스 추적 이벤트
  function onMouseMove(e) {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxMove = 3.5;
    const factor = Math.min(dist / 80, 1) * maxMove;
    const angle = Math.atan2(dy, dx);
    const ox = (Math.cos(angle) * factor).toFixed(2);
    const oy = (Math.sin(angle) * factor).toFixed(2);
    const newCx = (22 + parseFloat(ox)).toFixed(2);
    const newCy = (22 + parseFloat(oy)).toFixed(2);
    iris.setAttribute('cx', newCx); iris.setAttribute('cy', newCy);
    pupil.setAttribute('cx', newCx); pupil.setAttribute('cy', newCy);
    hl.setAttribute('cx', (18 + parseFloat(ox) * 0.3).toFixed(2));
    hl.setAttribute('cy', (17 + parseFloat(oy) * 0.3).toFixed(2));
  }

  // 깜박이기 애니메이션
  let blinkTimer = null;
  function doBlink() {
    sclera.style.transition = 'ry 0.07s ease-in';
    sclera.style.ry = '0.5px';
    setTimeout(() => {
      sclera.style.transition = 'ry 0.11s ease-out';
      sclera.style.ry = '16px';
    }, 90);
  }

  svg.addEventListener('mouseenter', () => {
    doBlink();
    blinkTimer = setInterval(doBlink, 1800);
  });

  function onMouseLeave() {
    clearInterval(blinkTimer);
    blinkTimer = null;
    sclera.style.transition = 'ry 0.11s ease-out';
    sclera.style.ry = '16px';
    iris.setAttribute('cx', '22'); iris.setAttribute('cy', '22');
    pupil.setAttribute('cx', '22'); pupil.setAttribute('cy', '22');
    hl.setAttribute('cx', '18'); hl.setAttribute('cy', '17');
  }
  document.addEventListener('mousemove', onMouseMove);
  svg.addEventListener('mouseleave', onMouseLeave);

  return svg;
}

// // ── 사이드바 빌더 ─────────────────────────────────────────────
// /**
//  * #sidebar 엘리먼트에 사이드바 HTML을 렌더링하고 이벤트를 바인딩
//  * @param {'dashboard'|'word-list'|'test'|'admin-word'} activeMenu
//  */
// export function buildSidebar(activeMenu) {
//   const sidebar = document.getElementById('sidebar');
//   if (!sidebar) return;

//   const prefix = getPrefix();
//   const email = auth.getEmail() || '';
//   // 이메일에서 @ 앞 부분을 이름으로 사용
//   const displayName = email.split('@')[0] || '사용자';
//   const isAdmin = auth.isAdmin();

//   const navItems = [
//     {
//       key: 'dashboard',
//       href: `${prefix}dashboard.html`,
//       label: '내 대시보드',
//       icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
//         <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
//         <rect x="11" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
//         <rect x="1" y="11" width="6" height="6" rx="1.5" fill="currentColor"/>
//         <rect x="11" y="11" width="6" height="6" rx="1.5" fill="currentColor"/>
//       </svg>`,
//     },
//     {
//       key: 'word-list',
//       href: `${prefix}word-list.html`,
//       label: '단어장 관리',
//       icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
//         <rect x="1" y="3" width="16" height="2" rx="1" fill="currentColor"/>
//         <rect x="1" y="8" width="16" height="2" rx="1" fill="currentColor"/>
//         <rect x="1" y="13" width="10" height="2" rx="1" fill="currentColor"/>
//       </svg>`,
//     },
//     {
//       key: 'test',
//       href: `${prefix}test.html`,
//       label: '단어 퀴즈 세션',
//       icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
//         <circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.5"/>
//         <circle cx="9" cy="9" r="3" fill="currentColor"/>
//         <line x1="9" y1="1.5" x2="9" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
//         <line x1="9" y1="14" x2="9" y2="16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
//         <line x1="1.5" y1="9" x2="4" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
//         <line x1="14" y1="9" x2="16.5" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
//       </svg>`,
//     },
//   ];

//   // 관리자에게는 단어 관리 링크 추가
//   if (isAdmin) {
//     navItems.push({
//       key: 'admin-word',
//       href: `${prefix}admin/word-manage.html`,
//       label: '단어 관리 (관리자)',
//       icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
//         <path d="M2 14l1.5-4.5L12 1l3 3-8.5 8.5L2 14z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
//         <line x1="9.5" y1="3.5" x2="13.5" y2="7.5" stroke="currentColor" stroke-width="1.5"/>
//       </svg>`,
//     });
//   }

//   const navHTML = navItems.map(item => `
//     <a href="${item.href}" class="nav-item ${activeMenu === item.key ? 'nav-item--active' : ''}">
//       <span class="nav-item__icon">${item.icon}</span>
//       ${item.label}
//     </a>
//   `).join('');

//   sidebar.innerHTML = `
//     <div class="sidebar__header">
//       <a href="${prefix}dashboard.html" class="sidebar__brand">
//         <div class="sidebar__brand-logo">
//           <span class="sidebar__brand-l">L</span>
//           <span class="sidebar__brand-eye" id="sidebarLogoEye1"></span>
//           <span class="sidebar__brand-eye" id="sidebarLogoEye2"></span>
//           <span class="sidebar__brand-keng">kEng</span>
//         </div>
//       </a>
//     </div>
//     <nav class="sidebar__nav">${navHTML}</nav>
//     <div class="sidebar__footer">
//       <span class="sidebar__user-label">로그인 중</span>
//       <strong class="sidebar__user-name">${displayName} 님 🧑‍💻</strong>
//       <button class="sidebar__logout-btn" id="logoutBtn">
//         <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
//           <path d="M5 2H2v10h3M9 10l3-3-3-3M12 7H5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
//         </svg>
//         로그아웃
//       </button>
//     </div>
//   `;

//   // 사이드바 로고 눈 렌더링 (작은 크기, 2개)
//   const eye1 = document.getElementById('sidebarLogoEye1');
//   const eye2 = document.getElementById('sidebarLogoEye2');
//   if (eye1) eye1.appendChild(createEyeSvg(0.38));
//   if (eye2) eye2.appendChild(createEyeSvg(0.38));

//   // 로그아웃 이벤트
//   document.getElementById('logoutBtn')?.addEventListener('click', async () => {
//     try { await AuthApi.logout(); } catch (_) { /* 세션 만료 무시 */ }
//     auth.clearSession();
//     location.replace(`${prefix}login.html`);
//   });
// }
// ── 사이드바 빌더 ─────────────────────────────────────────────
/**
 * #sidebar 엘리먼트에 사이드바 HTML을 렌더링하고 이벤트를 바인딩
 * @param {'dashboard'|'word-list'|'test'|'admin-word'} activeMenu
 */
// ... (위쪽 showToast 등 기존 코드 유지)

export function buildSidebar(activeMenu) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const prefix = location.pathname.includes('/admin/') ? '../' : '';
  const email = localStorage.getItem('email') || '';
  const displayName = email.split('@')[0] || '사용자';
  const isAdmin = localStorage.getItem('role') === 'ADMIN';

  let navItems = isAdmin ? [
    { key: 'admin-word', href: `${prefix}admin/word-manage.html`, label: '단어장 관리', icon: '📝' },
    { key: 'admin-quiz', href: '#', label: '단어 퀴즈 세션', icon: '🎯' }
  ] : [
    { key: 'dashboard', href: `${prefix}dashboard.html`, label: '내 대시보드', icon: '📊' },
    { key: 'word-list', href: `${prefix}word-list.html`, label: '단어장 관리', icon: '📖' },
    { key: 'test', href: `${prefix}test.html`, label: '단어 퀴즈 세션', icon: '🎯' }
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="nav-item ${activeMenu === item.key ? 'nav-item--active' : ''}">
      <span class="nav-item__icon">${item.icon}</span> ${item.label}
    </a>
  `).join('');

  // 3번 해결: 로고(a 태그)의 넓이를 글자만큼만 차지하게 inline-block 적용!
  sidebar.innerHTML = `
    <div class="sidebar__header" style="padding-bottom: 20px;">
      <a href="${isAdmin ? '#' : prefix + 'dashboard.html'}" class="sidebar__brand" style="display: inline-block; text-decoration: none;">
        <div class="sidebar__brand-logo">
          <span class="sidebar__brand-l">L</span>
          <span class="sidebar__brand-eye" id="sidebarLogoEye1"></span>
          <span class="sidebar__brand-eye" id="sidebarLogoEye2"></span>
          <span class="sidebar__brand-keng">kEng</span>
        </div>
      </a>
    </div>
    <nav class="sidebar__nav">${navHTML}</nav>
    <div class="sidebar__footer">
      <strong class="sidebar__user-name">${displayName} 님</strong>
      <button class="sidebar__logout-btn" id="logoutBtn">로그아웃</button>
    </div>
  `;

  // 눈동자 렌더링 유지
  const eye1 = document.getElementById('sidebarLogoEye1');
  const eye2 = document.getElementById('sidebarLogoEye2');
  if (eye1 && typeof createEyeSvg === 'function') eye1.appendChild(createEyeSvg(0.38));
  if (eye2 && typeof createEyeSvg === 'function') eye2.appendChild(createEyeSvg(0.38));

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    location.replace(`${prefix}login.html`);
  });
}

// ── 페이지네이션 렌더 ─────────────────────────────────────────
/**
 * 페이지네이션 버튼을 렌더링
 * @param {HTMLElement} container
 * @param {number} currentPage  - 현재 페이지 (0-based)
 * @param {number} totalPages
 * @param {function} onPageChange - (page: number) => void
 */
export function renderPagination(container, currentPage, totalPages, onPageChange) {
  if (!container || totalPages <= 1) { if(container) container.innerHTML = ''; return; }

  const maxVisible = 5;
  let startPage = Math.max(0, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(0, endPage - maxVisible + 1);
  }

  let html = `
    <button class="pagination__btn" ${currentPage === 0 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>
  `;
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination__btn ${i === currentPage ? 'pagination__btn--active' : ''}" data-page="${i}">${i + 1}</button>`;
  }
  html += `<button class="pagination__btn" ${currentPage === totalPages - 1 ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;

  container.innerHTML = `<div class="pagination">${html}</div>`;
  container.querySelectorAll('.pagination__btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => onPageChange(Number(btn.dataset.page)));
  });
}
