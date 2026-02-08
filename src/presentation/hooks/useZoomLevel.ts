"use client";

import { useRef, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ZOOM_FAR,
  ZOOM_MID,
  type ZoomLevel,
} from "@/presentation/constants/globe";

/**
 * 카메라 거리 기반 줌 레벨을 계산하는 훅
 * - far: 카메라 거리 > ZOOM_FAR (20)
 * - mid: ZOOM_NEAR (8) < 카메라 거리 <= ZOOM_FAR (20)
 * - near: 카메라 거리 <= ZOOM_NEAR (8)
 *
 * 매 프레임마다 카메라 위치를 확인하고, 레벨 변경 시 콜백 호출
 */
export function useZoomLevel(
  onChange?: (level: ZoomLevel) => void
): React.MutableRefObject<ZoomLevel> {
  const levelRef = useRef<ZoomLevel>("mid");
  const { camera } = useThree();

  const getLevel = useCallback((distance: number): ZoomLevel => {
    if (distance > ZOOM_FAR) return "far";
    if (distance > ZOOM_MID) return "mid";
    return "near";
  }, []);

  useFrame(() => {
    const distance = camera.position.length();
    const newLevel = getLevel(distance);
    if (newLevel !== levelRef.current) {
      levelRef.current = newLevel;
      onChange?.(newLevel);
    }
  });

  return levelRef;
}
