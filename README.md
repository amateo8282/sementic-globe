# Semantic Globe

사용자가 짧은 익명 메시지를 남기면, 메시지의 의미(semantic meaning)에 따라 3D 구체(globe) 위에 자동 배치되는 서비스.
기존 게시판의 수동 카테고리 분류 대신, 임베딩 기반으로 의미적 거리가 자동으로 시각화된다.

## 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| Frontend | Next.js (App Router), TypeScript | v16 |
| 스타일링 | Tailwind CSS | v4 |
| 애니메이션 | Motion (구 Framer Motion) | 최신 |
| 3D 렌더링 | Three.js + React Three Fiber + @react-three/drei | 최신 |
| Backend/DB | Supabase (PostgreSQL + pgvector) | supabase-js v2 |
| 인증 | Supabase Auth (익명 + 이메일) | supabase-js v2 |
| 임베딩 | OpenAI text-embedding-3-small (1536차원) | - |
| 테스트 | Vitest | 최신 |
| 배포 | Vercel (Frontend) + Supabase (Backend) | - |

## 프로젝트 구조

```
src/
├── domain/                    # 엔티티, 값 객체
│   ├── entities/              # Message, Reaction, Epoch
│   └── value-objects/         # GlobeCoordinate, Embedding
├── application/               # 유스케이스, 인터페이스, DTO
│   ├── interfaces/            # MessageRepository, EmbeddingService, PlacementService
│   ├── use-cases/             # CreateMessage, GetMessages, PlaceNewMessage, ReactToMessage
│   └── dto/                   # MessageDto, CreateMessageDto
├── infrastructure/            # 인터페이스 구현
│   ├── supabase/              # Supabase 클라이언트, 타입 정의
│   ├── repositories/          # SupabaseMessageRepository
│   ├── services/              # OpenAIEmbeddingService, CosineSimilarityPlacementService
│   ├── security/              # Rate Limiting, JWT 인증 유틸리티
│   └── di/                    # 의존성 주입 컨테이너
└── presentation/              # UI 계층
    ├── components/
    │   ├── globe/             # Globe, MessageParticles, CameraControls, MessageCard, ClusterLabel
    │   ├── ui/                # Minimap, RandomJump, MessageInput, NearZoomPanel
    │   └── auth/              # AuthProvider, AuthModal
    ├── hooks/                 # useZoomLevel, useGlobeMessages
    ├── utils/                 # clusterMessages, messageInputHelpers
    └── constants/             # globe.ts (상수)

app/                           # Next.js App Router
├── layout.tsx                 # AuthProvider 래핑
├── page.tsx
└── api/
    ├── embed/route.ts         # 임베딩 변환 API
    └── messages/
        ├── route.ts           # 메시지 CRUD (POST 인증 필수)
        └── [id]/
            ├── route.ts       # 개별 메시지 조회
            └── react/route.ts # 반응 추가 (인증 필수)

supabase/migrations/           # DB 마이그레이션
```

## 인증 시스템

익명성을 유지하면서 사용자 식별이 가능한 구조:

- **자동 익명 로그인**: 첫 방문 시 `signInAnonymously()`로 자동 user_id 부여
- **선택적 이메일 가입**: AuthModal에서 이메일/비밀번호로 계정 등록 가능
- **중복 반응 방지**: 동일 사용자가 같은 메시지에 중복 공감 불가 (DB UNIQUE 제약)
- **게시물 익명성**: 작성자 정보는 클라이언트에 노출하지 않음
- **API 인증**: POST 요청에 `Authorization: Bearer <token>` 헤더 필수

## 시작하기

### 사전 요구사항

- Node.js v20+
- pnpm

### 설치 및 실행

```bash
pnpm install
pnpm dev
```

### 환경변수

`.env.local` 파일을 생성하고 다음 변수를 설정:

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
OPENAI_API_KEY=<openai-api-key>
```

### 테스트

```bash
pnpm test          # 전체 테스트 실행
pnpm test:watch    # 감시 모드
```

### 빌드

```bash
pnpm build
```

## API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | /api/messages | 불필요 | 메시지 목록 조회 (좌표 범위 필터 옵션) |
| POST | /api/messages | 필수 | 새 메시지 생성 (content -> embed -> place -> save) |
| GET | /api/messages/[id] | 불필요 | 특정 메시지 조회 |
| POST | /api/messages/[id]/react | 필수 | 메시지에 반응 추가 (중복 시 409) |
| POST | /api/embed | 불필요 | 텍스트를 임베딩 벡터로 변환 |

## 디자인 사양

- 배경: #0A0A0F (딥 네이비)
- 구체 표면: #1A1A2E (반투명, 와이어프레임 #2A2A4A)
- 파티클 색상: 핑크 #EC4899, 민트 #34D399, 라벤더 #A78BFA, 화이트 #F4F4F5
- 텍스트: #E4E4E7, 액센트: #6366F1

## 줌 레벨 시스템

| 레벨 | 카메라 거리 | 표시 내용 |
|------|------------|-----------|
| far | > 20 | 파티클만 (밀도 기반 히트맵) |
| mid | 12 ~ 20 | 파티클 + 군집 라벨 |
| near | < 12 | 개별 메시지 카드 |
