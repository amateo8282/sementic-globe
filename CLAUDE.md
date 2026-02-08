# Claude Code 규칙

## 기본 원칙

- **한국어 사용**: 모든 커밋 메시지, PR, 주석, 문서는 한국어로 작성
- **이모지 사용 금지**: 코드, 커밋 메시지, 문서에서 이모지 사용 지양
- **점진적 구현**: 한 번에 많은 변경보다 작은 단위로 구현 후 테스트
- **pnpm 사용**: 패키지 관리는 npm 대신 pnpm (`pnpm install`, `pnpm add`, `pnpm run`)
- **즉시 실행**: 간단한 작업(commit, push, branch)은 긴 설명이나 확인 없이 바로 실행
- **구현 우선**: 작업 요청 시 실제 코드를 구현. "계획만" 요청하지 않는 한 계획 문서만 생성하고 멈추지 말 것
- **기존 코드 보존**: 새 기능 구현 시 기존 코드/UI를 덮어쓰지 말 것. 변경 전 파일 현재 상태를 반드시 확인
- **사용자 방향 존중**: 대안 제안이나 요청 재구성 금지. 아키텍처와 도구 선택은 사용자 지시를 따를 것
- **중단 = 방향 수정**: 사용자가 중단하면 현재 접근이 잘못된 신호로 처리

## Tech Stack

- Frontend: TypeScript, React, Vite, Tailwind CSS
- Backend: FastAPI (Python), Clean Architecture
- Tailwind 버전(v3 vs v4) 수정 전 반드시 확인 -- v4는 @theme 인라인 블록 방식이 다름
- 외부 의존성 사용 시 프로젝트 Node 버전과 호환성 확인 후 설치
- 새 라이브러리 도입 시 context7로 최신 문서 확인
- 메이저 버전 업그레이드 전 breaking changes 체크
- 공식 문서 우선, 블로그/SO는 참고만

## Git

### 커밋 규칙
- 커밋과 푸시를 요청받으면 리뷰/분류 없이 즉시 실행
- 커밋 메시지는 한글로 간결하고 구체적으로 작성
  - 좋은 예: "로그인 기능 구현", "회원가입 폼 유효성 검사 추가"
  - 나쁜 예: "수정", "업데이트", "fix"
- 하나의 커밋에는 하나의 논리적 변경만 포함
- 기능 구현 완료 또는 TDD 사이클 완료 시 커밋

### 브랜치 전략
- `main`: 프로덕션 코드
- `dev`: 개발 중인 코드
- 기능 브랜치: `feature/기능명` (예: `feature/login`)

### 푸시 규칙
- 첫 푸시 전 remote URL 확인
- 푸시 전 README.md가 현재 프로젝트 상태를 반영하는지 점검 후 업데이트

## 보안

### 절대 커밋하지 않을 파일
- `.env`, `.env.local`, `.env.production`
- API 키, 시크릿 키가 포함된 파일
- 인증 정보 (credentials.json, service-account.json 등)

### .gitignore 필수 항목
```
.env*
*.pem
*.key
credentials*.json
```

## 코드 스타일

### 명명 규칙
- 컴포넌트: PascalCase (`LoginForm.tsx`)
- 유틸리티: camelCase (`formatDate.ts`)
- 스타일: kebab-case (`login-form.css`)

### 주석
- 복잡한 로직에는 한글 주석 필수
- `// TODO: 설명` / `// FIXME: 설명`

## TDD (Test-Driven Development)

### 사이클
1. **Red**: 실패하는 테스트 작성 (도메인 -> 유스케이스 -> 프레젠테이션 순)
2. **Green**: 테스트를 통과하는 최소한의 코드 작성
3. **Refactor**: 중복 제거, 네이밍 개선, 구조 최적화 (테스트는 계속 통과해야 함)
4. 사이클 완료 시 커밋

### 테스트 규칙
- 모든 새 기능은 테스트부터 작성
- 단위 테스트: 소스 파일과 같은 디렉토리에 `*.test.ts` / `*.test.tsx`
- 통합/E2E 테스트: `__tests__/integration/`, `__tests__/e2e/`
- 각 테스트는 독립적이며 하나의 동작만 검증

### 커버리지 목표
- 핵심 비즈니스 로직: 80% 이상
- 유틸리티 함수: 100%
- UI 컴포넌트: 주요 사용자 플로우

## 클린 아키텍처

### 계층 및 의존성 규칙

```
Presentation → Application → Domain ← Infrastructure
```

| 계층 | 역할 |
|------|------|
| **Domain** | 엔티티, 값 객체, 도메인 서비스. 외부 의존성 없음 |
| **Application** | 유스케이스, 인터페이스 정의 (Repository, Service), DTO |
| **Infrastructure** | DB, API 클라이언트. Application 인터페이스 구현 |
| **Presentation** | UI 컴포넌트, 페이지, 훅, 상태 관리 |

- **절대 금지**: Domain이 외부 계층에 의존
- Repository 인터페이스는 Application 계층에 정의, Infrastructure에서 구현
- 의존성 주입(DI)으로 결합도 낮춤
- 구현 순서: Domain -> Application -> Infrastructure -> Presentation

### 프로젝트 구조

```
project/
├── src/
│   ├── domain/               # 엔티티, 값 객체, 도메인 서비스
│   ├── application/          # 유스케이스, 인터페이스, DTO
│   ├── infrastructure/       # Repository 구현, API 클라이언트, DB 설정
│   └── presentation/         # 컴포넌트, 페이지, 훅, 상태 관리, 스타일
├── public/
├── docs/plans/               # 기능 계획 문서 (Plan.md, PRD.md, TRD.md, TASK.md)
└── __tests__/                # 통합/E2E 테스트
```

- Next.js App Router 사용 시 `src/` 대신 `app/` 폴더 가능

## 작업 흐름

1. 기능 요구사항 확인 및 도메인 모델 설계
2. `docs/plans/`에 계획 문서 작성 (Plan.md, PRD.md, TRD.md, TASK.md)
3. TDD 사이클 실행 (Red -> Green -> Refactor -> 커밋)
4. 통합/E2E 테스트
5. 푸시 (README.md 점검 포함)
6. 문서 업데이트 (프로젝트 푸시 시 본 파일도 프로젝트 내용 반영하여 업데이트)
