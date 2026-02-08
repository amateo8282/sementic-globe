"use client";

import dynamic from "next/dynamic";

/** Globe 컴포넌트를 SSR 비활성화로 동적 로드 (Three.js는 클라이언트 전용) */
const Globe = dynamic(
  () => import("./Globe"),
  { ssr: false }
);

export default function GlobeClient() {
  return <Globe />;
}
