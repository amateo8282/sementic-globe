import { Embedding } from "@/domain/value-objects/Embedding";
import { GlobeCoordinate } from "@/domain/value-objects/GlobeCoordinate";
import type { PlacementService } from "@/application/interfaces/PlacementService";

/**
 * 코사인 유사도 기반 좌표 배치 서비스
 * 새 메시지의 임베딩과 기존 메시지들의 유사도를 비교하여
 * 가장 유사한 메시지 근처에 좌표를 배치한다
 */
export class CosineSimilarityPlacementService implements PlacementService {
  // 유사한 메시지 근처에 배치할 때 추가하는 노이즈 범위 (도 단위)
  private readonly noiseRange = 10;

  async calculateCoordinate(
    embedding: Embedding,
    existingMessages: Array<{
      embedding: Embedding;
      coordinate: GlobeCoordinate;
    }>
  ): Promise<GlobeCoordinate> {
    // 기존 메시지가 없으면 랜덤 좌표 생성
    if (existingMessages.length === 0) {
      return this.generateRandomCoordinate();
    }

    // 가장 유사한 메시지 찾기
    let maxSimilarity = -Infinity;
    let mostSimilarIndex = 0;

    for (let i = 0; i < existingMessages.length; i++) {
      const similarity = embedding.cosineSimilarity(
        existingMessages[i].embedding
      );
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilarIndex = i;
      }
    }

    const nearestMessage = existingMessages[mostSimilarIndex];
    const baseLat = nearestMessage.coordinate.lat;
    const baseLng = nearestMessage.coordinate.lng;

    // 유사도에 반비례하는 노이즈 추가 (유사할수록 가까이 배치)
    const noiseFactor = 1 - Math.abs(maxSimilarity);
    const latNoise =
      (Math.random() - 0.5) * this.noiseRange * noiseFactor;
    const lngNoise =
      (Math.random() - 0.5) * this.noiseRange * noiseFactor;

    // 좌표 범위 클램핑
    const newLat = Math.max(-90, Math.min(90, baseLat + latNoise));
    const newLng = Math.max(-180, Math.min(180, baseLng + lngNoise));

    return GlobeCoordinate.create(newLat, newLng);
  }

  /** 랜덤 구면 좌표 생성 */
  private generateRandomCoordinate(): GlobeCoordinate {
    // 균일한 구면 분포를 위해 아크사인 변환 사용
    const lat = (Math.asin(Math.random() * 2 - 1) * 180) / Math.PI;
    const lng = Math.random() * 360 - 180;
    return GlobeCoordinate.create(lat, lng);
  }
}
