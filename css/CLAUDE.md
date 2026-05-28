# CLAUDE.md — css/

## 파일 구조

```
css/
├── global.css          ← CSS 변수(디자인 토큰), reset, 타이포그래피, 공통 레이아웃
├── components.css      ← 버튼, 카드, 모달, 토스트, 페이지네이션 공통 컴포넌트
└── pages/
    ├── login.css
    ├── landing.css
    ├── word-list.css   ← 플립 카드, 진도 바, 레벨 배지
    ├── dashboard.css
    ├── test.css        ← 유형 칩, 슬라이더, 문제 카드, 4지선다
    ├── test-history.css
    └── admin.css       ← 관리자 페이지 공통
```

---

## 디자인 토큰 (CSS 변수)

`global.css`의 `:root`에 정의된 변수를 항상 사용할 것. 하드코딩 색상 금지.

```css
:root {
  /* 브랜드 색상 */
  --color-navy-dark:      #0D1B33;
  --color-navy-mid:       #1A3258;
  --color-blue-primary:   #5B7FDB;
  --color-blue-hover:     #4A6EC9;

  /* UI 배경 */
  --color-bg:             #F0F2F5;
  --color-surface:        #FFFFFF;
  --color-border:         rgba(0, 0, 0, 0.08);

  /* 텍스트 */
  --color-text-primary:   #1A1A2E;
  --color-text-secondary: #6B7280;

  /* 상태 */
  --color-success:        #10B981;
  --color-danger:         #EF4444;
  --color-warning:        #F59E0B;

  /* 폰트 */
  --font-en:              'Poppins', sans-serif;
  --font-ko:              'Noto Sans KR', sans-serif;

  /* 모양 */
  --radius-sm:    6px;
  --radius:       12px;
  --radius-lg:    16px;

  /* 그림자 */
  --shadow-sm:    0 1px 4px rgba(0, 0, 0, 0.06);
  --shadow-card:  0 2px 12px rgba(0, 0, 0, 0.08);

  /* 레이아웃 */
  --sidebar-width:  240px;
  --topbar-height:  60px;
}
```

---

## 컴포넌트 네이밍 (BEM)

```css
/* block__element--modifier 패턴 */
.word-card { }
.word-card__title { }
.word-card__title--hidden { }

.btn { }
.btn--primary { }
.btn--danger { }

.toast { }
.toast--success { }
.toast--error { }

.pagination { }
.pagination__btn { }
.pagination__btn--active { }
```

## 반응형

모바일 우선 작성, `min-width`로 큰 화면 확장:

```css
.container { width: 100%; }
@media (min-width: 768px) { .container { max-width: 1024px; } }
```
