import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/di/container";
import {
  embedLimiter,
  getClientIp,
  rateLimitExceeded,
} from "@/infrastructure/security/rateLimit";

/** 임베딩 요청 최대 텍스트 길이 */
const MAX_TEXT_LENGTH = 500;

/**
 * POST /api/embed
 * 텍스트를 임베딩 벡터로 변환 (디버깅/관리용)
 */
export async function POST(request: NextRequest) {
  // Rate Limiting (OpenAI API 비용 보호)
  const ip = getClientIp(request);
  const { allowed } = embedLimiter.check(ip);
  if (!allowed) return rateLimitExceeded();

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text 필드는 필수입니다" },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `텍스트는 ${MAX_TEXT_LENGTH}자 이내여야 합니다` },
        { status: 400 }
      );
    }

    const embeddingService = container.getEmbeddingService();
    const embedding = await embeddingService.embed(text);

    return NextResponse.json({ embedding: [...embedding.vector] });
  } catch (error) {
    // 민감 정보 노출 방지: 서버 로그에만 상세 에러 기록
    console.error("[POST /api/embed] 임베딩 변환 오류:", error);
    return NextResponse.json(
      { error: "임베딩 변환 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
