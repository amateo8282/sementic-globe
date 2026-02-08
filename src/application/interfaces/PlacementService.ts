import { Embedding } from "@/domain/value-objects/Embedding";
import { GlobeCoordinate } from "@/domain/value-objects/GlobeCoordinate";

/**
 * 임베딩 벡터를 구체 좌표로 변환하는 서비스 인터페이스
 * 기존 메시지들과의 코사인 유사도를 기반으로 좌표를 결정한다
 */
export interface PlacementService {
  /** 임베딩 벡터를 기반으로 구체 좌표 계산 */
  calculateCoordinate(
    embedding: Embedding,
    existingMessages: Array<{ embedding: Embedding; coordinate: GlobeCoordinate }>
  ): Promise<GlobeCoordinate>;
}
