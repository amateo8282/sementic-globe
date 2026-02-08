# Semantic Globe - Project Planning Document

## 1. Project Overview

### 1.1 What is Semantic Globe?

사용자가 짧은 익명 메시지를 남기면, 해당 메시지의 의미(semantic meaning)에 따라 가상의 3D 구체(globe) 위에 자동 배치되는 서비스다. 사용자는 이 구체를 탐색하며 의미적으로 가까운 메시지들의 군집을 발견하고, 예상치 못한 맥락의 연결을 경험한다.

### 1.2 Core Value Proposition

- 기존 게시판: 사람이 미리 정의한 카테고리에 글을 분류
- Semantic Globe: 글의 의미가 스스로 위치를 결정. "슬픔"과 "도전"이 가까이 놓이는 건 누군가 그렇게 분류해서가 아니라, 실제로 그런 맥락의 글이 존재하기 때문
- 탐색 자체가 목적이 되는 서비스. 정해진 경로 없이 구체를 돌아다니며 메시지 군집을 발견하는 재미

### 1.3 Design Philosophy

- 철저한 익명성: 회원가입은 있되, 모든 게시물은 완전 익명. 닉네임도 표시하지 않음
- 심미적으로 현대적인 UI: 다크 테마 기반, 구체 위의 메시지는 빛나는 입자처럼 표현
- 탐험적 UX: 스크롤/드래그로 구체를 회전하고, 줌인하면 개별 메시지가 보이는 레이어 구조

---

## 2. Technical Architecture

### 2.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14+ (App Router) | SSR/SSG 지원, React 생태계 활용 |
| 3D Rendering | Three.js + React Three Fiber | 구체 렌더링, 카메라 컨트롤, 파티클 시스템 |
| Styling | Tailwind CSS + Framer Motion | 현대적 UI, 부드러운 전환 애니메이션 |
| Backend/DB | Supabase (PostgreSQL + pgvector) | 벡터 저장/검색, 인증, 실시간 구독, Edge Functions |
| Embedding | OpenAI text-embedding-3-small | 메시지를 1536차원 벡터로 변환 |
| 차원 축소 | UMAP (Python microservice 또는 pre-computed) | 고차원 벡터를 2D 구면 좌표로 변환 |
| Deployment | Vercel (Frontend) + Supabase (Backend) | 무료 티어 활용 가능, 빠른 배포 |

### 2.2 System Architecture

```
[User Browser]
    |
    |-- Next.js Frontend (Vercel)
    |     |-- Three.js Globe Renderer
    |     |-- Message Input UI
    |     |-- Minimap Component
    |
    |-- Supabase Backend
    |     |-- Auth (Anonymous + Email)
    |     |-- PostgreSQL + pgvector (messages, embeddings)
    |     |-- Edge Functions
    |           |-- /api/embed: 메시지 → OpenAI embedding → DB 저장
    |           |-- /api/messages: 구체 좌표 기반 메시지 조회
    |
    |-- UMAP Service (선택)
          |-- 일일 배치: 전체 메시지 UMAP 재계산 → 구면 좌표 업데이트
          |-- 또는: Supabase Edge Function 내에서 근사 배치 (MVP)
```

### 2.3 Database Schema

```sql
-- Supabase PostgreSQL with pgvector extension

-- 사용자 (Supabase Auth 활용, 최소 정보만)
-- Supabase auth.users 테이블 자동 생성됨

-- 메시지
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  embedding vector(1536),           -- OpenAI embedding
  globe_lat FLOAT,                  -- 구체 위 위도 (-90 ~ 90)
  globe_lng FLOAT,                  -- 구체 위 경도 (-180 ~ 180)
  epoch INT NOT NULL DEFAULT 0,     -- 재편성 회차 (epoch 변경 시 좌표 재계산)
  reaction_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 반응 (중복 방지)
CREATE TABLE reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- 재편성 이력
CREATE TABLE epochs (
  id SERIAL PRIMARY KEY,
  epoch_number INT NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT now(),
  message_count INT,
  status TEXT DEFAULT 'completed'
);

-- pgvector 인덱스
CREATE INDEX ON messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON messages (epoch, globe_lat, globe_lng);

-- RLS (Row Level Security)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 메시지를 읽을 수 있음 (익명이므로)
CREATE POLICY "Messages are viewable by everyone"
  ON messages FOR SELECT USING (true);

-- 인증된 사용자만 메시지 작성 가능
CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 자기 메시지만 삭제 가능
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE USING (auth.uid() = user_id);
```

