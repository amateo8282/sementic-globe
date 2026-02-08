import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/infrastructure/supabase/server";
import { container } from "@/infrastructure/di/container";

/**
 * GET /api/messages/[id]
 * 특정 메시지 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseServerClient();
    const messageRepository = container.getMessageRepository(client);

    const message = await messageRepository.findById(id);
    if (!message) {
      return NextResponse.json(
        { error: "메시지를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: message.id,
      content: message.content,
      lat: message.globeCoordinate?.lat ?? null,
      lng: message.globeCoordinate?.lng ?? null,
      reactionCount: message.reactionCount,
      createdAt: message.createdAt.toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "메시지 조회 중 오류 발생";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
