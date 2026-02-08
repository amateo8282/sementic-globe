"use client";

import { useRef, useMemo, useEffect } from "react";
import { Object3D, Color, InstancedBufferAttribute } from "three";
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
  const tempColor = useMemo(() => new Color(), []);

  // 인스턴스별 색상 설정 (messages가 바뀔 때만)
  useEffect(() => {
    if (!meshRef.current || messages.length === 0) return;

    const mesh = meshRef.current;
    // instanceColor 버퍼 생성
    const colorArray = new Float32Array(messages.length * 3);
    messages.forEach((msg, i) => {
      const colorHex =
        CLUSTER_COLORS[msg.clusterIndex ?? i % CLUSTER_COLORS.length];
      tempColor.set(colorHex);
      colorArray[i * 3] = tempColor.r;
      colorArray[i * 3 + 1] = tempColor.g;
      colorArray[i * 3 + 2] = tempColor.b;
    });
    mesh.instanceColor = new InstancedBufferAttribute(colorArray, 3);
    mesh.instanceColor.needsUpdate = true;
  }, [messages, tempColor]);

  // 파티클 위치 설정 (최초 1회 + messages 변경 시)
  useEffect(() => {
    if (!meshRef.current || messages.length === 0) return;

    messages.forEach((msg, i) => {
      const [x, y, z] = toCartesian(msg.lat, msg.lng, GLOBE_RADIUS + 0.05);
      tempObject.position.set(x, y, z);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [messages, tempObject]);

  // 매 프레임 업데이트는 필요 없으므로 제거 (정적 파티클)
  // 애니메이션 추가 시 여기에 useFrame 사용
  useFrame(() => {
    // 향후 파티클 애니메이션용 (빛나는 효과 등)
  });

  if (messages.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, messages.length]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
