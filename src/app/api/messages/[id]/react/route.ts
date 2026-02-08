import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/infrastructure/supabase/server";
import { container } from "@/infrastructure/di/container";
import { ReactToMessage } from "@/application/use-cases/ReactToMessage";
import {
  reactionLimiter,
  getClientIp,
  rateLimitExceeded,
} from "@/infrastructure/security/rateLimit";

/**
 * POST /api/messages/[id]/react
 * 메시지에 반응 추가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate Limiting
  const ip = getClientIp(request);
  const { allowed } = reactionLimiter.check(ip);
  if (!allowed) return rateLimitExceeded();

  try {
    const { id } = await params;
    const client = getSupabaseServerClient();
    const messageRepository = container.getMessageRepository(client);

    const reactToMessage = new ReactToMessage(messageRepository);
    const result = await reactToMessage.execute(id);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    // "메시지를 찾을 수 없습니다" 에러는 404로 응답
    if (message === "메시지를 찾을 수 없습니다") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("[POST /api/messages/[id]/react] 반응 추가 오류:", error);
    return NextResponse.json(
      { error: "반응 추가 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
