"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./AuthProvider";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = "login" | "signup";

/**
 * 로그인/회원가입 모달
 * 다크 테마, Motion 애니메이션 적용
 */
export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
    setError(null);
    setSuccessMessage(null);
  }, []);

  const handleTabChange = useCallback(
    (newTab: AuthTab) => {
      setTab(newTab);
      resetForm();
    },
    [resetForm]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      setError(null);
      setSuccessMessage(null);
      setIsSubmitting(true);

      try {
        if (tab === "login") {
          await signIn(email, password);
          onClose();
        } else {
          await signUp(email, password);
          setSuccessMessage("확인 이메일이 전송되었습니다. 이메일을 확인해주세요.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      } finally {
        setIsSubmitting(false);
      }
    },
    [tab, email, password, isSubmitting, signIn, signUp, onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 배경 딤 */}
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />

          {/* 모달 본체 */}
          <motion.div
            className="relative z-10 w-full max-w-[380px] rounded-2xl border border-white/15 bg-globe-surface/95 p-6 backdrop-blur-lg"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-foreground/40 hover:text-foreground transition-colors"
            >
              x
            </button>

            {/* 탭 */}
            <div className="mb-6 flex gap-1 rounded-lg bg-white/5 p-1">
              <button
                onClick={() => handleTabChange("login")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  tab === "login"
                    ? "bg-accent text-white"
                    : "text-foreground/50 hover:text-foreground/70"
                }`}
              >
                로그인
              </button>
              <button
                onClick={() => handleTabChange("signup")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  tab === "signup"
                    ? "bg-accent text-white"
                    : "text-foreground/50 hover:text-foreground/70"
                }`}
              >
                회원가입
              </button>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs text-foreground/50">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground placeholder-foreground/40 outline-none transition-colors focus:border-accent/50"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-foreground/50">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground placeholder-foreground/40 outline-none transition-colors focus:border-accent/50"
                  placeholder="6자 이상"
                />
              </div>

              {/* 에러/성공 메시지 */}
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              {successMessage && (
                <p className="text-xs text-green-400">{successMessage}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-40"
              >
                {isSubmitting
                  ? "처리 중..."
                  : tab === "login"
                    ? "로그인"
                    : "회원가입"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
