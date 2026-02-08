import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/infrastructure/supabase/server";
import { container } from "@/infrastructure/di/container";
import { GetMessages, CoordinateRange } from "@/application/use-cases/GetMessages";
import { CreateMessage } from "@/application/use-cases/CreateMessage";
import {
  messageCreateLimiter,
  getClientIp,
  rateLimitExceeded,
} from "@/infrastructure/security/rateLimit";

/** 좌표 값이 유효한 범위인지 검증 */
function isValidCoordinate(
  lat: number,
  lng: number,
  context: "lat" | "lng"
): boolean {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (context === "lat") return lat >= -90 && lat <= 90;
  return lng >= -180 && lng <= 180;
}

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
      const parsed = {
        latMin: Number(latMin),
        latMax: Number(latMax),
        lngMin: Number(lngMin),
        lngMax: Number(lngMax),
      };

      // 좌표 범위 유효성 검증
      if (
        !isValidCoordinate(parsed.latMin, 0, "lat") ||
        !isValidCoordinate(parsed.latMax, 0, "lat") ||
        !isValidCoordinate(0, parsed.lngMin, "lng") ||
        !isValidCoordinate(0, parsed.lngMax, "lng")
      ) {
        return NextResponse.json(
          { error: "좌표 범위가 유효하지 않습니다 (lat: -90~90, lng: -180~180)" },
          { status: 400 }
        );
      }

      range = parsed;
    }

    const messages = await getMessages.execute(range);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("[GET /api/messages] 메시지 조회 오류:", error);
    return NextResponse.json(
      { error: "메시지 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * 새 메시지 생성 (content -> embed -> place -> save)
 */
export async function POST(request: NextRequest) {
  // Rate Limiting
  const ip = getClientIp(request);
  const { allowed } = messageCreateLimiter.check(ip);
  if (!allowed) return rateLimitExceeded();

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
    console.error("[POST /api/messages] 메시지 생성 오류:", error);
    return NextResponse.json(
      { error: "메시지 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
