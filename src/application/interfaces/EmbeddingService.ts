import { Embedding } from "@/domain/value-objects/Embedding";

/**
 * 텍스트를 임베딩 벡터로 변환하는 서비스 인터페이스
 * Infrastructure 계층에서 OpenAI API를 사용하여 구현한다
 */
export interface EmbeddingService {
  /** 텍스트를 임베딩 벡터로 변환 */
  embed(text: string): Promise<Embedding>;
}
