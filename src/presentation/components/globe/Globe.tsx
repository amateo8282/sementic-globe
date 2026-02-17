"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { MathUtils, Vector3, Group } from "three";
import CameraControls from "./CameraControls";
import MessageParticles, { type ParticleMessage } from "./MessageParticles";
import type { MessageCardData } from "./MessageCard";
import ClusterLabel, { type ClusterData } from "./ClusterLabel";
import Atmosphere from "./Atmosphere";
import { useZoomLevel } from "@/presentation/hooks/useZoomLevel";
import {
  SCENE_BG,
  GLOBE_RADIUS,
  GLOBE_SURFACE,
  CAMERA_INITIAL_Z,
  type ZoomLevel,
} from "@/presentation/constants/globe";

/** 카메라 이동 대상 좌표 */
export interface CameraTarget {
  lat: number;
  lng: number;
}

interface GlobeProps {
  /** 구체 위에 표시할 메시지 목록 */
  messages?: ParticleMessage[];
  /** near 줌 시야 필터링용 메시지 카드 데이터 */
  messageCards?: MessageCardData[];
  /** mid 줌에서 표시할 클러스터 라벨 데이터 */
  clusters?: ClusterData[];
  /** 줌 레벨 변경 콜백 */
  onZoomLevelChange?: (level: ZoomLevel) => void;
  /** 카메라 방향 변경 콜백 (미니맵용) */
  onCameraDirectionChange?: (lat: number, lng: number) => void;
  /** near 줌 시 시야 범위 내 카드 ID 변경 콜백 */
  onVisibleCardsChange?: (ids: string[]) => void;
  /** 카메라 이동 대상 좌표 (RandomJump 등에서 사용) */
  cameraTarget?: CameraTarget | null;
}

/**
 * 숨 쉬는 듯한 구체 메시 + 대기 효과
 * 와이어프레임을 제거하고 부드러운 표면 + Atmosphere glow를 적용
 */
function GlobeSphere() {
  const groupRef = useRef<Group>(null);

  // 구체가 미세하게 숨 쉬는 애니메이션 (4초 주기)
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 0.5) * 0.003;
      groupRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={groupRef}>
      {/* 구체 표면 (부드러운 반투명) */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color={GLOBE_SURFACE}
          transparent
          opacity={0.7}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {/* 내부 발광 (은은한 코어 라이트) */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.98, 32, 32]} />
        <meshBasicMaterial
          color="#1E3A5F"
          transparent
          opacity={0.15}
        />
      </mesh>
      {/* 대기 효과 */}
      <Atmosphere />
    </group>
  );
}

/**
 * 카메라를 목표 좌표로 부드럽게 이동시키는 컴포넌트
 * 구면 좌표(lat, lng)를 3D 위치로 변환하여 현재 거리 유지하며 이동
 */
function CameraAnimator({ target }: { target: CameraTarget | null }) {
  const { camera } = useThree();
  const targetVec = useRef(new Vector3());
  const isAnimating = useRef(false);

  useFrame(() => {
    if (!target || !isAnimating.current) return;

    const latRad = (target.lat * Math.PI) / 180;
    const lngRad = (target.lng * Math.PI) / 180;
    const currentDist = camera.position.length();

    // 목표 좌표를 카메라 위치로 변환 (구체 바깥에서 바라보는 방향)
    targetVec.current.set(
      currentDist * Math.cos(latRad) * Math.cos(lngRad),
      currentDist * Math.sin(latRad),
      currentDist * Math.cos(latRad) * Math.sin(lngRad)
    );

    camera.position.lerp(targetVec.current, 0.04);
    camera.lookAt(0, 0, 0);

    // 목표에 충분히 가까우면 애니메이션 종료
    const dist = camera.position.distanceTo(targetVec.current);
    if (dist < 0.05) {
      isAnimating.current = false;
    }
  });

  // target이 바뀔 때 애니메이션 시작
  if (target) {
    isAnimating.current = true;
  }

  return null;
}

/** 장면 조명 설정 (따뜻한 톤 추가) */
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} color="#B8C4E0" />
      <pointLight position={[10, 8, 10]} intensity={0.7} color="#E8DFCC" />
      <pointLight position={[-10, -5, -10]} intensity={0.25} color="#6B8DD6" />
      {/* 구체 뒤에서 비추는 역광 (림라이트 보강) */}
      <pointLight position={[0, 0, -15]} intensity={0.15} color="#7C8BF5" />
    </>
  );
}

/** 카메라 시야 방향 기준 최대 표시 카드 수 */
const MAX_VISIBLE_CARDS = 15;

/** 카메라 시야 내 카드 필터링 각도 (라디안) */
const VIEW_ANGLE_THRESHOLD = Math.PI / 3; // 60도

/** 구면 좌표 -> 단위 벡터 변환 */
function latLngToUnitVec(lat: number, lng: number, out: Vector3): Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  return out.set(
    Math.cos(latRad) * Math.cos(lngRad),
    Math.sin(latRad),
    Math.cos(latRad) * Math.sin(lngRad)
  );
}

/**
 * 줌 레벨별 콘텐츠 렌더링 컴포넌트
 * spring/lerp로 opacity 전환 애니메이션 구현
 * near 줌에서는 카메라 시야 범위 내 카드 ID를 콜백으로 전달 (2D 오버레이에서 렌더링)
 */
