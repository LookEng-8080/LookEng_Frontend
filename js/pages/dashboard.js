import { WordApi } from '../api.js';
import { auth } from '../auth.js';
import { showToast, buildSidebar } from '../utils.js';

// 1. 인증 및 사이드바 렌더링 (팀장님처럼 파일 최상단에서 바로 실행!)
auth.requireLogin();
buildSidebar('dashboard'); 

// 2. 사용자 이름 표시
function renderUserName() {
  const email = auth.getEmail() || 'User@lookeng.com';
  const nameDisplay = document.getElementById('userName');
  if (nameDisplay) {
    nameDisplay.textContent = email.split('@')[0];
  }
}

// 3. 로컬 저장소 단어 카운트
function getMemorizedCount() {
  return Object.keys(localStorage)
    .filter(key => key.startsWith('memorized_'))
    .length;
}

// 4. 등급 계산 로직
function getGrade(memorizedCount) {
  if (memorizedCount >= 40) return { level: 5, label: '마스터', emoji: '🏆', color: '#F59E0B' };
  if (memorizedCount >= 30) return { level: 4, label: '플래티넘', emoji: '💎', color: '#5B7FDB' };
  if (memorizedCount >= 20) return { level: 3, label: '골드', emoji: '🥇', color: '#FFD700' };
  if (memorizedCount >= 10) return { level: 2, label: '실버', emoji: '🥈', color: '#9CA3AF' };
  return { level: 1, label: '브론즈', emoji: '🥉', color: '#CD7F32' };
}

// 5. 화면(UI)에 데이터 업데이트
function renderDashboardUI(memorizedCount, totalWords) {
  const percent = totalWords === 0 ? 0 : Math.round((memorizedCount / totalWords) * 100);
  
  const elements = {
    progressText: document.getElementById('progressText'),
    progressFill: document.getElementById('progressFill'),
    currentLevelText: document.getElementById('currentLevelText'),
    gradeEmoji: document.getElementById('gradeEmoji'),
    gradeLabel: document.getElementById('gradeLabel')
  };

  if (elements.progressText) elements.progressText.textContent = `${memorizedCount} / ${totalWords}`;
  if (elements.progressFill) elements.progressFill.style.width = `${percent}%`;

  const grade = getGrade(memorizedCount);
  if (elements.currentLevelText) elements.currentLevelText.textContent = `Lv.${grade.level} (현재 외운 단어)`;
  if (elements.gradeEmoji) elements.gradeEmoji.textContent = grade.emoji;
  if (elements.gradeLabel) {
    elements.gradeLabel.textContent = grade.label;
    elements.gradeLabel.style.color = grade.color;
  }
}

// 6. 데이터 로드 및 초기화
async function initDashboard() {
  try {
    const res = await WordApi.getList(0, 1);
    
    if (!res.success) {
      showToast(res.message || '데이터를 불러오지 못했습니다.', 'error');
      return;
    }

    const totalWords = res.data.totalElements;
    const memorizedCount = getMemorizedCount();

    renderDashboardUI(memorizedCount, totalWords);

  } catch (error) {
    console.error('대시보드 로드 실패:', error);
    showToast('네트워크 오류가 발생했습니다.', 'error');
  }
}

// 7. 스크립트가 로드되자마자 실행!
renderUserName();
initDashboard();