"use client";

import dynamic from "next/dynamic";
import { useGlobeMessages } from "@/presentation/hooks/useGlobeMessages";

/** Globe 컴포넌트를 SSR 비활성화로 동적 로드 (Three.js는 클라이언트 전용) */
const Globe = dynamic(() => import("./Globe"), { ssr: false });

export default function GlobeClient() {
  const { messages, isLoading } = useGlobeMessages();

  return (
    <>
      <Globe messages={messages} />
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-foreground/50 text-sm">
          메시지 로딩 중...
        </div>
      )}
    </>
  );
}
