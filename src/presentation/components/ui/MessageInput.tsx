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
  const [isFocused, setIsFocused] = useState(false);
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
      scale: [1, 0.97, 1.01, 1],
      transition: { duration: 0.4, ease: "easeInOut" },
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
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
      className="fixed bottom-6 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 flex-col gap-3 rounded-2xl border p-4 backdrop-blur-xl"
      style={{
        background: "rgba(16, 24, 48, 0.75)",
        borderColor: isFocused
          ? "rgba(124, 139, 245, 0.4)"
          : "rgba(255, 255, 255, 0.1)",
        boxShadow: isFocused
          ? "0 0 30px rgba(124, 139, 245, 0.12), 0 8px 32px rgba(0, 0, 0, 0.3)"
          : "0 8px 32px rgba(0, 0, 0, 0.2)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* 텍스트 입력 영역 */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          if (e.target.value.length <= MAX_LENGTH) {
            setContent(e.target.value);
            setError(null);
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="지금 무슨 생각을 하고 있나요?"
        disabled={isSubmitting}
        rows={3}
        className="w-full resize-none rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-foreground placeholder-foreground/35 outline-none transition-all duration-300 focus:border-accent/40 focus:bg-white/8 disabled:opacity-50"
      />

      {/* 하단: 글자 수 카운터 + 에러 + 제출 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {/* 글자 수 카운터 */}
          <span
            className={`text-xs transition-colors ${
              charCount >= MAX_LENGTH
                ? "text-red-400"
                : charCount >= MAX_LENGTH * 0.9
                  ? "text-amber-400"
                  : "text-foreground/30"
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
          className="rounded-xl px-5 py-2 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background:
              isEmpty || isSubmitting
                ? "rgba(124, 139, 245, 0.3)"
                : "linear-gradient(135deg, #7C8BF5 0%, #A78BFA 100%)",
            boxShadow:
              isEmpty || isSubmitting
                ? "none"
                : "0 2px 12px rgba(124, 139, 245, 0.3)",
          }}
        >
          {isSubmitting ? "전송 중..." : "이야기 남기기"}
        </button>
      </div>
    </motion.form>
  );
}
