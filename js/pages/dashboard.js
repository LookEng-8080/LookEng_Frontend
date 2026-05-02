import { TestApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, buildSidebar } from '../utils.js';

auth.requireLogin();
buildSidebar('dashboard');

function renderUserName() {
  const email = auth.getEmail() || 'User@lookeng.com';
  const nameDisplay = document.getElementById('userName');
  if (nameDisplay) {
    nameDisplay.textContent = email.split('@')[0];
  }
}

async function loadGrassCalendarData() {
  try {
    const res = await TestApi.getHistory(0, 500);
    
    if (!res.success) {
      renderGrassCalendar({});
      return;
    }

    const sessions = res.data.content || [];
    const dateCounts = {};

    sessions.forEach(session => {
      if (!session.startedAt) return;
      const date = session.startedAt.split('T')[0];
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });

    renderGrassCalendar(dateCounts);

  } catch (error) {
    renderGrassCalendar({});
  }
}

function renderGrassCalendar(dateCounts) {
  const container = document.getElementById('grassCalendarContainer');
  if (!container) return;

  const today = new Date();
  const WEEKS_TO_RENDER = 52; 
  const TOTAL_DAYS = WEEKS_TO_RENDER * 7;

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - today.getDay() - (WEEKS_TO_RENDER - 1) * 7);

  const dayLabelsHTML = `
    <div class="grass-day-labels">
      <span></span><span>월</span><span></span><span>수</span><span></span><span>금</span><span></span>
    </div>
  `;

  let gridHTML = '<div class="grass-grid">';
  let monthLabelsHTML = '<div class="grass-month-labels">';
  let currentMonth = -1;

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const year = currentDate.getFullYear();
    const monthIndex = currentDate.getMonth() + 1;
    const month = String(monthIndex).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // 월 라벨 처리
    if (currentDate.getDate() <= 7 && monthIndex !== currentMonth) {
      const weekIndex = Math.floor(i / 7);
      // 🔥 셀(14px) + 여백(4px) = 18px 단위로 계산
      monthLabelsHTML += `<span class="grass-month-label" style="left: ${weekIndex * 18}px">${monthIndex}월</span>`;
      currentMonth = monthIndex;
    }

    const count = dateCounts[dateString] || 0;
    let level = 0;
    if (count === 1) level = 1;
    else if (count >= 2 && count <= 3) level = 2;
    else if (count >= 4 && count <= 5) level = 3;
    else if (count > 5) level = 4;

    const isFuture = currentDate > today;
    const visibilityStyle = isFuture ? 'opacity: 0; pointer-events: none;' : '';
    
    // 🔥 기본 title 속성 제거하고 커스텀 데이터 속성 주입
    gridHTML += `<div class="grass-cell" data-level="${level}" data-date="${dateString}" data-count="${count}" style="${visibilityStyle}"></div>`;
  }

  gridHTML += '</div>';
  monthLabelsHTML += '</div>';

  const legendHTML = `
    <div class="grass-legend">
      <span>Less</span>
      <div class="grass-cell" data-level="0"></div>
      <div class="grass-cell" data-level="1"></div>
      <div class="grass-cell" data-level="2"></div>
      <div class="grass-cell" data-level="3"></div>
      <div class="grass-cell" data-level="4"></div>
      <span>More</span>
    </div>
  `;

  container.innerHTML = `
    <div class="grass-calendar-container">
      ${dayLabelsHTML}
      <div class="grass-graph-wrapper">
        ${monthLabelsHTML}
        ${gridHTML}
      </div>
    </div>
    ${legendHTML}
  `;

  // 🔥 툴팁 이벤트 바인딩 실행
  bindTooltipEvents();
}

// 🔥 즉각적으로 반응하는 깃허브 스타일 툴팁 로직
function bindTooltipEvents() {
  const wrapper = document.querySelector('.grass-calendar-wrapper');
  const tooltip = document.getElementById('grassTooltip');
  if (!wrapper || !tooltip) return;

  wrapper.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('grass-cell') && e.target.style.opacity !== '0') {
      const date = e.target.dataset.date;
      const count = parseInt(e.target.dataset.count, 10);
      if (!date) return;

      // 날짜 포맷 변환 (예: 2026-05-02 -> 2026년 5월 2일)
      const [y, m, d] = date.split('-');
      const dateStr = `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
      
      tooltip.textContent = count > 0 ? `${count}번 학습 (${dateStr})` : `학습 기록 없음 (${dateStr})`;

      // 마우스 올린 셀의 위치값을 계산해서 툴팁을 정확히 그 위에 배치
      const rect = e.target.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top}px`;
      tooltip.style.opacity = '1';
    }
  });

  wrapper.addEventListener('mouseout', (e) => {
    if (e.target.classList.contains('grass-cell')) {
      tooltip.style.opacity = '0';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderUserName();
  loadGrassCalendarData();
});