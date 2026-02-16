"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/presentation/components/auth/AuthProvider";
import type { MessageCardData } from "@/presentation/components/globe/MessageCard";

interface NearZoomPanelProps {
  cards: MessageCardData[];
  /** 공감 성공 후 메시지 목록 갱신 콜백 */
  onReactionSuccess?: () => void;
}

/** 상대 시간 문자열 생성 */
function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

/** 개별 메시지 카드 (공감 버튼 포함) */
function MessageCardItem({
  card,
  onReactionSuccess,
}: {
  card: MessageCardData;
  onReactionSuccess?: () => void;
}) {
  const { session } = useAuth();
  // 로컬 공감 수 (낙관적 업데이트용)
  const [localReactionCount, setLocalReactionCount] = useState(card.reactionCount);
  const [isReacting, setIsReacting] = useState(false);
  const [reacted, setReacted] = useState(false);

  const handleReact = useCallback(async () => {
    if (isReacting) return;
    setIsReacting(true);

    // 낙관적 업데이트
    setLocalReactionCount((prev) => prev + 1);
    setReacted(true);

    try {
      const headers: Record<string, string> = {};
      // 세션 토큰을 Authorization 헤더에 포함
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/messages/${card.id}/react`, {
        method: "POST",
        headers,
      });
      if (!res.ok) {
        // 실패 시 롤백
        setLocalReactionCount((prev) => prev - 1);
        setReacted(false);
      } else {
        onReactionSuccess?.();
      }
    } catch {
      // 네트워크 오류 시 롤백
      setLocalReactionCount((prev) => prev - 1);
      setReacted(false);
    } finally {
      setIsReacting(false);
    }
  }, [card.id, isReacting, session, onReactionSuccess]);

  return (
    <div className="rounded-lg border border-white/10 bg-[rgba(20,20,35,0.85)] backdrop-blur-md p-3 transition-opacity duration-300">
      <p className="text-foreground text-sm leading-relaxed break-words line-clamp-4">
        {card.content}
      </p>
      <div className="flex justify-between items-center mt-2">
        {/* 공감 버튼 */}
        <button
          onClick={handleReact}
          disabled={isReacting}
          className={`pointer-events-auto text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
            reacted
              ? "border-accent/50 text-accent bg-accent/10"
              : "border-white/10 text-foreground/40 hover:border-accent/30 hover:text-accent/70"
          } disabled:opacity-50`}
        >
          공감 {localReactionCount}
        </button>
        <span className="text-[10px] text-foreground/40">
          {formatRelativeTime(card.createdAt)}
        </span>
      </div>
    </div>
  );
}

/**
 * near 줌 시 카메라 시야 범위 내 메시지를 2D 그리드로 표시하는 오버레이 패널
 * 3D 위치 대신 화면 레이아웃에 맞춰 반응형으로 배열하여 가독성 확보
 * 각 카드에 공감 버튼 포함
 */
export default function NearZoomPanel({ cards, onReactionSuccess }: NearZoomPanelProps) {
  if (cards.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-10 pointer-events-none"
      style={{ bottom: "140px" }}
    >
      <div className="h-full flex items-center justify-center px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-[720px] max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide">
          {cards.map((card) => (
            <MessageCardItem
              key={card.id}
              card={card}
              onReactionSuccess={onReactionSuccess}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
