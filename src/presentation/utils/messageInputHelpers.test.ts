import { describe, it, expect, vi } from "vitest";
import {
  MAX_LENGTH,
  validateContent,
  clampInput,
  submitMessage,
} from "./messageInputHelpers";

describe("validateContent", () => {
  it("빈 문자열은 isEmpty가 true이다", () => {
    const result = validateContent("");
    expect(result.isEmpty).toBe(true);
    expect(result.charCount).toBe(0);
  });

  it("공백만 있는 문자열은 isEmpty가 true이다", () => {
    const result = validateContent("   ");
    expect(result.isEmpty).toBe(true);
  });

  it("일반 텍스트는 isEmpty가 false이다", () => {
    const result = validateContent("안녕하세요");
    expect(result.isEmpty).toBe(false);
    expect(result.charCount).toBe(5);
  });

  it("280자에 도달하면 isOverLimit가 true이다", () => {
    const text = "a".repeat(280);
    const result = validateContent(text);
    expect(result.isOverLimit).toBe(true);
  });

  it("252자(90%) 이상이면 isNearLimit가 true이다", () => {
    const text = "a".repeat(252);
    const result = validateContent(text);
    expect(result.isNearLimit).toBe(true);
    expect(result.isOverLimit).toBe(false);
  });

  it("251자 이하이면 isNearLimit가 false이다", () => {
    const text = "a".repeat(251);
    const result = validateContent(text);
    expect(result.isNearLimit).toBe(false);
  });
});

describe("clampInput", () => {
  it("MAX_LENGTH 이하의 입력은 그대로 반환한다", () => {
    const result = clampInput("hello", "prev");
    expect(result).toBe("hello");
  });

  it("MAX_LENGTH 초과 입력은 기존 값을 반환한다", () => {
    const overLimit = "a".repeat(MAX_LENGTH + 1);
    const result = clampInput(overLimit, "current");
    expect(result).toBe("current");
  });

  it("정확히 MAX_LENGTH인 입력은 허용한다", () => {
    const exact = "a".repeat(MAX_LENGTH);
    const result = clampInput(exact, "prev");
    expect(result).toBe(exact);
  });
});

describe("submitMessage", () => {
  it("빈 내용 제출 시 에러를 반환한다", async () => {
    const result = await submitMessage("");
    expect(result.success).toBe(false);
    expect(result.error).toBe("내용이 비어있습니다.");
  });

  it("공백만 있는 내용 제출 시 에러를 반환한다", async () => {
    const result = await submitMessage("   ");
    expect(result.success).toBe(false);
    expect(result.error).toBe("내용이 비어있습니다.");
  });

  it("API 호출 성공 시 success: true를 반환한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "1" }),
    });
    const result = await submitMessage("테스트 메시지", mockFetch);
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "테스트 메시지" }),
    });
  });

  it("API 호출 시 content를 trim하여 전송한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    await submitMessage("  안녕하세요  ", mockFetch);
    expect(mockFetch).toHaveBeenCalledWith("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "안녕하세요" }),
    });
  });

  it("API 응답 에러 시 서버 에러 메시지를 반환한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "content 필드는 필수입니다" }),
    });
    const result = await submitMessage("test", mockFetch);
    expect(result.success).toBe(false);
    expect(result.error).toBe("content 필드는 필수입니다");
  });

  it("API 응답 에러에 JSON 파싱 실패 시 상태 코드 에러를 반환한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error")),
    });
    const result = await submitMessage("test", mockFetch);
    expect(result.success).toBe(false);
    expect(result.error).toBe("요청 실패 (500)");
  });

  it("네트워크 오류 시 일반 에러 메시지를 반환한다", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await submitMessage("test", mockFetch);
    expect(result.success).toBe(false);
    expect(result.error).toBe("메시지 전송에 실패했습니다.");
  });
});