### 2.4 Vector-to-Globe Mapping 로직

메시지 임베딩(1536차원)을 구체 위 2D 좌표(위도/경도)로 변환하는 과정:

```
1. 메시지 입력 → OpenAI embedding API → 1536차원 벡터
2. 차원 축소 (UMAP): 1536차원 → 2차원 (x, y)
3. 정규화: x, y 값을 [-1, 1] 범위로 스케일링
4. 구면 좌표 변환:
   - latitude = y * 90 (위도: -90 ~ 90)
   - longitude = x * 180 (경도: -180 ~ 180)
5. DB에 globe_lat, globe_lng 저장
```

**MVP 단계 간소화 접근법:**

전체 UMAP을 매번 돌리기 어려우므로, MVP에서는 다음 방법을 사용한다:

1. 초기 seed 데이터(300~500개)로 UMAP 모델을 한 번 학습
2. 새 메시지가 들어오면 기존 메시지들과의 cosine similarity 상위 5개를 찾고, 그 좌표의 가중 평균 근처에 약간의 랜덤 오프셋을 더해 배치
3. 일일 1회 전체 재계산으로 지형 리셋

```python
# 간소화된 신규 메시지 배치 로직 (pseudo-code)
def place_new_message(new_embedding, existing_messages):
    # 1. 가장 유사한 5개 메시지 찾기
    similarities = cosine_similarity(new_embedding, existing_embeddings)
    top_5_indices = similarities.argsort()[-5:]

    # 2. 유사도 가중 평균 좌표 계산
    weights = similarities[top_5_indices]
    weights = weights / weights.sum()

    avg_lat = sum(w * msg.globe_lat for w, msg in zip(weights, top_5))
    avg_lng = sum(w * msg.globe_lng for w, msg in zip(weights, top_5))

    # 3. 약간의 랜덤 오프셋 추가 (겹침 방지)
    offset_lat = random.uniform(-2, 2)
    offset_lng = random.uniform(-2, 2)

    return avg_lat + offset_lat, avg_lng + offset_lng
```

---

## 3. Implementation Phases

### Phase 1: Core Experience Prototype (MVP)

목표: "구체 위에서 메시지 군집을 탐색하는 경험이 실제로 재미있는가?"를 검증한다.

#### Task 1.1: 프로젝트 초기 셋업
- Next.js 14+ 프로젝트 생성 (App Router, TypeScript)
- Tailwind CSS, Framer Motion 설치
- Three.js, React Three Fiber, @react-three/drei 설치
- Supabase 프로젝트 생성 및 pgvector extension 활성화
- 환경변수 설정 (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)

#### Task 1.2: DB 스키마 및 Supabase 설정
- 위 2.3의 스키마를 Supabase에 적용
- RLS 정책 설정
- Edge Function 기본 구조 생성

#### Task 1.3: 임베딩 파이프라인 구축
- Supabase Edge Function: 메시지 텍스트 → OpenAI embedding API 호출 → 벡터 DB 저장
- 에러 핸들링 (API 실패, 빈 메시지 등)

#### Task 1.4: 더미 데이터 생성 및 군집 검증
- 다양한 주제의 한국어 메시지 300~500개 생성
  - 감정 카테고리: 슬픔, 기쁨, 분노, 평온, 불안, 희망 등
  - 일상 카테고리: 음식, 여행, 일, 연애, 가족, 취미 등
  - 경계 영역: "이별의 아픔"(슬픔+연애), "도전하지 못하는 슬픔"(슬픔+도전) 등
- 전체 임베딩 생성 후 UMAP 차원 축소 실행
- 2D scatter plot으로 군집 형성 여부 확인 (이 단계에서 go/no-go 판단)
- 군집이 의미 있게 형성되면 구면 좌표 변환 후 DB 저장

