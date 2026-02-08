"use client";

import { useState, useEffect } from "react";
import type { ParticleMessage } from "@/presentation/components/globe/MessageParticles";
import type { MessageCardData } from "@/presentation/components/globe/MessageCard";
import type { MessageDto } from "@/application/dto/MessageDto";

interface UseGlobeMessagesResult {
  /** 파티클 렌더링용 (far/mid 줌) */
  messages: ParticleMessage[];
  /** 메시지 카드 렌더링용 (near 줌) */
  messageCards: MessageCardData[];
  isLoading: boolean;
  error: string | null;
  /** 메시지 목록 다시 불러오기 */
  refetch: () => void;
}

/**
 * API로부터 메시지를 가져와 ParticleMessage, MessageCardData 형식으로 변환하는 훅
 */
export function useGlobeMessages(): UseGlobeMessagesResult {
  const [messages, setMessages] = useState<ParticleMessage[]>([]);
  const [messageCards, setMessageCards] = useState<MessageCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchMessages() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/messages");
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "메시지 조회 실패");
        }

        const data: MessageDto[] = await response.json();

        if (cancelled) return;

        // lat, lng가 있는 메시지만 필터
        const validMessages = data.filter(
          (msg): msg is MessageDto & { lat: number; lng: number } =>
            msg.lat !== null && msg.lng !== null
        );

        // 파티클용 데이터
        const particles: ParticleMessage[] = validMessages.map((msg) => ({
          id: msg.id,
          lat: msg.lat,
          lng: msg.lng,
        }));

        // 메시지 카드용 데이터
        const cards: MessageCardData[] = validMessages.map((msg) => ({
          id: msg.id,
          lat: msg.lat,
          lng: msg.lng,
          content: msg.content,
          reactionCount: msg.reactionCount,
          createdAt: msg.createdAt,
        }));

        setMessages(particles);
        setMessageCards(cards);
      } catch (err) {
        if (cancelled) return;
        const errorMessage =
          err instanceof Error ? err.message : "메시지 조회 중 오류 발생";
        setError(errorMessage);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const refetch = () => setFetchKey((prev) => prev + 1);

  return { messages, messageCards, isLoading, error, refetch };
}
