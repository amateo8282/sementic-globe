import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReactToMessage } from "./ReactToMessage";
import { MessageRepository } from "../interfaces/MessageRepository";
import { Message } from "@/domain/entities/Message";
import { Reaction } from "@/domain/entities/Reaction";

describe("ReactToMessage 유스케이스", () => {
  let reactToMessage: ReactToMessage;
  let messageRepository: MessageRepository;

  beforeEach(() => {
    messageRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByCoordinateRange: vi.fn(),
      findAll: vi.fn(),
      addReaction: vi.fn(),
      update: vi.fn(),
    };

    reactToMessage = new ReactToMessage(messageRepository);
  });

  it("메시지에 반응을 추가하고 반응 수를 증가시킨다", async () => {
    const message = Message.create({
      id: "msg-1",
      content: "반응 테스트",
      embedding: null,
      globeCoordinate: null,
      epochId: null,
      reactionCount: 0,
      createdAt: new Date(),
    });

    vi.mocked(messageRepository.findById).mockResolvedValue(message);
    vi.mocked(messageRepository.addReaction).mockImplementation(
      async (reaction) => reaction
    );
    vi.mocked(messageRepository.update).mockImplementation(async (msg) => msg);

    const result = await reactToMessage.execute("msg-1");

    expect(result.reactionCount).toBe(1);
    expect(messageRepository.addReaction).toHaveBeenCalled();
    expect(messageRepository.update).toHaveBeenCalled();
  });

  it("이미 반응이 있는 메시지에 추가 반응을 할 수 있다", async () => {
    const message = Message.create({
      id: "msg-1",
      content: "이미 반응 있음",
      embedding: null,
      globeCoordinate: null,
      epochId: null,
      reactionCount: 5,
      createdAt: new Date(),
    });

    vi.mocked(messageRepository.findById).mockResolvedValue(message);
    vi.mocked(messageRepository.addReaction).mockImplementation(
      async (reaction) => reaction
    );
    vi.mocked(messageRepository.update).mockImplementation(async (msg) => msg);

    const result = await reactToMessage.execute("msg-1");

    expect(result.reactionCount).toBe(6);
  });

  it("존재하지 않는 메시지에 반응하면 에러를 발생시킨다", async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(null);

    await expect(reactToMessage.execute("non-existent")).rejects.toThrow(
      "메시지를 찾을 수 없습니다"
    );
  });
});
