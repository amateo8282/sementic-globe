"use client";

import { useRef, useEffect, useCallback } from "react";

/** 미니맵에 표시할 메시지 위치 데이터 */
export interface MinimapPoint {
  lat: number;
  lng: number;
  clusterIndex?: number;
}

/** 카메라 방향 정보 */
export interface CameraDirection {
  /** 카메라가 바라보는 방향의 구면 좌표 (위도) */
  lat: number;
  /** 카메라가 바라보는 방향의 구면 좌표 (경도) */
  lng: number;
}

interface MinimapProps {
  /** 메시지 위치 목록 */
  points?: MinimapPoint[];
  /** 카메라 방향 */
  cameraDirection?: CameraDirection;
}

/** 클러스터별 색상 */
const MINIMAP_COLORS = ["#EC4899", "#34D399", "#A78BFA", "#F4F4F5"];

/**
 * 정사영 투영으로 구면 좌표를 2D 원형 미니맵 좌표로 변환
 * 카메라가 바라보는 방향을 중심으로 정사영
 */
function projectToMinimap(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radius: number
): { x: number; y: number; visible: boolean } {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const cLatRad = (centerLat * Math.PI) / 180;
  const cLngRad = (centerLng * Math.PI) / 180;

  const dLng = lngRad - cLngRad;

  // 정사영 투영 공식
  const x =
    Math.cos(latRad) * Math.sin(dLng);
  const y =
    Math.cos(cLatRad) * Math.sin(latRad) -
    Math.sin(cLatRad) * Math.cos(latRad) * Math.cos(dLng);

  // 점이 보이는 반구에 있는지 확인
  const cosC =
    Math.sin(cLatRad) * Math.sin(latRad) +
    Math.cos(cLatRad) * Math.cos(latRad) * Math.cos(dLng);

  return {
    x: x * radius,
    y: -y * radius,
    visible: cosC > 0,
  };
}

/**
 * 2D 원형 투영 미니맵
 * 화면 우하단에 고정 위치, 현재 카메라가 보는 방향과 메시지 위치를 점으로 표시
 */
export default function Minimap({
  points = [],
  cameraDirection = { lat: 0, lng: 0 },
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 120;
    const center = size / 2;
    const mapRadius = center - 8;

    // 캔버스 초기화
    ctx.clearRect(0, 0, size, size);

    // 원형 배경
    ctx.beginPath();
    ctx.arc(center, center, mapRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(20, 20, 35, 0.75)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 십자선 (방향 표시)
    ctx.beginPath();
    ctx.moveTo(center - mapRadius, center);
    ctx.lineTo(center + mapRadius, center);
    ctx.moveTo(center, center - mapRadius);
    ctx.lineTo(center, center + mapRadius);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 메시지 위치를 점으로 표시
    points.forEach((point) => {
      const projected = projectToMinimap(
        point.lat,
        point.lng,
        cameraDirection.lat,
        cameraDirection.lng,
        mapRadius * 0.85
      );

      if (!projected.visible) return;

      const px = center + projected.x;
      const py = center + projected.y;

      // 원 밖의 점은 표시하지 않음
      const dist = Math.sqrt(
        (px - center) ** 2 + (py - center) ** 2
      );
      if (dist > mapRadius) return;

      const color =
        MINIMAP_COLORS[
          point.clusterIndex ?? 3
        ];

      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // 중앙 카메라 위치 표시
    ctx.beginPath();
    ctx.arc(center, center, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fill();
  }, [points, cameraDirection]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "120px",
        height: "120px",
        zIndex: 10,
        borderRadius: "50%",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        style={{ width: "120px", height: "120px" }}
      />
    </div>
  );
}
