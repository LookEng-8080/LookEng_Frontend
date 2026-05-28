# CLAUDE.md — LookEng Frontend

LookEng 프론트엔드 개발 가이드 (Claude Code 전용 컨텍스트 문서)

- **스택:** HTML + CSS + Vanilla JS (프레임워크 없음)
- **백엔드:** Spring Boot 포트 8080, 세션 기반 인증 (JWT 없음)
- **GitHub:** https://github.com/LookEng-8080/LookEng_Frontend

세부 내용은 하위 CLAUDE.md를 참고:
- [`pages/CLAUDE.md`](pages/CLAUDE.md) — 페이지별 기능, 접근 제어
- [`js/CLAUDE.md`](js/CLAUDE.md) — JS 아키텍처, api.js·auth.js·utils.js 패턴
- [`css/CLAUDE.md`](css/CLAUDE.md) — 디자인 토큰(CSS 변수), BEM 컨벤션

---

## 디렉터리 구조

```
LookEng_Frontend/
├── index.html                    ← 진입점 → login.html 리다이렉트
├── pages/                        ← 페이지별 HTML (pages/CLAUDE.md 참고)
├── css/                          ← 스타일시트 (css/CLAUDE.md 참고)
├── js/                           ← JavaScript (js/CLAUDE.md 참고)
└── assets/
    ├── logo.svg
    └── icons/
```

---

## 인증 흐름 (세션 기반)

```
로그인 성공
  → 백엔드가 JSESSIONID 쿠키 Set
  → localStorage에 { role, userId, email } 저장
  → USER → dashboard.html / ADMIN → admin/word-manage.html

보호 페이지 진입
  → auth.requireLogin() / auth.requireAdmin() 호출
  → role 없으면 login.html 리다이렉트

API 호출
  → credentials: 'include' 필수 (JSESSIONID 자동 전송)
  → 401 → localStorage 삭제 후 login.html 리다이렉트
  → 403 → 403.html 리다이렉트

로그아웃
  → POST /api/v1/auth/logout
  → localStorage 전체 삭제 → login.html 리다이렉트

회원 탈퇴
  → 재확인 confirm() → DELETE /api/v1/auth/withdraw
  → localStorage 삭제 → login.html 리다이렉트
```

### 역할별 접근 제어

| 역할 | 접근 가능 페이지 |
|------|-----------------|
| `USER` | dashboard, word-list, test, test-history |
| `ADMIN` | word-list, admin/word-manage, admin/quiz-session |

---

## 개발 환경 실행

```bash
# 1. npx serve -l 3000 (권장)

# 2. 백엔드 동시 실행 (별도 터미널)
cd ../LookEng_Backend
./gradlew bootRun    # http://localhost:8080
```
---

## PR / 이슈 이력 요약

| PR | 내용 |
|----|------|
| #2 | feat: 로그인/회원가입 페이지 |
| #3, #4 | feat: 단어장 초안, 테스트 설정/진행/결과/기록 |
| #7 | chore: 프로젝트 기본 구조 세팅 |
| #9 | fix: 단어장 UI 개선 및 필드명 버그 수정 |
| #12 | feat: 대시보드 페이지 |
| #13 | feat: 관리자 단어 관리 페이지, DELETE 204 파싱 오류 수정 |
| #15 | feat: 퀴즈 설정 화면 최근 기록 표시, 관리자 퀴즈 세션 페이지 |
| — | fix: 테스트 기록 페이지 사이드바 활성 메뉴 수정 (issue #16) |
| #18 | feat: CSV 단어 일괄 추가 UI |
| #20 | feat: 관리자 회원가입 코드 반영 |
| #22 | feat: 북마크/암기완료 기능 프론트엔드 구현 |
| #24 | feat: 단어 검색 UI |
| #26 | feat: 단어 발음 청취 UI |
| #28 | feat: 회원 탈퇴 기능 |
| #30 | feat: 비밀번호 재설정 UI |
| #37 | feat: 구글 소셜 로그인 UI |
| #38 | feat: 진도율/등급 UI 구현, 레벨업 애니메이션/폭죽 효과 |
| #40 | feat: 객관식/빈칸채우기 진행 화면, UI 용어 '테스트'로 통일 |
| #42 | feat: 테스트 세션 상세 조회 모달 |
| — | feat: 랜딩 페이지 신규 추가, 관리자 메뉴명 변경 |
| — | fix: 관리자 테스트 세션 상세 조회 403 오류 수정 |
