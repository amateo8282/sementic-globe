---
name: verify-api-security
description: API 라우트의 인증 가드, 에러 메시지 일반화, Rate Limiting, 입력 검증을 검증합니다. API 라우트 추가/수정 후 사용.
---

# API 보안 검증

## Purpose

API 라우트의 보안 규칙 준수를 검증합니다:

1. **인증 가드** — 상태 변경(POST/PUT/DELETE) 라우트에 `extractUserId` 인증 검증이 적용되었는지
2. **Rate Limiting** — POST 라우트에 Rate Limiter가 적용되었는지
3. **에러 메시지 일반화** — 500 에러 응답에서 내부 에러 상세를 노출하지 않는지
4. **입력 검증** — 사용자 입력(body, query params)에 타입/범위 검증이 적용되었는지

## When to Run

- 새 API 라우트를 추가한 후
- 기존 API 라우트의 보안 로직을 수정한 후
- `authUtils.ts` 또는 `rateLimit.ts`를 변경한 후
- PR 전 보안 점검 시
- 인증/인가 관련 기능을 구현한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/app/api/messages/route.ts` | 메시지 목록 조회(GET) 및 생성(POST) |
| `src/app/api/messages/[id]/route.ts` | 특정 메시지 조회(GET) |
| `src/app/api/messages/[id]/react/route.ts` | 메시지 반응 추가(POST) |
| `src/app/api/embed/route.ts` | 텍스트 임베딩 변환(POST) |
| `src/infrastructure/security/authUtils.ts` | JWT 토큰 검증 및 사용자 ID 추출 |
| `src/infrastructure/security/rateLimit.ts` | IP 기반 Rate Limiter 구현 및 인스턴스 |

## Workflow

### Step 1: 인증 가드 검증

**대상:** `src/app/api/**/route.ts` 내 모든 POST/PUT/DELETE 핸들러

**검사:** 상태 변경 핸들러에 `extractUserId`를 호출하고 미인증 시 401을 반환하는지 확인합니다.

```bash
# 모든 API 라우트에서 POST/PUT/DELETE 핸들러 목록 확인
grep -rn "export async function \(POST\|PUT\|DELETE\)" src/app/api/
```

```bash
# 각 POST/PUT/DELETE 핸들러가 있는 파일에서 extractUserId 사용 여부 확인
grep -l "extractUserId" src/app/api/messages/route.ts src/app/api/messages/\[id\]/react/route.ts src/app/api/embed/route.ts
```

**PASS 기준:** 모든 POST/PUT/DELETE 핸들러가 있는 라우트 파일에서 `extractUserId`를 import하고 호출하며, 미인증 시 `{ status: 401 }` 응답을 반환합니다.

**FAIL 기준:** POST/PUT/DELETE 핸들러가 있는 파일에서 `extractUserId`를 사용하지 않는 경우.

**위반 시 수정:**
```typescript
import { extractUserId } from "@/infrastructure/security/authUtils";

export async function POST(request: NextRequest) {
  const userId = await extractUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "인증이 필요합니다" },
      { status: 401 }
    );
  }
  // ... 비즈니스 로직
}
```

### Step 2: Rate Limiting 검증

**대상:** `src/app/api/**/route.ts` 내 모든 POST 핸들러

**검사:** POST 핸들러에 Rate Limiter가 적용되었는지 확인합니다.

```bash
# POST 핸들러가 있는 파일에서 rateLimitExceeded 또는 Limiter 사용 확인
grep -rn "rateLimitExceeded\|Limiter\|\.check(" src/app/api/
```

```bash
# rateLimit.ts에 각 라우트용 limiter 인스턴스가 정의되어 있는지 확인
grep -n "export const.*Limiter" src/infrastructure/security/rateLimit.ts
```

**PASS 기준:** 모든 POST 핸들러 파일에서 `rateLimit` 모듈을 import하고, `limiter.check(ip)` + `rateLimitExceeded()` 패턴을 사용합니다. `rateLimit.ts`에 해당 라우트의 limiter 인스턴스가 정의되어 있습니다.

**FAIL 기준:** POST 핸들러가 있는 파일에서 Rate Limiter를 사용하지 않는 경우, 또는 `rateLimit.ts`에 해당 limiter 인스턴스가 없는 경우.

**위반 시 수정:**
```typescript
import { xxxLimiter, getClientIp, rateLimitExceeded } from "@/infrastructure/security/rateLimit";

