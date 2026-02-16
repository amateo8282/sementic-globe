import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlaceNewMessage } from "./PlaceNewMessage";
import { MessageRepository } from "../interfaces/MessageRepository";
import { PlacementService } from "../interfaces/PlacementService";
import { Message } from "@/domain/entities/Message";
import { Embedding } from "@/domain/value-objects/Embedding";
import { GlobeCoordinate } from "@/domain/value-objects/GlobeCoordinate";

describe("PlaceNewMessage 유스케이스", () => {
  let placeNewMessage: PlaceNewMessage;
  let messageRepository: MessageRepository;
  let placementService: PlacementService;

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

    placementService = {
      calculateCoordinate: vi.fn(),
    };

    placeNewMessage = new PlaceNewMessage(messageRepository, placementService);
  });

  it("임베딩이 있는 메시지에 구체 좌표를 할당하고 저장한다", async () => {
    const embedding = Embedding.create(createTestVector(0.1));
    const coordinate = GlobeCoordinate.create(35.0, 128.0);

    const message = Message.create({
      id: "msg-1",
      content: "좌표 할당 테스트",
      embedding,
      globeCoordinate: null,
      epochId: null,
      reactionCount: 0,
      createdAt: new Date(),
      userId: null,
    });

    vi.mocked(messageRepository.findById).mockResolvedValue(message);
    vi.mocked(messageRepository.findAll).mockResolvedValue([]);
    vi.mocked(placementService.calculateCoordinate).mockResolvedValue(
      coordinate
    );
    vi.mocked(messageRepository.update).mockImplementation(async (msg) => msg);

    const result = await placeNewMessage.execute("msg-1");

    expect(result.lat).toBe(35.0);
    expect(result.lng).toBe(128.0);
    expect(messageRepository.update).toHaveBeenCalled();
  });

  it("존재하지 않는 메시지 ID를 전달하면 에러를 발생시킨다", async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(null);

    await expect(placeNewMessage.execute("non-existent")).rejects.toThrow(
      "메시지를 찾을 수 없습니다"
    );
  });

  it("임베딩이 없는 메시지는 에러를 발생시킨다", async () => {
    const message = Message.create({
      id: "msg-1",
      content: "임베딩 없음",
      embedding: null,
      globeCoordinate: null,
      epochId: null,
      reactionCount: 0,
      createdAt: new Date(),
      userId: null,
    });

    vi.mocked(messageRepository.findById).mockResolvedValue(message);

    await expect(placeNewMessage.execute("msg-1")).rejects.toThrow(
      "임베딩이 설정되지 않은 메시지입니다"
    );
  });

  it("기존 메시지 중 임베딩과 좌표가 있는 메시지만 참조한다", async () => {
    const embedding = Embedding.create(createTestVector(0.1));
    const coordinate = GlobeCoordinate.create(0, 0);

    const targetMessage = Message.create({
      id: "msg-target",
      content: "대상 메시지",
      embedding,
      globeCoordinate: null,
      epochId: null,
      reactionCount: 0,
      createdAt: new Date(),
      userId: null,
    });

    const existingWithBoth = Message.create({
      id: "msg-with-both",
      content: "둘 다 있는 메시지",
      embedding: Embedding.create(createTestVector(0.2)),
      globeCoordinate: GlobeCoordinate.create(10, 20),
      epochId: null,
      reactionCount: 0,
      createdAt: new Date(),
      userId: null,
    });

    // 임베딩은 있지만 좌표가 없는 메시지 (참조하지 않아야 함)
    const existingWithoutCoord = Message.create({
      id: "msg-no-coord",
      content: "좌표 없는 메시지",
      embedding: Embedding.create(createTestVector(0.3)),
      globeCoordinate: null,
      epochId: null,
      reactionCount: 0,
      createdAt: new Date(),
      userId: null,
    });

    vi.mocked(messageRepository.findById).mockResolvedValue(targetMessage);
    vi.mocked(messageRepository.findAll).mockResolvedValue([
      existingWithBoth,
      existingWithoutCoord,
    ]);
    vi.mocked(placementService.calculateCoordinate).mockResolvedValue(
      coordinate
    );
    vi.mocked(messageRepository.update).mockImplementation(async (msg) => msg);

    await placeNewMessage.execute("msg-target");

    // 임베딩과 좌표가 모두 있는 메시지만 전달되어야 함
    expect(placementService.calculateCoordinate).toHaveBeenCalledWith(
      embedding,
      [
        {
          embedding: existingWithBoth.embedding,
          coordinate: existingWithBoth.globeCoordinate,
        },
      ]
    );
  });
});
