/** MessageInput 컴포넌트의 유효성 검사 및 제출 로직 헬퍼 */

export const MAX_LENGTH = 280;

/** 메시지 내용의 유효성 검사 */
export function validateContent(content: string): {
  isEmpty: boolean;
  charCount: number;
  isOverLimit: boolean;
  isNearLimit: boolean;
} {
  const trimmed = content.trim();
  const charCount = content.length;
  return {
    isEmpty: trimmed.length === 0,
    charCount,
    isOverLimit: charCount >= MAX_LENGTH,
    isNearLimit: charCount >= MAX_LENGTH * 0.9,
  };
}

/** 글자 수 제한을 적용한 입력값 반환 (MAX_LENGTH 초과 시 기존 값 유지) */
export function clampInput(
  newValue: string,
  currentValue: string
): string {
  return newValue.length <= MAX_LENGTH ? newValue : currentValue;
}

/** POST /api/messages 호출 */
export async function submitMessage(
  content: string,
  fetchFn: typeof fetch = fetch
): Promise<{ success: boolean; error?: string }> {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { success: false, error: "내용이 비어있습니다." };
  }

  try {
    const res = await fetchFn("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.error || `요청 실패 (${res.status})`,
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: "메시지 전송에 실패했습니다." };
  }
}
