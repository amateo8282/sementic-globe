"use client";

import { Html } from "@react-three/drei";
import { GLOBE_RADIUS } from "@/presentation/constants/globe";

/** 메시지 카드에 표시할 데이터 */
export interface MessageCardData {
  id: string;
  lat: number;
  lng: number;
  content: string;
  reactionCount: number;
  createdAt: string;
  clusterIndex?: number;
}

interface MessageCardProps {
  message: MessageCardData;
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

/** 상대 시간 문자열 생성 */
function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

/**
 * 줌 레벨 near에서 표시되는 메시지 카드
 * Html 오버레이로 메시지 내용, 반응 수, 생성 시간을 표시
 */
export default function MessageCard({ message, visible }: MessageCardProps) {
  if (!visible) return null;

  const position = toCartesian(message.lat, message.lng, GLOBE_RADIUS + 0.15);

  return (
    <group position={position}>
      <Html
        center
        distanceFactor={8}
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "rgba(20, 20, 35, 0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            padding: "10px 14px",
            maxWidth: "200px",
            minWidth: "120px",
            color: "#E4E4E7",
            fontSize: "12px",
            lineHeight: "1.5",
            userSelect: "none",
          }}
        >
          {/* 메시지 내용 */}
          <p style={{ margin: 0, wordBreak: "break-word" }}>
            {message.content}
          </p>
          {/* 하단 정보: 반응 수, 생성 시간 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "6px",
              fontSize: "10px",
              color: "rgba(228, 228, 231, 0.6)",
            }}
          >
            <span>반응 {message.reactionCount}</span>
            <span>{formatRelativeTime(message.createdAt)}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}
