# Claude Code 프로젝트 템플릿

Claude Code와 함께 사용하기 위한 프로젝트 템플릿입니다.
TDD 기반 개발과 클린 아키텍처를 적용한 체계적인 개발 워크플로우를 제공합니다.

## 빠른 시작

GitHub에서 "Use this template" 버튼으로 새 프로젝트를 생성합니다.

```bash
# 생성된 프로젝트 클론
git clone https://github.com/<your-username>/<new-project>.git
cd <new-project>

# 패키지 매니저 초기화
pnpm init
```

## 템플릿 구조

```
.
├── CLAUDE.md                    # Claude Code 규칙 및 가이드라인
├── README.md                    # 프로젝트 설명 (이 파일)
├── .gitignore                   # Git 추적 제외 파일 목록
├── .mcp.json                    # MCP 서버 설정
├── create-worktree.sh           # Git Worktree 생성 스크립트
└── .claude/
    ├── settings.json            # Claude Code 프로젝트 공유 설정
    ├── commands/                # 슬래시 커맨드
    │   ├── branch-create.md     # 기능 브랜치 생성 + 개발 플랜 수립
    │   ├── branch-apply.md      # 변경사항 정리 + PR 생성
    │   ├── create-issue.md      # GitHub 이슈 생성
    │   ├── resolve-issue.md     # GitHub 이슈 해결 계획
    │   ├── feature-breakdown.md # 기능 분해
    │   ├── context-save.md      # 작업 상태 저장
    │   └── context-restore.md   # 작업 상태 복구
    └── skills/                  # Claude Code 스킬
        ├── cc-feature-implementer-main/  # 기능 계획 수립
        ├── frontend-design/              # 프론트엔드 디자인
        ├── security-audit/               # 보안 감사
        └── docx/                         # 문서 생성/편집
```

## 포함된 내용

### CLAUDE.md

Claude Code와 작업할 때 따라야 할 규칙을 정의합니다:

- 한국어 사용, 이모지 금지, pnpm 패키지 매니저 사용
- Git 워크플로우 (커밋 규칙, 브랜치 전략)
- 보안 규칙 (민감 정보 관리)
- TDD 사이클 및 테스트 작성 규칙
- 클린 아키텍처 계층 구조 및 폴더 구조

### MCP 서버 (.mcp.json)

| 서버 | 용도 |
|------|------|
| shadcn | UI 컴포넌트 라이브러리 |
| supabase | 백엔드/데이터베이스 |
| playwright | 브라우저 자동화/테스트 |
| context7 | 라이브러리 최신 문서 조회 |
| stitch | GCP 연동 |
| gsap-master | GSAP 애니메이션 |
| spline-design | 3D 디자인 |
| mcp-three | Three.js 3D 그래픽 |

### 슬래시 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/branch-create` | 기능 브랜치 생성 + 개발 플랜 수립 |
| `/branch-apply` | 변경사항 정리 + PR 생성 |
| `/create-issue` | GitHub 이슈 생성 |
| `/resolve-issue` | GitHub 이슈 해결 계획 |
| `/feature-breakdown` | 기능 분해 |
| `/context-save` | 작업 상태 저장 (context 클리어 전) |
| `/context-restore` | 작업 상태 복구 |

### 스킬

| 스킬 | 설명 |
|------|------|
| Feature Planner | TDD 기반 기능 계획 수립 및 태스크 분해 |
| Frontend Design | 프론트엔드 UI 디자인 및 컴포넌트 생성 |
| Security Audit | 보안 취약점 검사 (Next.js, Supabase, AWS/Vercel 스택) |
| DOCX | Word 문서 생성, 편집, 분석 |

### 프로젝트 설정 (.claude/settings.json)

- Agent Teams 실험 기능 활성화

### Git Worktree 스크립트

병렬 작업을 위한 worktree 생성 스크립트입니다.

```bash
source create-worktree.sh <worktree-name>
```

## 핵심 원칙

### TDD (Test-Driven Development)

1. **Red**: 실패하는 테스트 작성
2. **Green**: 테스트를 통과하는 최소한의 코드 작성
3. **Refactor**: 코드 리팩토링 (테스트는 계속 통과해야 함)

### 클린 아키텍처

```
Presentation -> Application -> Domain
Infrastructure -> Application (인터페이스 구현)
```

Domain 계층이 외부 계층에 의존하는 것은 금지합니다.

### 프로젝트 구조 예시

```
project/
├── src/
│   ├── domain/               # 도메인 계층 (엔티티, 값 객체, 도메인 서비스)
│   ├── application/          # 애플리케이션 계층 (유스케이스, 인터페이스, DTO)
│   ├── infrastructure/       # 인프라 계층 (Repository 구현, API, DB)
│   └── presentation/         # 프레젠테이션 계층 (컴포넌트, 페이지, 훅, 스토어)
├── docs/plans/               # 기능 계획 문서
├── __tests__/
│   ├── integration/
│   └── e2e/
└── CLAUDE.md
```

## 사용 후 설정

템플릿으로 프로젝트를 생성한 후 다음을 확인하세요:

1. **README.md** - 새 프로젝트에 맞게 수정
2. **.mcp.json** - stitch 서버의 `STITCH_PROJECT_ID`를 실제 GCP 프로젝트 ID로 변경 (사용 시)
3. **.claude/settings.local.json** - 로컬 permissions 설정 (커밋 대상 아님, 직접 생성 필요)
4. **.gitignore** - 프로젝트에 맞게 추가 항목 설정
