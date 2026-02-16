import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  /** 요청 타임스탬프 배열 (윈도우 내) */
  timestamps: number[];
}

interface RateLimiterOptions {
  /** 윈도우 크기 (밀리초) */
  windowMs: number;
  /** 윈도우 내 최대 요청 수 */
  maxRequests: number;
}

/**
 * IP 기반 in-memory Rate Limiter
 * 슬라이딩 윈도우 방식으로 요청 수를 제한한다
 * 서버리스 환경에서는 인스턴스별로 분리되므로 완벽하지 않지만,
 * 단일 인스턴스 내에서의 남용은 방지할 수 있다
 */
export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;

    // 5분마다 만료된 엔트리 정리
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    // Node.js에서 프로세스 종료 방지
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * 요청이 허용되는지 확인하고, 허용 시 요청을 기록한다
   * @returns 허용 여부와 남은 요청 수
   */
  check(key: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // 윈도우 밖의 타임스탬프 제거
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
      };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - entry.timestamps.length,
    };
  }

  /** 만료된 엔트리 정리 */
  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, entry] of this.store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

/** 클라이언트 IP 추출 (프록시 헤더 포함) */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Rate Limit 초과 시 429 응답 생성 */
export function rateLimitExceeded(): NextResponse {
  return NextResponse.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    { status: 429 }
  );
}

// 라우트별 Rate Limiter 인스턴스 (모듈 레벨 싱글턴)

/** /api/embed - OpenAI 비용 보호: 분당 5회 */
export const embedLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
});

/** /api/messages POST - 메시지 생성: 분당 10회 */
export const messageCreateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

/** /api/messages/[id]/react POST - 반응: 분당 30회 */
export const reactionLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
});
