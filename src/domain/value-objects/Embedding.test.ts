import { describe, it, expect } from "vitest";
import { Embedding } from "./Embedding";

// 테스트용 벡터 헬퍼: 지정 인덱스만 1이고 나머지는 0인 1536차원 벡터
function createUnitVector(index: number): number[] {
  const vec = new Array(1536).fill(0);
  vec[index] = 1;
  return vec;
}

// 테스트용 벡터 헬퍼: 모든 차원에 같은 값
function createUniformVector(value: number): number[] {
  return new Array(1536).fill(value);
}

describe("Embedding", () => {
  it("1536차원 벡터로 생성할 수 있다", () => {
    const vector = createUniformVector(0.1);
    const embedding = Embedding.create(vector);
    expect(embedding.vector.length).toBe(1536);
  });

  it("벡터가 1536차원이 아니면 에러를 던진다", () => {
    expect(() => Embedding.create([1, 2, 3])).toThrow("1536차원이어야 합니다");
    expect(() => Embedding.create([])).toThrow("1536차원이어야 합니다");
  });

  it("벡터가 불변이다 (frozen)", () => {
    const vector = createUniformVector(0.5);
    const embedding = Embedding.create(vector);
    expect(() => {
      (embedding.vector as number[])[0] = 999;
    }).toThrow();
  });

  it("동일한 단위 벡터의 코사인 유사도는 1이다", () => {
    const a = Embedding.create(createUnitVector(0));
    const b = Embedding.create(createUnitVector(0));
    expect(a.cosineSimilarity(b)).toBeCloseTo(1, 5);
  });

  it("직교하는 단위 벡터의 코사인 유사도는 0이다", () => {
    const a = Embedding.create(createUnitVector(0));
    const b = Embedding.create(createUnitVector(1));
    expect(a.cosineSimilarity(b)).toBeCloseTo(0, 5);
  });

  it("유사한 벡터의 코사인 유사도는 1에 가깝다", () => {
    const vecA = createUniformVector(1);
    const vecB = createUniformVector(1);
    vecB[0] = 0.99;
    const a = Embedding.create(vecA);
    const b = Embedding.create(vecB);
    expect(a.cosineSimilarity(b)).toBeGreaterThan(0.99);
  });

  it("영벡터의 코사인 유사도는 0이다", () => {
    const a = Embedding.create(createUniformVector(0));
    const b = Embedding.create(createUnitVector(0));
    expect(a.cosineSimilarity(b)).toBe(0);
  });

  it("동일한 임베딩끼리 equals가 true", () => {
    const vec = createUnitVector(5);
    const a = Embedding.create(vec);
    const b = Embedding.create(vec);
    expect(a.equals(b)).toBe(true);
  });

  it("다른 임베딩끼리 equals가 false", () => {
    const a = Embedding.create(createUnitVector(0));
    const b = Embedding.create(createUnitVector(1));
    expect(a.equals(b)).toBe(false);
  });
});
