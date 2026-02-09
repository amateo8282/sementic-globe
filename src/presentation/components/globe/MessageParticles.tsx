"use client";

import { useRef, useMemo, useEffect } from "react";
import {
  Object3D,
  Color,
  InstancedBufferAttribute,
  AdditiveBlending,
} from "three";
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

/** 파티클 기본 높이 (구체 표면에서의 거리) */
const PARTICLE_ALTITUDE = 0.08;
/** 부유 애니메이션 진폭 */
const FLOAT_AMPLITUDE = 0.025;
/** 파티클 크기 */
const PARTICLE_SIZE = 0.07;

/**
 * 메시지를 구체 위의 빛나는 파티클로 렌더링하는 컴포넌트
 * InstancedMesh를 사용하여 다수의 파티클을 단일 드로우콜로 처리
 * AdditiveBlending + 발광 효과로 반딧불 같은 느낌을 연출
 */
export default function MessageParticles({ messages }: MessageParticlesProps) {
  const meshRef = useRef<InstancedMeshType>(null);
  const tempObject = useMemo(() => new Object3D(), []);
  const tempColor = useMemo(() => new Color(), []);

  // 각 파티클의 부유 위상 오프셋 (랜덤)
  const phaseOffsets = useMemo(
    () => messages.map(() => Math.random() * Math.PI * 2),
    [messages]
  );

  // 기본 위치 저장 (부유 애니메이션 기준점)
  const basePositions = useMemo(() => {
    return messages.map((msg) =>
      toCartesian(msg.lat, msg.lng, GLOBE_RADIUS + PARTICLE_ALTITUDE)
    );
  }, [messages]);

  // 인스턴스별 색상 설정 (messages가 바뀔 때만)
  useEffect(() => {
    if (!meshRef.current || messages.length === 0) return;

    const mesh = meshRef.current;
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

  // 파티클 초기 위치 설정
  useEffect(() => {
    if (!meshRef.current || messages.length === 0) return;

    basePositions.forEach(([x, y, z], i) => {
      tempObject.position.set(x, y, z);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [messages, tempObject, basePositions]);

  // 매 프레임 부유 애니메이션: 파티클이 표면에서 살짝 떠다님
  useFrame(({ clock }) => {
    if (!meshRef.current || messages.length === 0) return;

    const time = clock.getElapsedTime();

    for (let i = 0; i < messages.length; i++) {
      const [bx, by, bz] = basePositions[i];
      // 표면 법선 방향으로 미세 진동
      const len = Math.sqrt(bx * bx + by * by + bz * bz);
      const nx = bx / len;
      const ny = by / len;
      const nz = bz / len;

      const offset =
        Math.sin(time * 0.8 + phaseOffsets[i]) * FLOAT_AMPLITUDE;

      tempObject.position.set(
        bx + nx * offset,
        by + ny * offset,
        bz + nz * offset
      );
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (messages.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, messages.length]}>
      <sphereGeometry args={[PARTICLE_SIZE, 12, 12]} />
      <meshBasicMaterial
        toneMapped={false}
        transparent
        opacity={0.9}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
