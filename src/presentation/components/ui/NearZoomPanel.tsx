"use client";

import type { MessageCardData } from "@/presentation/components/globe/MessageCard";

interface NearZoomPanelProps {
  cards: MessageCardData[];
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

/**
 * near 줌 시 카메라 시야 범위 내 메시지를 2D 그리드로 표시하는 오버레이 패널
 * 3D 위치 대신 화면 레이아웃에 맞춰 반응형으로 배열하여 가독성 확보
 */
export default function NearZoomPanel({ cards }: NearZoomPanelProps) {
  if (cards.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-10 pointer-events-none"
      style={{ bottom: "140px" }}
    >
      <div className="h-full flex items-center justify-center px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-[720px] max-h-[calc(100vh-200px)] overflow-y-auto pointer-events-auto scrollbar-hide">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-lg border border-white/10 bg-[rgba(20,20,35,0.85)] backdrop-blur-md p-3 transition-opacity duration-300"
            >
              <p className="text-foreground text-sm leading-relaxed break-words line-clamp-4">
                {card.content}
              </p>
              <div className="flex justify-between items-center mt-2 text-[10px] text-foreground/40">
                <span>반응 {card.reactionCount}</span>
                <span>{formatRelativeTime(card.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
