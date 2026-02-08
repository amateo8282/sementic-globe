import { describe, it, expect } from "vitest";
import { Reaction } from "./Reaction";

describe("Reaction", () => {
  it("유효한 속성으로 생성할 수 있다", () => {
    const reaction = Reaction.create({
      id: "react-1",
      messageId: "msg-1",
      createdAt: new Date("2024-01-01"),
    });
    expect(reaction.id).toBe("react-1");
    expect(reaction.messageId).toBe("msg-1");
  });

  it("빈 ID로 생성하면 에러를 던진다", () => {
    expect(() =>
      Reaction.create({
        id: "",
        messageId: "msg-1",
        createdAt: new Date(),
      })
    ).toThrow("반응 ID는 비어있을 수 없습니다");
  });

  it("빈 메시지 ID로 생성하면 에러를 던진다", () => {
    expect(() =>
      Reaction.create({
        id: "react-1",
        messageId: "",
        createdAt: new Date(),
      })
    ).toThrow("메시지 ID는 비어있을 수 없습니다");
  });
});
