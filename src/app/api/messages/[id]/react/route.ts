import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/infrastructure/supabase/server";
import { container } from "@/infrastructure/di/container";
import { ReactToMessage } from "@/application/use-cases/ReactToMessage";

/**
 * POST /api/messages/[id]/react
 * 메시지에 반응 추가
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseServerClient();
    const messageRepository = container.getMessageRepository(client);

    const reactToMessage = new ReactToMessage(messageRepository);
    const result = await reactToMessage.execute(id);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "반응 추가 중 오류 발생";

    // "메시지를 찾을 수 없습니다" 에러는 404로 응답
    if (message === "메시지를 찾을 수 없습니다") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
