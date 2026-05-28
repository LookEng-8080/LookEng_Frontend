# CLAUDE.md — pages/

## 페이지 목록 및 기능

```
pages/
├── login.html          ← 로그인, 일반/관리자 회원가입, 비밀번호 재설정, 구글 소셜 로그인
├── landing.html        ← 서비스 소개 (비로그인 공개 페이지, hero + 기능 소개)
├── word-list.html      ← 단어 목록 (USER/ADMIN 공통)
├── dashboard.html      ← 대시보드 (USER 전용)
├── test.html           ← 테스트 (USER 전용)
├── test-history.html   ← 테스트 기록 (USER 전용)
├── 403.html            ← 권한 없음
└── admin/
    ├── word-manage.html    ← 관리자: 단어 CRUD + CSV 업로드
    └── quiz-session.html   ← 관리자: 테스트 세션 상세 조회
```

## 페이지별 기능 상세

### login.html
- 이메일 + 비밀번호 로그인 → `localStorage`에 role/userId/email 저장
- 일반 사용자 / 관리자 회원가입 탭 분리 (관리자: 관리자 코드 입력 필드 추가)
- 비밀번호 재설정 플로우: 이메일 입력 → 5자리 토큰 입력 → 새 비밀번호 설정
- 구글 소셜 로그인 (Google Sign-In 라이브러리 사용)
- 이미 로그인된 상태면 역할에 따라 자동 리다이렉트 (`auth.redirectIfLoggedIn()`)

### landing.html
- 비로그인 공개 페이지 (인증 불필요)
- 서비스 소개, hero 섹션, 기능 안내
- 로그인 / 시작하기 버튼

### word-list.html (USER / ADMIN)
- 단어 목록 조회 (페이지네이션: 기본 20개)
- 검색 (영어·한글 부분 일치, debounce 적용)
- 정렬 선택 (등록순/영어 오름차순/영어 내림차순)
- 필터 탭: 전체 / 북마크 / 암기완료 (ADMIN은 탭 미노출)
- 플립 카드: 영어 ↔ 한글 뜻 토글
- 북마크 아이콘 토글 (USER만)
- 암기완료 아이콘 토글 → 레벨업 시 폭죽 애니메이션 + 토스트 (USER만)
- 진도 바: 암기완료 수 / 전체 단어 수 (USER만)
- 레벨 배지: 현재 레벨 + 다음 레벨까지 남은 개수 (USER만)
- 단어 추가 버튼 (ADMIN만)

### dashboard.html (USER 전용)
- `auth.requireLogin()` 체크
- 진도율 % 원형 차트
- 현재 레벨 (1~5) + 다음 레벨까지 필요한 단어 수
- 최근 3개 테스트 기록 (날짜, 유형, 정답률)
- 단어장 바로가기 / 테스트 바로가기 카드

### test.html (USER 전용)
- `auth.requireLogin()` 체크
- **설정 화면**: 유형 칩 선택 (주관식 / 객관식 / 빈칸채우기), 문제 수 슬라이더 (1~50), 최근 기록 박스
- **진행 화면**:
  - `SHORT_ANSWER`: 한글 뜻 표시 → 영어 직접 입력
  - `MULTIPLE_CHOICE`: 한글 뜻 + 4지선다 선택
  - `FILL_IN_BLANK`: 예문 빈칸(___) + 4지선다 선택
- 진행 도트 (현재 위치), 다음 문제 버튼
- **결과 화면** (테스트 완료 후 같은 페이지에 표시): 정답률, 정답/오답 수, 소요 시간, 오답 목록

### test-history.html (USER 전용)
- 완료된 테스트 기록 목록 (최신순 페이지네이션)
- 날짜, 유형 배지, 문제 수, 정답률, 소요 시간 표시
- **상세 보기 모달**: 각 문제의 영어·한글 뜻, 제출 답안, 정답/오답 여부

### admin/word-manage.html (ADMIN 전용)
- `auth.requireAdmin()` 체크
- 단어 목록 조회 (페이지네이션)
- 단어 추가 모달 (영어, 한글, 품사, 예문, 발음 URL)
- 단어 수정 모달
- 단어 삭제 (confirm 후 소프트 삭제)
- CSV 템플릿 다운로드
- CSV 일괄 업로드 (진행률 표시, 5MB 제한)

### admin/quiz-session.html (ADMIN 전용)
- `auth.requireAdmin()` 체크
- 사용자 목록 조회 → 특정 사용자 테스트 기록 조회
- 세션 상세 보기: 각 문제별 제출 답안·정답 여부

## 사이드바 활성 메뉴 키

각 페이지 JS에서 `buildSidebar(activeMenu)` 호출 시 사용:

| 페이지 | activeMenu 값 |
|--------|--------------|
| dashboard.html | `'dashboard'` |
| word-list.html | `'word-list'` |
| test.html | `'test'` |
| test-history.html | `'test-history'` |
| admin/word-manage.html | `'word-manage'` |
| admin/quiz-session.html | `'quiz-session'` |
