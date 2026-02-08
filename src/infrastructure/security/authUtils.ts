import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/infrastructure/supabase/server";

/**
 * Authorization 헤더에서 JWT 토큰을 추출하고 사용자 ID를 반환한다
 * Service Role 클라이언트의 auth.getUser()를 사용하여 토큰을 검증한다
 *
 * @returns 사용자 ID 또는 null (인증 실패 시)
 */
export async function extractUserId(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;

  try {
    const client = getSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) return null;

    return user.id;
  } catch {
    return null;
  }
}
