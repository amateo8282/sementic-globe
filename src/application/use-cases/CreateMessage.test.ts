import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateMessage } from "./CreateMessage";
import { MessageRepository } from "../interfaces/MessageRepository";
import { EmbeddingService } from "../interfaces/EmbeddingService";
import { PlacementService } from "../interfaces/PlacementService";
import { Message } from "@/domain/entities/Message";
import { Embedding } from "@/domain/value-objects/Embedding";
import { GlobeCoordinate } from "@/domain/value-objects/GlobeCoordinate";

describe("CreateMessage 유스케이스", () => {
  let createMessage: CreateMessage;
  let messageRepository: MessageRepository;
  let embeddingService: EmbeddingService;
  let placementService: PlacementService;

  // 테스트용 임베딩 벡터 생성 헬퍼
  const createTestVector = (value: number = 0.1): number[] =>
    Array(1536).fill(value);

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

    embeddingService = {
      embed: vi.fn(),
    };

    placementService = {
      calculateCoordinate: vi.fn(),
    };

    createMessage = new CreateMessage(
      messageRepository,
      embeddingService,
      placementService
    );
  });

  it("메시지를 생성하고 임베딩과 좌표를 설정하여 저장한다", async () => {
    const testEmbedding = Embedding.create(createTestVector(0.1));
    const testCoordinate = GlobeCoordinate.create(37.5, 127.0);

    vi.mocked(embeddingService.embed).mockResolvedValue(testEmbedding);
    vi.mocked(messageRepository.findAll).mockResolvedValue([]);
    vi.mocked(placementService.calculateCoordinate).mockResolvedValue(
      testCoordinate
    );
    vi.mocked(messageRepository.save).mockImplementation(async (msg) => msg);

    const result = await createMessage.execute({
      content: "안녕하세요",
      userId: "user-1",
    });

    expect(result.content).toBe("안녕하세요");
    expect(result.lat).toBe(37.5);
    expect(result.lng).toBe(127.0);
    expect(embeddingService.embed).toHaveBeenCalledWith("안녕하세요");
    expect(messageRepository.save).toHaveBeenCalled();
  });

  it("기존 메시지의 임베딩/좌표를 PlacementService에 전달한다", async () => {
    const testEmbedding = Embedding.create(createTestVector(0.1));
    const testCoordinate = GlobeCoordinate.create(0, 0);
    const existingEmbedding = Embedding.create(createTestVector(0.2));
    const existingCoordinate = GlobeCoordinate.create(10, 20);

    const existingMessage = Message.create({
      id: "existing-1",
      content: "기존 메시지",
      embedding: existingEmbedding,
      globeCoordinate: existingCoordinate,
      epochId: null,
      reactionCount: 0,
      createdAt: new Date(),
      userId: null,
    });

    vi.mocked(embeddingService.embed).mockResolvedValue(testEmbedding);
    vi.mocked(messageRepository.findAll).mockResolvedValue([existingMessage]);
    vi.mocked(placementService.calculateCoordinate).mockResolvedValue(
      testCoordinate
    );
    vi.mocked(messageRepository.save).mockImplementation(async (msg) => msg);

    await createMessage.execute({ content: "새 메시지", userId: "user-1" });

    expect(placementService.calculateCoordinate).toHaveBeenCalledWith(
      testEmbedding,
      [{ embedding: existingEmbedding, coordinate: existingCoordinate }]
    );
  });

  it("빈 내용의 메시지는 에러를 발생시킨다", async () => {
    await expect(
      createMessage.execute({ content: "", userId: "user-1" })
    ).rejects.toThrow("메시지 내용은 비어있을 수 없습니다");
  });

  it("280자를 초과하는 메시지는 에러를 발생시킨다", async () => {
    const longContent = "가".repeat(281);
    await expect(
      createMessage.execute({ content: longContent, userId: "user-1" })
    ).rejects.toThrow("메시지는 280자를 초과할 수 없습니다");
  });

  it("저장된 메시지에 userId가 포함된다", async () => {
    const testEmbedding = Embedding.create(createTestVector(0.1));
    const testCoordinate = GlobeCoordinate.create(0, 0);

    vi.mocked(embeddingService.embed).mockResolvedValue(testEmbedding);
    vi.mocked(messageRepository.findAll).mockResolvedValue([]);
    vi.mocked(placementService.calculateCoordinate).mockResolvedValue(
      testCoordinate
    );
    vi.mocked(messageRepository.save).mockImplementation(async (msg) => msg);

    await createMessage.execute({ content: "테스트", userId: "user-abc" });

    const savedMsg = vi.mocked(messageRepository.save).mock.calls[0][0];
    expect(savedMsg.userId).toBe("user-abc");
  });
});
