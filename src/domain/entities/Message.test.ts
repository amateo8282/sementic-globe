import { describe, it, expect } from "vitest";
import { Message } from "./Message";
import { GlobeCoordinate } from "../value-objects/GlobeCoordinate";
import { Embedding } from "../value-objects/Embedding";

function createValidProps() {
  return {
    id: "msg-1",
    content: "안녕하세요",
    embedding: null,
    globeCoordinate: null,
    epochId: null,
    reactionCount: 0,
    createdAt: new Date("2024-01-01"),
    userId: null,
  };
}

function createTestEmbedding(): Embedding {
  return Embedding.create(new Array(1536).fill(0.1));
}

describe("Message", () => {
  it("유효한 속성으로 생성할 수 있다", () => {
    const msg = Message.create(createValidProps());
    expect(msg.id).toBe("msg-1");
    expect(msg.content).toBe("안녕하세요");
    expect(msg.reactionCount).toBe(0);
  });

  it("빈 내용으로 생성하면 에러를 던진다", () => {
    expect(() =>
      Message.create({ ...createValidProps(), content: "" })
    ).toThrow("메시지 내용은 비어있을 수 없습니다");
  });

  it("공백만 있는 내용으로 생성하면 에러를 던진다", () => {
    expect(() =>
      Message.create({ ...createValidProps(), content: "   " })
    ).toThrow("메시지 내용은 비어있을 수 없습니다");
  });

  it("280자 초과 내용으로 생성하면 에러를 던진다", () => {
    const longContent = "가".repeat(281);
    expect(() =>
      Message.create({ ...createValidProps(), content: longContent })
    ).toThrow("메시지는 280자를 초과할 수 없습니다");
  });

  it("280자 내용으로 생성할 수 있다", () => {
    const content = "가".repeat(280);
    const msg = Message.create({ ...createValidProps(), content });
    expect(msg.content.length).toBe(280);
  });

  it("음수 반응 수로 생성하면 에러를 던진다", () => {
    expect(() =>
      Message.create({ ...createValidProps(), reactionCount: -1 })
    ).toThrow("반응 수는 0 이상이어야 합니다");
  });

  it("임베딩을 설정한 새 메시지를 반환한다", () => {
    const msg = Message.create(createValidProps());
    const embedding = createTestEmbedding();
    const updated = msg.withEmbedding(embedding);

    expect(updated.embedding).toBe(embedding);
    expect(msg.embedding).toBeNull(); // 원본 불변
  });

  it("좌표를 설정한 새 메시지를 반환한다", () => {
    const msg = Message.create(createValidProps());
    const coord = GlobeCoordinate.create(37.5, 126.9);
    const updated = msg.withCoordinate(coord);

    expect(updated.globeCoordinate).toBe(coord);
    expect(msg.globeCoordinate).toBeNull(); // 원본 불변
  });

  it("반응을 추가한 새 메시지를 반환한다", () => {
    const msg = Message.create(createValidProps());
    const reacted = msg.withReaction();

    expect(reacted.reactionCount).toBe(1);
    expect(msg.reactionCount).toBe(0); // 원본 불변
  });

  it("반응을 여러 번 추가할 수 있다", () => {
    const msg = Message.create(createValidProps());
    const reacted = msg.withReaction().withReaction().withReaction();
    expect(reacted.reactionCount).toBe(3);
  });

  it("userId를 포함하여 생성할 수 있다", () => {
    const msg = Message.create({
      ...createValidProps(),
      userId: "user-123",
    });
    expect(msg.userId).toBe("user-123");
  });

  it("userId 없이 생성하면 null이다", () => {
    const msg = Message.create(createValidProps());
    expect(msg.userId).toBeNull();
  });
});
