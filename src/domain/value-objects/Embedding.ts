/**
 * 임베딩 벡터를 나타내는 값 객체
 * OpenAI text-embedding-3-small 기준 1536차원
 */
export class Embedding {
  static readonly DIMENSION = 1536;

  private constructor(public readonly vector: readonly number[]) {}

  static create(vector: number[]): Embedding {
    if (vector.length !== Embedding.DIMENSION) {
      throw new Error(
        `임베딩 벡터는 ${Embedding.DIMENSION}차원이어야 합니다: ${vector.length}차원`
      );
    }
    return new Embedding(Object.freeze([...vector]));
  }

  /** 두 임베딩 벡터 간의 코사인 유사도 계산 */
  cosineSimilarity(other: Embedding): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < this.vector.length; i++) {
      dotProduct += this.vector[i] * other.vector[i];
      normA += this.vector[i] * this.vector[i];
      normB += other.vector[i] * other.vector[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  equals(other: Embedding): boolean {
    if (this.vector.length !== other.vector.length) return false;
    return this.vector.every((v, i) => v === other.vector[i]);
  }
}
