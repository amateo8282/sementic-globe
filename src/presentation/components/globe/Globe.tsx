"use client";

import { useState, useCallback, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MathUtils } from "three";
import CameraControls from "./CameraControls";
import MessageParticles, { type ParticleMessage } from "./MessageParticles";
import MessageCard, { type MessageCardData } from "./MessageCard";
import ClusterLabel, { type ClusterData } from "./ClusterLabel";
import { useZoomLevel } from "@/presentation/hooks/useZoomLevel";
import {
  SCENE_BG,
  GLOBE_RADIUS,
  GLOBE_SURFACE,
  GLOBE_WIREFRAME,
  CAMERA_INITIAL_Z,
  type ZoomLevel,
} from "@/presentation/constants/globe";

interface GlobeProps {
  /** 구체 위에 표시할 메시지 목록 */
  messages?: ParticleMessage[];
  /** near 줌에서 표시할 메시지 카드 데이터 */
  messageCards?: MessageCardData[];
  /** mid 줌에서 표시할 군집 라벨 데이터 */
  clusters?: ClusterData[];
  /** 줌 레벨 변경 콜백 */
  onZoomLevelChange?: (level: ZoomLevel) => void;
  /** 카메라 방향 변경 콜백 (미니맵용) */
  onCameraDirectionChange?: (lat: number, lng: number) => void;
}

/** 반투명 구체 메시 + 와이어프레임 오버레이 */
function GlobeSphere() {
  return (
    <group>
      {/* 구체 표면 (반투명) */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color={GLOBE_SURFACE}
          transparent
          opacity={0.6}
          roughness={0.8}
        />
      </mesh>
      {/* 와이어프레임 오버레이 */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.01, 32, 32]} />
        <meshBasicMaterial
          color={GLOBE_WIREFRAME}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

/** 장면 조명 설정 */
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
    </>
  );
}

/**
 * 줌 레벨별 콘텐츠 렌더링 컴포넌트
 * spring/lerp로 opacity 전환 애니메이션 구현
 */
function ZoomContent({
  messages,
  messageCards,
  clusters,
  onZoomLevelChange,
  onCameraDirectionChange,
}: {
  messages: ParticleMessage[];
  messageCards: MessageCardData[];
  clusters: ClusterData[];
  onZoomLevelChange?: (level: ZoomLevel) => void;
  onCameraDirectionChange?: (lat: number, lng: number) => void;
}) {
  // 각 레이어의 현재 opacity (lerp로 부드럽게 전환)
  const particleOpacityRef = useRef(1);
  const clusterOpacityRef = useRef(0);
  const cardOpacityRef = useRef(0);

  // opacity 상태 (렌더링 트리거용)
  const [particleVisible, setParticleVisible] = useState(true);
  const [clusterVisible, setClusterVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

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
    const targetCard = level === "near" ? 1 : 0;

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
    cardOpacityRef.current = MathUtils.lerp(
      cardOpacityRef.current,
      targetCard,
      lerpSpeed
    );

    // visibility 임계값 (0.01 이상이면 렌더링)
    const threshold = 0.01;
    setParticleVisible(particleOpacityRef.current > threshold);
    setClusterVisible(clusterOpacityRef.current > threshold);
    setCardVisible(cardOpacityRef.current > threshold);

    // 카메라 방향을 구면 좌표로 변환하여 미니맵에 전달
    if (onCameraDirectionChange) {
      const dir = camera.position.clone().normalize().negate();
      const lat = Math.asin(dir.y) * (180 / Math.PI);
      const lng = Math.atan2(dir.z, dir.x) * (180 / Math.PI);
      onCameraDirectionChange(lat, lng);
    }
  });

  return (
    <>
      {/* far/mid: 파티클 표시 */}
      {particleVisible && <MessageParticles messages={messages} />}

      {/* mid: 군집 라벨 표시 */}
      {clusterVisible &&
        clusters.map((cluster) => (
          <ClusterLabel
            key={cluster.id}
            cluster={cluster}
            visible={clusterVisible}
          />
        ))}

      {/* near: 개별 메시지 카드 표시 */}
      {cardVisible &&
        messageCards.map((msg) => (
          <MessageCard key={msg.id} message={msg} visible={cardVisible} />
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
}: GlobeProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, CAMERA_INITIAL_Z], fov: 45 }}
        style={{ background: SCENE_BG }}
        gl={{ antialias: true }}
      >
        <SceneLighting />
        <GlobeSphere />
        <ZoomContent
          messages={messages}
          messageCards={messageCards}
          clusters={clusters}
          onZoomLevelChange={onZoomLevelChange}
          onCameraDirectionChange={onCameraDirectionChange}
        />
        <CameraControls />
      </Canvas>
    </div>
  );
}