#### Task 1.5: 3D 구체 렌더링 (Core)
- React Three Fiber로 기본 구체 생성
- 구체 위에 메시지를 점(particle)으로 배치
- 카메라 컨트롤: OrbitControls (드래그로 회전, 스크롤로 줌)
- 다크 배경 + 구체는 반투명/와이어프레임 스타일

#### Task 1.6: 줌 레벨별 렌더링
- Level 1 (원거리): 메시지들이 빛나는 점으로만 보임. 군집이 밀집된 곳은 밝게, 적은 곳은 어둡게 (히트맵 효과)
- Level 2 (중거리): 줌인하면 점들이 커지며, 군집의 대표 키워드가 라벨로 표시됨
- Level 3 (근거리): 개별 메시지 내용이 카드 형태로 표시됨
- 줌 레벨 전환 시 Framer Motion으로 부드러운 전환

#### Task 1.7: 미니맵 구현
- 구체를 2D 원형으로 투영한 소형 맵 (화면 우하단)
- 현재 카메라가 보고 있는 영역을 하이라이트 표시
- 군집별 색상 차이 표현
- 미니맵 클릭 시 해당 영역으로 카메라 이동

#### Task 1.8: 기본 인터랙션
- "임의 이동" 버튼: 랜덤 좌표로 카메라를 부드럽게 이동
- 메시지 카드 클릭 시 확대 보기
- 근처 메시지 목록 사이드 패널

### Phase 2: User Interaction

#### Task 2.1: 인증 시스템 (익명 우선)
- Supabase Auth: 익명 로그인(Anonymous Sign-In) 기본
- 선택적 이메일 회원가입 (메시지 히스토리 보존용)
- 회원가입해도 게시물에는 어떤 사용자 정보도 노출하지 않음
- 로그인 UI: 모달 형태, 최소한의 필드

#### Task 2.2: 메시지 작성 UI
- 화면 하단 고정된 입력 바 (280자 제한, 실시간 카운터)
- 제출 시: 임베딩 생성 → 근사 좌표 계산 → DB 저장 → 구체에 실시간 반영
- 작성 완료 시 카메라가 해당 메시지 위치로 이동하는 애니메이션
- 제목 없음, 태그 없음. 오직 본문만

#### Task 2.3: 반응 시스템
- 가벼운 반응만: "공감" 하나 (하트/별 아이콘)
- 댓글 기능 없음 (게시판화 방지)
- 반응 수는 메시지 카드에 작게 표시
- 중복 반응 방지 (reactions 테이블의 UNIQUE 제약)

### Phase 3: Reshuffling System

#### Task 3.1: 일일 재편성 배치
- 매일 새벽 (한국시간 04:00) 전체 메시지 UMAP 재계산
- epoch 번호 증가, 새 좌표로 업데이트
- 이전 epoch의 좌표는 epochs 테이블에 이력 보존
- Supabase pg_cron 또는 외부 크론 서비스 활용

#### Task 3.2: 신규 메시지 실시간 배치
- 2.4에서 설명한 cosine similarity 기반 근사 배치
- 재편성 사이의 기간 동안 사용

#### Task 3.3: "다시 섞기" 개인 뷰 (선택적)
- 사용자 개인에게만 적용되는 재편성 트리거
- 서버 리소스 고려하여 MVP에서는 제외 가능

### Phase 4: Polish & Enhancement

#### Task 4.1: 군집 자동 라벨링
- 각 군집 내 메시지들의 공통 키워드 추출
- 구체 위 해당 영역에 라벨 오버레이

#### Task 4.2: 개인 궤적 시각화
- 내가 쓴 글들이 구체 위에서 어떤 위치에 분포하는지 경로 표시
- "나의 관심사 지도" 개념

#### Task 4.3: 시각적 고도화
- 군집 밀도에 따른 지형 높낮이 (산/평지 효과)
- 의미 경계선 (Voronoi diagram 스타일)
- 파티클 효과, 구체 표면 셰이더

#### Task 4.4: 시간 축 탐색
- 슬라이더로 과거 epoch의 지형 탐색
- "한 달 전 이 지역은 어떤 글들이 있었나?"

---

## 4. UI/UX Design Specification

### 4.1 Color Palette

