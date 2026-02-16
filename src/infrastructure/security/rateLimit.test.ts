import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { RateLimiter } from "./rateLimit";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 3 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("허용 범위 내 요청은 통과시킨다", () => {
    const result1 = limiter.check("user-1");
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = limiter.check("user-1");
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = limiter.check("user-1");
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("최대 요청 수 초과 시 차단한다", () => {
    limiter.check("user-1");
    limiter.check("user-1");
    limiter.check("user-1");

    const result = limiter.check("user-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("다른 키는 독립적으로 추적한다", () => {
    limiter.check("user-1");
    limiter.check("user-1");
    limiter.check("user-1");

    // user-1은 차단되지만 user-2는 허용
    expect(limiter.check("user-1").allowed).toBe(false);
    expect(limiter.check("user-2").allowed).toBe(true);
  });

  it("윈도우 시간이 지나면 요청이 다시 허용된다", () => {
    limiter.check("user-1");
    limiter.check("user-1");
    limiter.check("user-1");
    expect(limiter.check("user-1").allowed).toBe(false);

    // 윈도우 시간(60초) 경과
    vi.advanceTimersByTime(60_001);

    const result = limiter.check("user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("슬라이딩 윈도우: 일부 요청만 만료되면 해당 수만큼 허용", () => {
    // 0초: 요청 1회
    limiter.check("user-1");

    // 30초 후: 요청 2회
    vi.advanceTimersByTime(30_000);
    limiter.check("user-1");
    limiter.check("user-1");

    // 3회 다 사용 → 차단
    expect(limiter.check("user-1").allowed).toBe(false);

    // 31초 후 (총 61초): 첫 번째 요청만 만료
    vi.advanceTimersByTime(31_000);
    const result = limiter.check("user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0); // 나머지 2개 + 방금 1개 = 3개
  });
});