// POST 핸들러 최상단에 추가
const ip = getClientIp(request);
const { allowed } = xxxLimiter.check(ip);
if (!allowed) return rateLimitExceeded();
```

### Step 3: 에러 메시지 일반화 검증

**대상:** `src/app/api/**/route.ts` 내 모든 catch 블록

**검사:** 500 에러 응답에서 `error.message`나 `error.stack` 등 내부 에러 상세를 클라이언트에 노출하지 않는지 확인합니다.

```bash
# catch 블록에서 error 객체를 직접 응답에 포함하는 패턴 탐지
grep -rn "error\.message\|error\.stack\|String(error)" src/app/api/ | grep -v "console\.\|\/\/"
```

```bash
# 500 응답의 에러 메시지가 일반화되어 있는지 확인 (구체적 에러 대신 일반 메시지)
grep -rn "status: 500" src/app/api/ -A2
```

**PASS 기준:** 500 에러 응답에서 `error` 필드에 일반적인 한국어 메시지만 사용합니다 (예: "메시지 조회 중 오류가 발생했습니다"). `error.message`를 직접 500 응답에 포함하지 않습니다. 상세 에러는 `console.error`로만 기록합니다.

**FAIL 기준:** 500 응답에 `error.message`, `error.stack`, `String(error)` 등이 직접 포함된 경우.

**위반 시 수정:**
```typescript
catch (error) {
  console.error("[핸들러명] 오류:", error);
  return NextResponse.json(
    { error: "일반적인 에러 메시지" },
    { status: 500 }
  );
}
```

### Step 4: 입력 검증 확인

**대상:** `src/app/api/**/route.ts` 내 `request.json()` 또는 `searchParams` 사용 핸들러

**검사:** 사용자 입력에 타입 검증과 범위 검증이 적용되었는지 확인합니다.

```bash
# request.json()을 사용하는 핸들러 확인
grep -rn "request.json()" src/app/api/
```

```bash
# 각 핸들러에서 입력 검증 패턴 확인 (typeof, length, isNaN 등)
grep -rn "typeof\|\.length\|isNaN\|isValid" src/app/api/
```

**PASS 기준:** `request.json()`으로 받은 body의 필수 필드에 대해 존재 여부(`!field`)와 타입 검증(`typeof field !== "string"`)이 있습니다. 문자열 입력에 길이 제한이 있습니다. 숫자 입력에 범위 검증이 있습니다. 검증 실패 시 400 응답을 반환합니다.

**FAIL 기준:** body 파싱 후 검증 없이 바로 사용하는 경우, 또는 길이/범위 제한이 없는 경우.

### Step 5: extractUserId 구현 검증

**대상:** `src/infrastructure/security/authUtils.ts`

**검사:** JWT 토큰 검증이 Supabase `auth.getUser()`를 사용하는지 확인합니다.

```bash
# authUtils.ts에서 토큰 검증 방식 확인
grep -n "getUser\|verify\|decode" src/infrastructure/security/authUtils.ts
```

**PASS 기준:** `auth.getUser(token)`을 사용하여 서버 측에서 토큰을 검증합니다. 에러 또는 user 없는 경우 `null`을 반환합니다. try-catch로 예외를 처리합니다.

**FAIL 기준:** `jwt.decode()` 등 검증 없는 디코딩만 사용하거나, 에러 처리가 없는 경우.

## Output Format

```markdown
## API 보안 검증 결과

| # | 검사 항목 | 대상 파일 | 상태 | 상세 |
|---|-----------|-----------|------|------|
| 1 | 인증 가드 | route.ts | PASS/FAIL | ... |
| 2 | Rate Limiting | route.ts | PASS/FAIL | ... |
| 3 | 에러 메시지 일반화 | route.ts | PASS/FAIL | ... |
| 4 | 입력 검증 | route.ts | PASS/FAIL | ... |
| 5 | extractUserId 구현 | authUtils.ts | PASS/FAIL | ... |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **GET 라우트의 인증 미적용** — 공개 데이터 조회 API(GET)는 인증이 필수가 아닙니다. 현재 `GET /api/messages`와 `GET /api/messages/[id]`는 공개 조회 라우트입니다.
2. **GET 라우트의 Rate Limiting 미적용** — 읽기 전용 API는 Rate Limiting이 선택적입니다. 향후 트래픽 증가 시 추가할 수 있습니다.
3. **비즈니스 에러의 구체적 메시지** — 400, 404, 409 등 비즈니스 에러는 구체적인 메시지를 사용할 수 있습니다 (예: "메시지를 찾을 수 없습니다"). 일반화 규칙은 500 에러에만 적용됩니다.
4. **embed 라우트의 인증 미적용** — `/api/embed`는 디버깅/관리용 엔드포인트로, Rate Limiting만으로 비용을 보호합니다. 프로덕션에서 인증 추가를 권장하지만 현재 설계상 허용됩니다.
5. **error.message를 비즈니스 로직에서 사용** — catch 블록 내에서 `error.message`를 조건 분기(예: 404, 409 판단)에 사용하는 것은 허용됩니다. 금지되는 것은 500 응답에 직접 포함하는 것입니다.