```
Background:       #0A0A0F (거의 검정에 가까운 딥 네이비)
Globe Surface:    #1A1A2E (반투명, 와이어프레임 라인은 #2A2A4A)
Message Particles: 군집별 색상 그라데이션
  - 감정 계열: #FF6B9D (핑크) ~ #C44569 (딥 로즈)
  - 일상 계열: #4ECDC4 (민트) ~ #2C7A7B (틸)
  - 생각/철학: #A78BFA (라벤더) ~ #7C3AED (퍼플)
  - 기본: #F4F4F5 (따뜻한 화이트)
Text:             #E4E4E7 (밝은 회색)
Accent:           #6366F1 (인디고, CTA 버튼 등)
Card Background:  #18181B (메시지 카드 배경)
```

### 4.2 Typography

- 한국어 본문: Pretendard 또는 SUIT
- 영문/숫자: Inter
- 메시지 카드 본문: 15px, line-height 1.6
- 군집 라벨: 12px, uppercase, letter-spacing 0.1em

### 4.3 Layout Structure

```
+-------------------------------------------------------+
|  [Logo]              Semantic Globe        [? | Write] |
|-------------------------------------------------------|
|                                                       |
|                                                       |
|               [3D Globe - Full Screen]                |
|                                                       |
|                                                       |
|                                          +--------+   |
|                                          |Minimap |   |
|                                          +--------+   |
|-------------------------------------------------------|
|  [Random Jump]  [< Epoch: Day 47 >]    [Write Message]|
+-------------------------------------------------------+

-- Message Card (근접 뷰에서 표시) --
+-----------------------------------+
|  오늘 하늘이 참 예뻤다.             |
|  아무도 모르는 나만의 하늘.         |
|                                   |
|         12시간 전  ♡ 23           |
+-----------------------------------+
```

### 4.4 Interaction Patterns

- 구체 회전: 마우스 드래그 / 터치 드래그
- 줌인/아웃: 스크롤 휠 / 핀치 줌
- 메시지 카드 표시: 충분히 줌인하면 자동으로 나타남
- 카드 클릭: 확대 뷰 + 주변 메시지 목록
- 미니맵 클릭: 해당 영역으로 부드러운 카메라 이동
- 임의 이동: 클릭 시 랜덤 좌표로 2초간 카메라 비행

### 4.5 Animation Guidelines

- 카메라 이동: ease-in-out, 1~2초
- 메시지 카드 등장: fade-in + scale (0.8 → 1.0), 0.3초
- 줌 레벨 전환: 파티클 크기, 투명도가 연속적으로 변화
- 새 메시지 배치: 구체 표면에서 빛이 퍼지는 ripple 효과
- 재편성 시: 파티클들이 새 위치로 이동하는 transition (개발 여유 있을 때)

---

## 5. Anonymity Design

### 5.1 원칙

- 메시지에는 작성자 정보가 일절 표시되지 않음 (닉네임, 프로필 사진, ID 모두 없음)
- 시간 정보만 "n시간 전", "n일 전" 형태로 표시
- "이 사람의 다른 글 보기" 같은 기능 없음
- 로그인한 사용자도 본인 글을 구별하는 방법은 "내가 쓴 글" 필터뿐

### 5.2 계정의 역할

- 계정은 오직 다음 용도로만 사용:
  - 본인이 쓴 글 목록 확인/삭제
  - 반응한 글 목록 확인
  - 일일 메시지 작성 수 제한 (스팸 방지)
- 가입 정보: 이메일만 (또는 익명 세션)
- 타인에게 계정 정보가 노출되는 경로 완전 차단

### 5.3 신고/관리

- 부적절한 메시지 신고 기능 (신고 시에도 작성자 정보 비공개)
- 관리자만 user_id 확인 가능 (어뷰징 대응용)
- 일정 신고 수 초과 시 자동 숨김 처리

---

## 6. Revenue Model (Early Stage Planning)

수익화는 MVP 검증 후 판단하되, 방향성만 정리해둔다.

### 6.1 가능한 수익원

