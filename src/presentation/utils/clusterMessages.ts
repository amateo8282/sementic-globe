import type { ParticleMessage } from "@/presentation/components/globe/MessageParticles";
import type { ClusterData } from "@/presentation/components/globe/ClusterLabel";

/** 두 좌표 간 유클리드 거리 계산 (도 단위) */
function euclideanDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2);
}

/**
 * 메시지를 좌표 기반으로 클러스터링하여 ClusterData 배열을 반환한다.
 * 유클리드 거리가 clusterRadius 이내인 메시지를 같은 그룹으로 묶고,
 * 3개 이상 모인 그룹만 클러스터로 반환한다.
 */
export function clusterMessages(
  messages: ParticleMessage[],
  clusterRadius: number = 15
): ClusterData[] {
  if (messages.length === 0) return [];

  // 각 메시지가 어떤 그룹에 속하는지 추적 (-1은 미배정)
  const groupAssignment = new Array<number>(messages.length).fill(-1);
  const groups: number[][] = [];

  for (let i = 0; i < messages.length; i++) {
    if (groupAssignment[i] !== -1) continue;

    // 새 그룹 시작
    const groupIndex = groups.length;
    const group: number[] = [i];
    groupAssignment[i] = groupIndex;

    // 이미 그룹에 할당되지 않은 나머지 메시지와 비교
    for (let j = i + 1; j < messages.length; j++) {
      if (groupAssignment[j] !== -1) continue;

      // 현재 그룹의 모든 멤버와 비교하여 반경 이내인지 확인
      const isNear = group.some((memberIdx) => {
        const dist = euclideanDistance(
          messages[memberIdx].lat,
          messages[memberIdx].lng,
          messages[j].lat,
          messages[j].lng
        );
        return dist <= clusterRadius;
      });

      if (isNear) {
        group.push(j);
        groupAssignment[j] = groupIndex;
      }
    }

    groups.push(group);
  }

  // 3개 이상 모인 그룹만 ClusterData로 변환
  const clusters: ClusterData[] = [];
  let clusterCount = 0;

  for (const group of groups) {
    if (group.length < 3) continue;

    // 클러스터 중심 좌표 계산 (멤버 평균)
    let latSum = 0;
    let lngSum = 0;
    for (const idx of group) {
      latSum += messages[idx].lat;
      lngSum += messages[idx].lng;
    }

    clusters.push({
      id: `cluster-${clusterCount}`,
      name: `주제 ${clusterCount + 1}`,
      messageCount: group.length,
      lat: latSum / group.length,
      lng: lngSum / group.length,
      clusterIndex: clusterCount % 4,
    });

    clusterCount++;
  }

  return clusters;
}
