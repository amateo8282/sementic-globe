import GlobeClient from "@/presentation/components/globe/GlobeClient";
import Minimap from "@/presentation/components/ui/Minimap";
import RandomJump from "@/presentation/components/ui/RandomJump";

export default function Home() {
  return (
    <main className="w-screen h-screen bg-background relative">
      <GlobeClient />
      {/* UI 오버레이: 미니맵, 랜덤 점프 */}
      <Minimap />
      <RandomJump />
    </main>
  );
}
