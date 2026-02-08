import { Embedding } from "@/domain/value-objects/Embedding";
import type { EmbeddingService } from "@/application/interfaces/EmbeddingService";

/**
 * OpenAI text-embedding-3-small을 사용한 EmbeddingService 구현
 * 1536차원의 임베딩 벡터를 생성한다
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  private readonly apiKey: string;
  private readonly model = "text-embedding-3-small";
  private readonly apiUrl = "https://api.openai.com/v1/embeddings";

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "OpenAI API 키가 설정되지 않았습니다: OPENAI_API_KEY"
      );
    }
    this.apiKey = key;
  }

  async embed(text: string): Promise<Embedding> {
    if (!text || text.trim().length === 0) {
      throw new Error("임베딩할 텍스트는 비어있을 수 없습니다");
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI 임베딩 API 호출 실패 (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();
    const vector: number[] = data.data[0].embedding;

    return Embedding.create(vector);
  }
}
