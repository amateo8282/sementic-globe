# 보안 취약점 보완 지침

## 목차
1. [의존성 취약점](#1-의존성-취약점)
2. [시크릿 관리](#2-시크릿-관리)
3. [Supabase 보안](#3-supabase-보안)
4. [API 라우트 보안](#4-api-라우트-보안)
5. [프론트엔드 보안](#5-프론트엔드-보안)
6. [Next.js 보안 설정](#6-nextjs-보안-설정)
7. [배포 환경 설정](#7-배포-환경-설정)

---

## 1. 의존성 취약점

### 자동 수정
```bash
# 취약점 확인
npm audit

# 자동 수정 (호환성 깨지지 않는 범위)
npm audit fix

# 강제 수정 (major 업데이트 포함, 주의 필요)
npm audit fix --force
```

### 수동 수정
```bash
# 특정 패키지 업데이트
npm update <package-name>

# 최신 버전으로 업그레이드
npm install <package-name>@latest
```

### 예방
```json
// package.json에 추가
{
  "scripts": {
    "audit": "npm audit --audit-level=high",
    "preinstall": "npm audit --audit-level=critical"
  }
}
```

---

## 2. 시크릿 관리

### 환경변수 설정

```bash
# .env.local (로컬 개발용, git에 커밋하지 않음)
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# .env.example (템플릿, git에 커밋)
DATABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### .gitignore 필수 항목
```gitignore
# 환경변수
.env
.env.local
.env.*.local
.env.development.local
.env.test.local
.env.production.local

# 의존성
node_modules/

# 빌드
.next/
dist/
build/
```

### NEXT_PUBLIC 규칙
```typescript
// ❌ 절대 금지 - 클라이언트에 노출됨
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_DATABASE_URL=...
NEXT_PUBLIC_API_SECRET=...

// ✅ 허용 - 공개되어도 안전한 값만
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=...
```

### 하드코딩 제거
```typescript
// ❌ 하드코딩
const apiKey = "sk-1234567890abcdef";

// ✅ 환경변수 사용
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required");
```

---

## 3. Supabase 보안

### RLS (Row Level Security) 활성화

```sql
-- 테이블에 RLS 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 정책 예시: 본인 데이터만 조회
CREATE POLICY "Users can view own posts"
ON posts FOR SELECT
USING (auth.uid() = user_id);

-- 정책 예시: 본인만 수정
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (auth.uid() = user_id);

-- 정책 예시: 인증된 사용자만 삽입
CREATE POLICY "Authenticated users can insert"
ON posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
```

### 클라이언트 vs 서버 키 구분

```typescript
// ✅ 클라이언트 사이드 (브라우저)
// anon key만 사용
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // anon key
);

// ✅ 서버 사이드 (API Route, Server Action)
// service_role key 사용 가능
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // service_role key
  { auth: { persistSession: false } }
);
```

### Server Action에서 안전하게 사용
```typescript
// app/actions/posts.ts
"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function deletePost(postId: string) {
  // 권한 확인 로직 필수
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  
  // 본인 게시물인지 확인
  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single();
    
  if (post?.user_id !== session.user.id) {
    throw new Error("Forbidden");
  }
  
  await supabaseAdmin.from('posts').delete().eq('id', postId);
}
```

---

## 4. API 라우트 보안

### 인증 미들웨어 적용

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // API 라우트 보호
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // 공개 API 제외
    const publicPaths = ['/api/auth', '/api/public'];
    if (publicPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
      return NextResponse.next();
    }

    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### Rate Limiting 적용

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10초에 10회
  analytics: true,
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
  return { success, limit, reset, remaining };
}

// API 라우트에서 사용
// app/api/posts/route.ts
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await checkRateLimit(ip);
  
  if (!success) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }
  
  // 로직 처리
}
```

### Input Validation

```typescript
// lib/validations.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).max(5).optional(),
});

// API 라우트에서 사용
export async function POST(request: Request) {
  const body = await request.json();
  
  const result = createPostSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 }
    );
  }
  
  const { title, content, tags } = result.data;
  // 안전하게 사용
}
```

---

## 5. 프론트엔드 보안

### XSS 방지

```typescript
// ❌ 위험
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ DOMPurify로 sanitize
import DOMPurify from 'dompurify';

<div 
  dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(userInput) 
  }} 
/>

// ✅ 더 안전한 방법: 마크다운 파서 사용
import ReactMarkdown from 'react-markdown';

<ReactMarkdown>{userInput}</ReactMarkdown>
```

### 민감정보 클라이언트 노출 방지

```typescript
// ❌ 클라이언트 컴포넌트에서 직접 접근
"use client";
const secret = process.env.API_SECRET; // undefined (노출 안됨)

// ✅ Server Component나 API Route에서 처리
// app/api/data/route.ts
export async function GET() {
  const secret = process.env.API_SECRET;
  const data = await fetchWithSecret(secret);
  return Response.json(data); // 결과만 전달
}
```

---

## 6. Next.js 보안 설정

### 보안 헤더 설정

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https:;
      font-src 'self';
      connect-src 'self' https://*.supabase.co;
    `.replace(/\n/g, '')
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 7. 배포 환경 설정

### Vercel 환경변수 설정

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Production/Preview/Development 환경별로 설정
3. 민감한 키는 "Sensitive" 옵션 체크

### AWS (Amplify/EC2) 환경변수

```bash
# Amplify: amplify.yml
build:
  commands:
    - npm run build
  
# 또는 AWS Systems Manager Parameter Store 사용
aws ssm put-parameter \
  --name "/myapp/prod/DATABASE_URL" \
  --value "postgresql://..." \
  --type "SecureString"
```

### CORS 설정

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || 'https://yourdomain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

## 체크리스트

### 배포 전 필수 확인

- [ ] `npm audit` 실행, critical/high 취약점 없음
- [ ] `.env*` 파일이 `.gitignore`에 포함
- [ ] 하드코딩된 시크릿 없음
- [ ] `NEXT_PUBLIC_*`에 민감정보 없음
- [ ] Supabase RLS 정책 활성화
- [ ] service_role key가 클라이언트에 노출되지 않음
- [ ] API 라우트에 인증 적용
- [ ] `dangerouslySetInnerHTML` 사용 시 sanitize 적용
- [ ] 보안 헤더 설정 완료
- [ ] Vercel/AWS 환경변수 올바르게 설정
