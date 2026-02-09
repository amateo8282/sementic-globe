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
      className="fixed bottom-5 left-5 z-10 cursor-pointer rounded-full border px-5 py-2.5 text-sm font-medium backdrop-blur-xl transition-all duration-200 select-none hover:border-white/20"
      style={{
        background: "rgba(16, 24, 48, 0.7)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        color: "rgba(232, 236, 244, 0.7)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = "rgba(20, 30, 60, 0.85)";
        el.style.color = "rgba(232, 236, 244, 0.95)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "rgba(16, 24, 48, 0.7)";
        el.style.color = "rgba(232, 236, 244, 0.7)";
      }}
    >
      다른 이야기 둘러보기
    </button>
  );
}
