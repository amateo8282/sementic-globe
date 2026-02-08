"use client";

import { OrbitControls } from "@react-three/drei";
import {
  CAMERA_MIN_DISTANCE,
  CAMERA_MAX_DISTANCE,
} from "@/presentation/constants/globe";

interface CameraControlsProps {
  /** 자동 회전 여부 */
  autoRotate?: boolean;
  /** 자동 회전 속도 (기본값: 0.5) */
  autoRotateSpeed?: number;
}

/** 카메라 궤도 컨트롤 래퍼 컴포넌트 */
export default function CameraControls({
  autoRotate = true,
  autoRotateSpeed = 0.5,
}: CameraControlsProps) {
  return (
    <OrbitControls
      enablePan={false}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={CAMERA_MAX_DISTANCE}
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
      enableDamping
      dampingFactor={0.05}
    />
  );
}
