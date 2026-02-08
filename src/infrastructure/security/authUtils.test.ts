import { describe, it, expect, vi, beforeEach } from "vitest";

// 모듈 모킹
vi.mock("@/infrastructure/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

import { extractUserId } from "./authUtils";
import { getSupabaseServerClient } from "@/infrastructure/supabase/server";

function createMockRequest(authHeader?: string): any {
  const headers = new Map<string, string>();
  if (authHeader) {
    headers.set("authorization", authHeader);
  }
  return {
    headers: {
      get: (key: string) => headers.get(key) ?? null,
    },
  };
}

describe("extractUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("유효한 토큰에서 사용자 ID를 추출한다", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
    };
    vi.mocked(getSupabaseServerClient).mockReturnValue(mockClient as any);

    const request = createMockRequest("Bearer valid-token");
    const userId = await extractUserId(request);

    expect(userId).toBe("user-123");
    expect(mockClient.auth.getUser).toHaveBeenCalledWith("valid-token");
  });

  it("Authorization 헤더가 없으면 null을 반환한다", async () => {
    const request = createMockRequest();
    const userId = await extractUserId(request);
    expect(userId).toBeNull();
  });

  it("잘못된 토큰이면 null을 반환한다", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "invalid token" },
        }),
      },
    };
    vi.mocked(getSupabaseServerClient).mockReturnValue(mockClient as any);

    const request = createMockRequest("Bearer invalid-token");
    const userId = await extractUserId(request);
    expect(userId).toBeNull();
  });

  it("auth.getUser에서 예외 발생 시 null을 반환한다", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error("network error")),
      },
    };
    vi.mocked(getSupabaseServerClient).mockReturnValue(mockClient as any);

    const request = createMockRequest("Bearer some-token");
    const userId = await extractUserId(request);
    expect(userId).toBeNull();
  });
});
