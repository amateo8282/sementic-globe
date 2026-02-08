import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/infrastructure/supabase/server";
import { container } from "@/infrastructure/di/container";
import { GetMessages, CoordinateRange } from "@/application/use-cases/GetMessages";
import { CreateMessage } from "@/application/use-cases/CreateMessage";

/**
 * GET /api/messages
 * 전체 메시지 조회 (옵션: 좌표 범위 필터)
 */
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const messageRepository = container.getMessageRepository(client);
    const getMessages = new GetMessages(messageRepository);

    // 쿼리 파라미터에서 좌표 범위 추출
    const { searchParams } = request.nextUrl;
    const latMin = searchParams.get("latMin");
    const latMax = searchParams.get("latMax");
    const lngMin = searchParams.get("lngMin");
    const lngMax = searchParams.get("lngMax");

    let range: CoordinateRange | undefined;
    if (latMin && latMax && lngMin && lngMax) {
      range = {
        latMin: Number(latMin),
        latMax: Number(latMax),
        lngMin: Number(lngMin),
        lngMax: Number(lngMax),
      };
    }

    const messages = await getMessages.execute(range);
    return NextResponse.json(messages);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "메시지 조회 중 오류 발생";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/messages
 * 새 메시지 생성 (content -> embed -> place -> save)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content 필드는 필수입니다" },
        { status: 400 }
      );
    }

    if (content.length < 1 || content.length > 280) {
      return NextResponse.json(
        { error: "메시지는 1~280자여야 합니다" },
        { status: 400 }
      );
    }

    const client = getSupabaseServerClient();
    const messageRepository = container.getMessageRepository(client);
    const embeddingService = container.getEmbeddingService();
    const placementService = container.getPlacementService();

    const createMessage = new CreateMessage(
      messageRepository,
      embeddingService,
      placementService
    );

    const result = await createMessage.execute({ content });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "메시지 생성 중 오류 발생";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