| Model | Description | Feasibility |
|-------|-------------|-------------|
| 프리미엄 테마 | 구체의 시각적 테마 변경 (우주, 바다, 숲 등) | 중 - 시각적 서비스라 자연스럽다 |
| 메시지 하이라이트 | 본인 메시지를 더 눈에 띄게 표시 (빛나는 효과 등) | 중 - 익명성과 충돌하지 않는 선에서 |
| 과거 지형 열람 | 무료는 오늘의 지형만, 유료는 과거 epoch 탐색 가능 | 중 - 데이터 축적 후 가치 생김 |
| 개인 분석 리포트 | 내가 쓴 글의 의미 분포, 감정 트렌드 분석 | 높음 - 자기 이해 도구로서 가치 |
| API 제공 | 군집 트렌드 데이터를 리서치 목적으로 판매 | 낮음 - 규모 필요 |
| 후원/기부 | 서비스 유지를 위한 자발적 후원 | 낮음 - 초기에는 비현실적 |

### 6.2 수익화 시 지켜야 할 원칙

- 익명성을 훼손하는 유료 기능은 절대 불가 (예: 작성자 정보 공개)
- 광고는 탐색 경험을 해치므로 최대한 배제
- 무료 사용자도 핵심 경험(글 쓰기, 탐색)은 동일하게 이용 가능
- 유료 기능은 "더 많이 보기"가 아닌 "다르게 보기" 방향

### 6.3 운영 비용 추정 (월 기준)

```
Supabase Free Tier:     $0 (500MB DB, 50K auth users, 500K Edge Function invocations)
OpenAI Embedding:       ~$5-15 (text-embedding-3-small, 월 1만 메시지 가정)
Vercel Free Tier:       $0 (100GB bandwidth)
도메인:                  ~$10-15/년

MVP 단계 월 운영비: 약 $5-15
```

---

## 7. Development Guidelines for Claude Code

### 7.1 프로젝트 구조

```
semantic-globe/
├── app/
│   ├── layout.tsx              # Root layout (다크 테마, 폰트)
│   ├── page.tsx                # 메인 페이지 (Globe 뷰)
│   ├── api/
│   │   ├── embed/route.ts      # 메시지 임베딩 API
│   │   └── messages/route.ts   # 메시지 CRUD API
│   └── auth/
│       └── callback/route.ts   # Supabase auth callback
├── components/
│   ├── globe/
│   │   ├── Globe.tsx           # 메인 3D 구체 컴포넌트
│   │   ├── MessageParticles.tsx# 파티클 시스템
│   │   ├── MessageCard.tsx     # 근접 뷰 메시지 카드
│   │   ├── ClusterLabel.tsx    # 군집 라벨
│   │   └── CameraControls.tsx  # 카메라 컨트롤 로직
│   ├── ui/
│   │   ├── Minimap.tsx         # 미니맵
│   │   ├── MessageInput.tsx    # 메시지 작성 입력바
│   │   ├── RandomJump.tsx      # 임의 이동 버튼
│   │   └── EpochIndicator.tsx  # 현재 epoch 표시
│   └── auth/
│       └── AuthModal.tsx       # 로그인/회원가입 모달
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Supabase 클라이언트 초기화
│   │   ├── server.ts           # 서버사이드 Supabase
│   │   └── types.ts            # DB 타입 정의
│   ├── embedding.ts            # OpenAI embedding 호출
│   ├── placement.ts            # 벡터 → 구면 좌표 변환 로직
│   └── constants.ts            # 줌 레벨 threshold, 색상 등 상수
├── scripts/
│   ├── generate-seed-data.ts   # 더미 데이터 생성 스크립트
│   ├── compute-umap.py         # UMAP 차원 축소 배치 스크립트
│   └── recompute-epoch.ts      # 일일 재편성 스크립트
├── public/
│   └── textures/               # 구체 텍스처 등
├── supabase/
│   ├── migrations/             # DB 마이그레이션 파일
│   └── functions/              # Supabase Edge Functions
├── .env.local                  # 환경변수
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 7.2 Implementation Order

Claude Code에서 순차적으로 실행할 작업 순서:

```
Step 1: 프로젝트 초기화
  - Next.js 프로젝트 생성
  - 의존성 설치 (three, @react-three/fiber, @react-three/drei, framer-motion, @supabase/supabase-js)
  - Tailwind 설정 (다크 테마 기본)
  - 기본 레이아웃 및 페이지 구조

