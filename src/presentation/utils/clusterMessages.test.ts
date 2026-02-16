import { describe, it, expect } from "vitest";
import { clusterMessages } from "./clusterMessages";
import type { ParticleMessage } from "@/presentation/components/globe/MessageParticles";

describe("clusterMessages", () => {
  it("빈 배열 입력 시 빈 배열을 반환한다", () => {
    const result = clusterMessages([]);
    expect(result).toEqual([]);
  });

  it("3개 미만 모인 그룹은 클러스터로 반환하지 않는다", () => {
    const messages: ParticleMessage[] = [
      { id: "1", lat: 37.5, lng: 127.0 },
      { id: "2", lat: 37.5, lng: 127.0 },
    ];
    const result = clusterMessages(messages);
    expect(result).toEqual([]);
  });

  it("가까운 위치의 메시지 3개가 하나의 클러스터로 그룹화된다", () => {
    const messages: ParticleMessage[] = [
      { id: "1", lat: 37.5, lng: 127.0 },
      { id: "2", lat: 37.6, lng: 127.1 },
      { id: "3", lat: 37.4, lng: 126.9 },
    ];
    const result = clusterMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].messageCount).toBe(3);
    expect(result[0].name).toBe("주제 1");
    expect(result[0].id).toBe("cluster-0");
  });

  it("먼 위치의 메시지들이 서로 다른 클러스터로 분리된다", () => {
    const messages: ParticleMessage[] = [
      // 서울 근처 클러스터 (3개)
      { id: "1", lat: 37.5, lng: 127.0 },
      { id: "2", lat: 37.6, lng: 127.1 },
      { id: "3", lat: 37.4, lng: 126.9 },
      // 뉴욕 근처 클러스터 (3개)
      { id: "4", lat: 40.7, lng: -74.0 },
      { id: "5", lat: 40.8, lng: -73.9 },
      { id: "6", lat: 40.6, lng: -74.1 },
    ];
    const result = clusterMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("주제 1");
    expect(result[1].name).toBe("주제 2");
  });

  it("클러스터 중심 좌표가 멤버들의 평균과 일치한다", () => {
    const messages: ParticleMessage[] = [
      { id: "1", lat: 10, lng: 20 },
      { id: "2", lat: 12, lng: 22 },
      { id: "3", lat: 14, lng: 24 },
    ];
    const result = clusterMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].lat).toBe(12); // (10 + 12 + 14) / 3
    expect(result[0].lng).toBe(22); // (20 + 22 + 24) / 3
  });

  it("clusterIndex가 0~3 범위 내에서 순환한다", () => {
    // 5개의 클러스터를 만들기 위해 5개 그룹 생성
    const messages: ParticleMessage[] = [];
    for (let group = 0; group < 5; group++) {
      const baseLat = group * 50; // 충분히 먼 거리
      for (let i = 0; i < 3; i++) {
        messages.push({
          id: `${group}-${i}`,
          lat: baseLat + i * 0.1,
          lng: i * 0.1,
        });
      }
    }
    const result = clusterMessages(messages);
    expect(result.length).toBe(5);
    expect(result[0].clusterIndex).toBe(0);
    expect(result[1].clusterIndex).toBe(1);
    expect(result[2].clusterIndex).toBe(2);
    expect(result[3].clusterIndex).toBe(3);
    expect(result[4].clusterIndex).toBe(0); // 순환
  });

  it("커스텀 clusterRadius가 적용된다", () => {
    const messages: ParticleMessage[] = [
      { id: "1", lat: 0, lng: 0 },
      { id: "2", lat: 5, lng: 5 },
      { id: "3", lat: 10, lng: 10 },
    ];
    // 기본 반경(15)이면 하나의 클러스터
    const withDefault = clusterMessages(messages);
    expect(withDefault).toHaveLength(1);

    // 작은 반경(3)이면 클러스터 없음 (각 메시지 간 거리가 반경 초과)
    const withSmall = clusterMessages(messages, 3);
    expect(withSmall).toHaveLength(0);
  });
});
