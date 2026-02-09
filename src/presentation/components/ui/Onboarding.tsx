"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

/**
 * 첫 방문 시 표시되는 온보딩 안내 오버레이
 * 4초 후 자동으로 사라지거나, 클릭하면 즉시 사라진다
 */
export default function Onboarding() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-30 flex items-center justify-center pointer-events-auto cursor-pointer"
        >
          <div className="text-center max-w-sm px-6">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-lg font-light tracking-wide"
              style={{ color: "rgba(232, 236, 244, 0.9)" }}
            >
              이 구체 위에 당신의 이야기를 남겨보세요
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-3 text-sm"
              style={{ color: "rgba(167, 139, 250, 0.7)" }}
            >
              비슷한 이야기들은 가까이 모입니다
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 0.6 }}
              className="mt-6 text-xs"
              style={{ color: "rgba(232, 236, 244, 0.3)" }}
            >
              아무 곳이나 눌러 시작하기
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
