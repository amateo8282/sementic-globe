"use client";

import { useState, useCallback, useRef } from "react";
import { motion, useAnimation } from "motion/react";
import { useAuth } from "@/presentation/components/auth/AuthProvider";

const MAX_LENGTH = 280;

interface MessageInputProps {
  onSubmitSuccess: () => void;
}

/**
 * 메시지 입력 폼 컴포넌트
 * 화면 하단 중앙에 고정, 280자 제한, 제출 시 API 호출
 * 인증 토큰을 Authorization 헤더에 포함하여 전송한다
 */
export default function MessageInput({ onSubmitSuccess }: MessageInputProps) {
  const { session } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formControls = useAnimation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = content.trim();
  const isEmpty = trimmed.length === 0;
  const charCount = content.length;

  // 에러 발생 시 좌우 흔들림 애니메이션
  const shakeForm = useCallback(async () => {
    await formControls.start({
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.4 },
    });
  }, [formControls]);

  // 제출 성공 시 축소 후 복귀 애니메이션
  const pulseForm = useCallback(async () => {
    await formControls.start({
      scale: [1, 0.97, 1],
      transition: { duration: 0.3 },
    });
  }, [formControls]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isEmpty || isSubmitting) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        // 세션 토큰을 Authorization 헤더에 포함
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch("/api/messages", {
          method: "POST",
          headers,
          body: JSON.stringify({ content: trimmed }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `요청 실패 (${res.status})`);
        }

        // 성공: 입력 초기화 + 애니메이션 + 콜백
        setContent("");
        await pulseForm();
        onSubmitSuccess();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "메시지 전송에 실패했습니다.";
        setError(message);
        shakeForm();
      } finally {
        setIsSubmitting(false);
      }
    },
    [isEmpty, isSubmitting, trimmed, session, onSubmitSuccess, pulseForm, shakeForm],
  );

  return (
    <motion.form
      onSubmit={handleSubmit}
      animate={formControls}
      // 등장 애니메이션: 아래에서 위로 슬라이드 + 페이드인
      initial={{ y: 40, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      viewport={{ once: true }}
      className="fixed bottom-6 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 flex-col gap-3 rounded-2xl border border-white/15 bg-globe-surface/90 p-4 backdrop-blur-md"
    >
      {/* 텍스트 입력 영역 */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          // 최대 글자 수 제한
          if (e.target.value.length <= MAX_LENGTH) {
            setContent(e.target.value);
            setError(null);
          }
        }}
        placeholder="메시지를 입력하세요..."
        disabled={isSubmitting}
        rows={3}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder-foreground/40 outline-none transition-colors focus:border-accent/50 disabled:opacity-50"
      />

      {/* 하단: 글자 수 카운터 + 에러 + 제출 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {/* 글자 수 카운터 */}
          <span
            className={`text-xs ${
              charCount >= MAX_LENGTH
                ? "text-red-400"
                : charCount >= MAX_LENGTH * 0.9
                  ? "text-yellow-400"
                  : "text-foreground/40"
            }`}
          >
            {charCount}/{MAX_LENGTH}
          </span>

          {/* 에러 메시지 */}
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isEmpty || isSubmitting}
          className="rounded-xl bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? "전송 중..." : "전송"}
        </button>
      </div>
    </motion.form>
  );
}