function ZoomContent({
  messages,
  messageCards,
  clusters,
  onZoomLevelChange,
  onCameraDirectionChange,
  onVisibleCardsChange,
}: {
  messages: ParticleMessage[];
  messageCards: MessageCardData[];
  clusters: ClusterData[];
  onZoomLevelChange?: (level: ZoomLevel) => void;
  onCameraDirectionChange?: (lat: number, lng: number) => void;
  onVisibleCardsChange?: (ids: string[]) => void;
}) {
  // 각 레이어의 현재 opacity (lerp로 부드럽게 전환)
  const particleOpacityRef = useRef(1);
  const clusterOpacityRef = useRef(0);

  // opacity 상태 (렌더링 트리거용)
  const [particleVisible, setParticleVisible] = useState(true);
  const [clusterVisible, setClusterVisible] = useState(false);

  // 시야 필터링용 임시 벡터
  const tempVec = useMemo(() => new Vector3(), []);
  const frameCounter = useRef(0);
  const prevVisibleIdsRef = useRef<string>("");

  const handleZoomChange = useCallback(
    (level: ZoomLevel) => {
      onZoomLevelChange?.(level);
    },
    [onZoomLevelChange]
  );

  const zoomLevelRef = useZoomLevel(handleZoomChange);

  // 매 프레임 opacity를 lerp로 보간하고 카메라 방향 전달
  useFrame(({ camera }) => {
    const level = zoomLevelRef.current;
    const lerpSpeed = 0.08;

    // 목표 opacity 설정
    const targetParticle = level === "near" ? 0 : 1;
    const targetCluster = level === "mid" ? 1 : 0;

    // lerp 보간
    particleOpacityRef.current = MathUtils.lerp(
      particleOpacityRef.current,
      targetParticle,
      lerpSpeed
    );
    clusterOpacityRef.current = MathUtils.lerp(
      clusterOpacityRef.current,
      targetCluster,
      lerpSpeed
    );

    // visibility 임계값 (0.01 이상이면 렌더링)
    const threshold = 0.01;
    setParticleVisible(particleOpacityRef.current > threshold);
    setClusterVisible(clusterOpacityRef.current > threshold);

    // 카메라 방향 계산
    const camDir = camera.position.clone().normalize().negate();

    // near 줌일 때 6프레임마다 시야 범위 내 카드 ID를 콜백으로 전달
    frameCounter.current++;
    if (onVisibleCardsChange && frameCounter.current % 6 === 0) {
      if (level === "near") {
        const scored: Array<{ id: string; angle: number }> = [];
        for (const card of messageCards) {
          latLngToUnitVec(card.lat, card.lng, tempVec);
          const angle = Math.acos(MathUtils.clamp(camDir.dot(tempVec), -1, 1));
          if (angle < VIEW_ANGLE_THRESHOLD) {
            scored.push({ id: card.id, angle });
          }
        }
        scored.sort((a, b) => a.angle - b.angle);
        const newIds = scored.slice(0, MAX_VISIBLE_CARDS).map((s) => s.id);
        // 변경된 경우에만 콜백 호출 (불필요한 리렌더 방지)
        const key = newIds.join(",");
        if (key !== prevVisibleIdsRef.current) {
          prevVisibleIdsRef.current = key;
          onVisibleCardsChange(newIds);
        }
      } else if (prevVisibleIdsRef.current !== "") {
        // near 줌이 아닐 때 빈 배열 전달 (한 번만)
        prevVisibleIdsRef.current = "";
        onVisibleCardsChange([]);
      }
    }

    // 카메라 방향을 구면 좌표로 변환하여 미니맵에 전달
    if (onCameraDirectionChange) {
      const lat = Math.asin(camDir.y) * (180 / Math.PI);
      const lng = Math.atan2(camDir.z, camDir.x) * (180 / Math.PI);
      onCameraDirectionChange(lat, lng);
    }
  });

  return (
    <>
      {/* far/mid: 파티클 표시 */}
      {particleVisible && <MessageParticles messages={messages} />}

      {/* mid: 클러스터 라벨 표시 */}
      {clusterVisible &&
        clusters.map((cluster) => (
          <ClusterLabel
            key={cluster.id}
            cluster={cluster}
            visible={clusterVisible}
          />
        ))}
    </>
  );
}

/**
 * 메인 3D 구체 컴포넌트
 * React Three Fiber의 Canvas를 사용하여 구체와 메시지 파티클을 렌더링
 * 줌 레벨에 따라 파티클, 군집 라벨, 메시지 카드를 분기 렌더링
 */
export default function Globe({
  messages = [],
  messageCards = [],
  clusters = [],
  onZoomLevelChange,
  onCameraDirectionChange,
  onVisibleCardsChange,
  cameraTarget = null,
}: GlobeProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, CAMERA_INITIAL_Z], fov: 45 }}
        style={{ background: SCENE_BG }}
        gl={{ antialias: true }}
      >
        <SceneLighting />
        {/* 배경 별 (밤하늘 분위기) */}
        <Stars
          radius={80}
          depth={60}
          count={2500}
          factor={3}
          saturation={0.15}
          fade
          speed={0.3}
        />
        <GlobeSphere />
        <ZoomContent
          messages={messages}
          messageCards={messageCards}
          clusters={clusters}
          onZoomLevelChange={onZoomLevelChange}
          onCameraDirectionChange={onCameraDirectionChange}
          onVisibleCardsChange={onVisibleCardsChange}
        />
        <CameraAnimator target={cameraTarget} />
        <CameraControls />
        {/* Bloom 후처리: 발광 파티클에 빛번짐 효과 */}
        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
