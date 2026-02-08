"use client";

import { Html } from "@react-three/drei";
import { GLOBE_RADIUS, CLUSTER_COLORS } from "@/presentation/constants/globe";

/** 군집 라벨에 표시할 데이터 */
export interface ClusterData {
  id: string;
  name: string;
  messageCount: number;
  /** 군집 중심 위도 */
  lat: number;
  /** 군집 중심 경도 */
  lng: number;
  /** 클러스터 인덱스 (색상 결정용, 0~3) */
  clusterIndex: number;
}

interface ClusterLabelProps {
  cluster: ClusterData;
  visible: boolean;
}

/** 구면 좌표를 3D 직교 좌표로 변환 */
function toCartesian(
  lat: number,
  lng: number,
  radius: number
): [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  return [
    radius * Math.cos(latRad) * Math.cos(lngRad),
    radius * Math.sin(latRad),
    radius * Math.cos(latRad) * Math.sin(lngRad),
  ];
}

/**
 * 줌 레벨 mid에서 표시되는 군집 라벨
 * Html 오버레이로 군집 이름과 메시지 개수를 표시
 */
export default function ClusterLabel({ cluster, visible }: ClusterLabelProps) {
  if (!visible) return null;

  const position = toCartesian(cluster.lat, cluster.lng, GLOBE_RADIUS + 0.3);
  const color = CLUSTER_COLORS[cluster.clusterIndex % CLUSTER_COLORS.length];

  return (
    <group position={position}>
      <Html
        center
        distanceFactor={12}
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "rgba(20, 20, 35, 0.75)",
            backdropFilter: "blur(6px)",
            border: `1px solid ${color}40`,
            borderRadius: "16px",
            padding: "6px 12px",
            color: "#E4E4E7",
            fontSize: "11px",
            lineHeight: "1.4",
            whiteSpace: "nowrap",
            userSelect: "none",
            textAlign: "center",
          }}
        >
          {/* 군집 이름 */}
          <span style={{ color, fontWeight: 600 }}>{cluster.name}</span>
          {/* 메시지 개수 */}
          <span
            style={{
              marginLeft: "6px",
              color: "rgba(228, 228, 231, 0.5)",
              fontSize: "10px",
            }}
          >
            {cluster.messageCount}개
          </span>
        </div>
      </Html>
    </group>
  );
}