Step 2: Supabase 설정
  - 프로젝트 연결
  - DB 스키마 마이그레이션 작성 및 적용
  - RLS 정책 설정
  - 타입 생성

Step 3: 더미 데이터 파이프라인 (go/no-go 검증)
  - generate-seed-data.ts 작성: 다양한 한국어 메시지 300개 생성
  - embedding.ts: OpenAI API로 전체 임베딩 생성
  - compute-umap.py: UMAP 차원 축소 → 구면 좌표 변환
  - DB에 결과 저장
  - 2D scatter plot으로 군집 검증 (이 시점에서 의미 있는 군집이 형성되지 않으면 접근법 재검토)

Step 4: 3D 구체 렌더링
  - Globe.tsx: 기본 구체 + 배경
  - MessageParticles.tsx: DB에서 메시지 좌표 로드 → 파티클로 렌더링
  - CameraControls.tsx: OrbitControls 래핑, 줌 제한 설정

Step 5: 줌 레벨 시스템
  - 카메라 거리에 따른 3단계 렌더링 분기
  - Level 1: 파티클만 (색상+밝기로 밀도 표현)
  - Level 2: 파티클 + 라벨
  - Level 3: 메시지 카드 표시

Step 6: 미니맵 + 네비게이션
  - Minimap.tsx: 2D 투영 맵
  - RandomJump.tsx: 랜덤 좌표 이동
  - 카메라 애니메이션 (부드러운 이동)

Step 7: 메시지 작성 기능
  - AuthModal.tsx: 익명 로그인 + 이메일 가입
  - MessageInput.tsx: 입력 UI
  - embed API: 메시지 → 임베딩 → 근사 좌표 계산 → DB 저장
  - 실시간 구체 반영

Step 8: 반응 시스템
  - 공감 버튼 UI
  - reactions 테이블 CRUD
  - 반응 수 표시

Step 9: 재편성 시스템
  - recompute-epoch.ts: 전체 UMAP 재계산 스크립트
  - epoch 표시 UI
  - 크론잡 설정
```

### 7.3 Key Technical Notes

**Three.js 성능 최적화:**
- 메시지가 수천 개 이상일 때는 InstancedMesh 또는 Points(BufferGeometry)를 사용
- 개별 Mesh로 메시지를 렌더링하면 성능 급격히 저하
- LOD(Level of Detail)를 적극 활용: 먼 거리에서는 GPU 파티클, 가까이에서만 HTML 오버레이

**임베딩 비용 절감:**
- text-embedding-3-small은 ada-002 대비 5배 저렴하면서 성능 유사
- 280자 메시지는 보통 100 토큰 이내이므로 비용 미미
- 배치 처리로 API 호출 최소화

**UMAP 실행 환경:**
- MVP에서는 로컬 Python 스크립트로 충분
- 규모 확장 시 Supabase Edge Function 또는 별도 Python 마이크로서비스
- umap-learn 라이브러리 사용, n_components=2, metric='cosine'

---

## 8. MVP Success Criteria

### 8.1 Go/No-Go 판단 기준 (Phase 1 완료 시)

1. **군집 형성 여부**: 더미 데이터 300개로 UMAP 결과에서 최소 5개 이상의 의미적으로 구별되는 군집이 형성되는가?
2. **탐색 재미**: 구체를 돌려보며 "이 근처에 또 뭐가 있지?"라는 호기심이 자연스럽게 생기는가?
3. **맥락 연결**: "슬픔"과 "도전"처럼 예상치 못한 의미적 근접성이 관찰되는가?

위 3가지 중 2개 이상 충족되면 Phase 2 진행, 그렇지 않으면 임베딩 모델이나 시각화 방식 변경 후 재시도.

### 8.2 Long-term Metrics (서비스 런칭 후)

- 일 활성 사용자(DAU)
- 평균 탐색 시간 (체류 시간)
- 메시지 작성률 (DAU 대비)
- 재방문율 (D1, D7, D30)
- 반응 비율 (읽은 메시지 대비 공감 수)
