"use client";

import { useCallback } from "react";

interface RandomJumpProps {
  /** 랜덤 좌표로 카메라를 이동시키는 콜백 */
  onJump?: (lat: number, lng: number) => void;
}

/**
 * 랜덤 좌표 점프 버튼
 * 화면 좌하단에 고정 위치, 클릭 시 랜덤 좌표로 카메라 이동
 */
export default function RandomJump({ onJump }: RandomJumpProps) {
  const handleClick = useCallback(() => {
    // 랜덤 구면 좌표 생성 (-90~90 위도, -180~180 경도)
    const lat = Math.random() * 180 - 90;
    const lng = Math.random() * 360 - 180;
    onJump?.(lat, lng);
  }, [onJump]);

  return (
    <button
      onClick={handleClick}
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        zIndex: 10,
        background: "rgba(20, 20, 35, 0.75)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "24px",
        padding: "10px 20px",
        color: "#E4E4E7",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.2s ease",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.background =
          "rgba(30, 30, 50, 0.9)";
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.background =
          "rgba(20, 20, 35, 0.75)";
      }}
    >
      탐색
    </button>
  );
}
