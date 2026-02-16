import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReactToMessage } from "./ReactToMessage";
import { MessageRepository } from "../interfaces/MessageRepository";
import { Message } from "@/domain/entities/Message";

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
      findReactionByUserAndMessage: vi.fn(),
      update: vi.fn(),
    };

    reactToMessage = new ReactToMessage(messageRepository);
  });

  function createTestMessage(overrides = {}) {
    return Message.create({
      id: "msg-1",
      content: "반응 테스트",
      embedding: null,
      globeCoordinate: null,
      epochId: null,
      reactionCount: 0,
      createdAt: new Date(),
      userId: null,
      ...overrides,
    });
  }

  it("메시지에 반응을 추가하고 반응 수를 증가시킨다", async () => {
    const message = createTestMessage();

    vi.mocked(messageRepository.findById).mockResolvedValue(message);
    vi.mocked(messageRepository.findReactionByUserAndMessage).mockResolvedValue(
      null
    );
    vi.mocked(messageRepository.addReaction).mockImplementation(
      async (reaction) => reaction
    );
    vi.mocked(messageRepository.update).mockImplementation(async (msg) => msg);

    const result = await reactToMessage.execute("msg-1", "user-1");

    expect(result.reactionCount).toBe(1);
    expect(messageRepository.addReaction).toHaveBeenCalled();
    expect(messageRepository.update).toHaveBeenCalled();
  });

  it("이미 반응이 있는 메시지에 추가 반응을 할 수 있다", async () => {
    const message = createTestMessage({ reactionCount: 5 });

    vi.mocked(messageRepository.findById).mockResolvedValue(message);
    vi.mocked(messageRepository.findReactionByUserAndMessage).mockResolvedValue(
      null
    );
    vi.mocked(messageRepository.addReaction).mockImplementation(
      async (reaction) => reaction
    );
    vi.mocked(messageRepository.update).mockImplementation(async (msg) => msg);

    const result = await reactToMessage.execute("msg-1", "user-2");

    expect(result.reactionCount).toBe(6);
  });

  it("존재하지 않는 메시지에 반응하면 에러를 발생시킨다", async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(null);

    await expect(
      reactToMessage.execute("non-existent", "user-1")
    ).rejects.toThrow("메시지를 찾을 수 없습니다");
  });

  it("동일 사용자가 같은 메시지에 중복 반응하면 에러를 발생시킨다", async () => {
    const message = createTestMessage();
    const existingReaction = {
      id: "react-existing",
      messageId: "msg-1",
      userId: "user-1",
      createdAt: new Date(),
    };

    vi.mocked(messageRepository.findById).mockResolvedValue(message);
    vi.mocked(messageRepository.findReactionByUserAndMessage).mockResolvedValue(
      existingReaction as any
    );

    await expect(
      reactToMessage.execute("msg-1", "user-1")
    ).rejects.toThrow("이미 반응한 메시지입니다");

    // addReaction이 호출되지 않아야 함
    expect(messageRepository.addReaction).not.toHaveBeenCalled();
  });
});
