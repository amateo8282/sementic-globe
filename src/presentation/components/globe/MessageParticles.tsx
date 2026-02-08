"use client";

import { useRef, useMemo } from "react";
import { Object3D, Color } from "three";
import type { InstancedMesh as InstancedMeshType } from "three";
import { useFrame } from "@react-three/fiber";
import { GLOBE_RADIUS, CLUSTER_COLORS } from "@/presentation/constants/globe";

/** 파티클로 표시할 메시지 데이터 */
export interface ParticleMessage {
  id: string;
  lat: number;
  lng: number;
  /** 클러스터 인덱스 (색상 결정용, 0~3) */
  clusterIndex?: number;
}

interface MessageParticlesProps {
  messages: ParticleMessage[];
}

/** 구면 좌표(lat, lng)를 3D 직교 좌표로 변환 */
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
 * 메시지를 구체 위의 파티클로 렌더링하는 컴포넌트
 * InstancedMesh를 사용하여 다수의 파티클을 단일 드로우콜로 처리
 */
export default function MessageParticles({ messages }: MessageParticlesProps) {
  const meshRef = useRef<InstancedMeshType>(null);
  const tempObject = useMemo(() => new Object3D(), []);

  // 파티클 색상 배열 생성
  const colors = useMemo(() => {
    const colorArray = new Float32Array(messages.length * 3);
    messages.forEach((msg, i) => {
      const colorHex =
        CLUSTER_COLORS[msg.clusterIndex ?? i % CLUSTER_COLORS.length];
      const color = new Color(colorHex);
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    });
    return colorArray;
  }, [messages]);

  // 파티클 위치를 매 프레임 업데이트
  useFrame(() => {
    if (!meshRef.current) return;

    messages.forEach((msg, i) => {
      // 구체 표면에서 약간 위로 띄움 (radius + 0.05)
      const [x, y, z] = toCartesian(msg.lat, msg.lng, GLOBE_RADIUS + 0.05);
      tempObject.position.set(x, y, z);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (messages.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, messages.length]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial toneMapped={false}>
        {/* 인스턴스별 색상 적용 */}
      </meshBasicMaterial>
      {/* 인스턴스별 색상을 위한 버퍼 속성 */}
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colors, 3]}
      />
    </instancedMesh>
  );
}
