import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/di/container";

/**
 * POST /api/embed
 * 텍스트를 임베딩 벡터로 변환 (디버깅/관리용)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text 필드는 필수입니다" },
        { status: 400 }
      );
    }

    const embeddingService = container.getEmbeddingService();
    const embedding = await embeddingService.embed(text);

    return NextResponse.json({ embedding: [...embedding.vector] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "임베딩 변환 중 오류 발생";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
