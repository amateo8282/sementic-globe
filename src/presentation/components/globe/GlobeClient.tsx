"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useGlobeMessages } from "@/presentation/hooks/useGlobeMessages";
import { clusterMessages } from "@/presentation/utils/clusterMessages";
import Minimap from "@/presentation/components/ui/Minimap";
import RandomJump from "@/presentation/components/ui/RandomJump";
import MessageInput from "@/presentation/components/ui/MessageInput";
import NearZoomPanel from "@/presentation/components/ui/NearZoomPanel";
import type { CameraTarget } from "./Globe";
import type { MessageCardData } from "./MessageCard";
import type { MinimapPoint } from "@/presentation/components/ui/Minimap";

/** Globe 컴포넌트를 SSR 비활성화로 동적 로드 (Three.js는 클라이언트 전용) */
const Globe = dynamic(() => import("./Globe"), { ssr: false });

/**
 * Semantic Globe 전체 프레젠테이션 오케스트레이터
 * Globe, Minimap, RandomJump, NearZoomPanel 간의 상태 공유 및 데이터 플로우를 관리한다
 */
export default function GlobeClient() {
  const { messages, messageCards, isLoading, refetch } = useGlobeMessages();
  const [cameraDirection, setCameraDirection] = useState({ lat: 0, lng: 0 });
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [visibleCardIds, setVisibleCardIds] = useState<string[]>([]);

  // 메시지 → 클러스터 변환 (messages가 바뀔 때만 재계산)
  const clusters = useMemo(
    () => clusterMessages(messages),
    [messages]
  );

  // 미니맵용 포인트 변환
  const minimapPoints: MinimapPoint[] = useMemo(
    () => messages.map((m) => ({ lat: m.lat, lng: m.lng })),
    [messages]
  );

  // near 줌 시야 범위 내 카드 필터링
  const visibleCards: MessageCardData[] = useMemo(() => {
    if (visibleCardIds.length === 0) return [];
    const idSet = new Set(visibleCardIds);
    return messageCards.filter((card) => idSet.has(card.id));
  }, [visibleCardIds, messageCards]);

  // 카메라 방향 변경 콜백 (Globe에서 매 프레임 호출)
  const handleCameraDirectionChange = useCallback(
    (lat: number, lng: number) => {
      setCameraDirection({ lat, lng });
    },
    []
  );

  // near 줌 시야 범위 내 카드 ID 변경 콜백
  const handleVisibleCardsChange = useCallback((ids: string[]) => {
    setVisibleCardIds(ids);
  }, []);

  // 랜덤 점프 콜백
  const handleRandomJump = useCallback((lat: number, lng: number) => {
    setCameraTarget({ lat, lng });
  }, []);

  return (
    <>
      <Globe
        messages={messages}
        messageCards={messageCards}
        clusters={clusters}
        onCameraDirectionChange={handleCameraDirectionChange}
        onVisibleCardsChange={handleVisibleCardsChange}
        cameraTarget={cameraTarget}
      />
      {/* near 줌: 2D 오버레이 패널로 메시지 카드 표시 */}
      <NearZoomPanel cards={visibleCards} onReactionSuccess={refetch} />
      <Minimap points={minimapPoints} cameraDirection={cameraDirection} />
      <RandomJump onJump={handleRandomJump} />
      <MessageInput onSubmitSuccess={refetch} />
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-foreground/50 text-sm">
          메시지 로딩 중...
        </div>
      )}
    </>
  );
}
