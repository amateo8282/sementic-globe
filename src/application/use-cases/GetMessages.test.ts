import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetMessages } from "./GetMessages";
import { MessageRepository } from "../interfaces/MessageRepository";
import { Message } from "@/domain/entities/Message";
import { GlobeCoordinate } from "@/domain/value-objects/GlobeCoordinate";

describe("GetMessages 유스케이스", () => {
  let getMessages: GetMessages;
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

    getMessages = new GetMessages(messageRepository);
  });

  it("좌표 범위 내의 메시지를 DTO 형태로 반환한다", async () => {
    const message = Message.create({
      id: "msg-1",
      content: "테스트 메시지",
      embedding: null,
      globeCoordinate: GlobeCoordinate.create(37.5, 127.0),
      epochId: null,
      reactionCount: 3,
      createdAt: new Date("2025-01-01"),
      userId: null,
    });

    vi.mocked(messageRepository.findByCoordinateRange).mockResolvedValue([
      message,
    ]);

    const result = await getMessages.execute({
      latMin: 30,
      latMax: 40,
      lngMin: 120,
      lngMax: 130,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "msg-1",
      content: "테스트 메시지",
      lat: 37.5,
      lng: 127.0,
      reactionCount: 3,
      createdAt: new Date("2025-01-01").toISOString(),
    });
  });

  it("범위가 지정되지 않으면 전체 메시지를 반환한다", async () => {
    const messages = [
      Message.create({
        id: "msg-1",
        content: "첫번째",
        embedding: null,
        globeCoordinate: GlobeCoordinate.create(10, 20),
        epochId: null,
        reactionCount: 0,
        createdAt: new Date("2025-01-01"),
        userId: null,
      }),
      Message.create({
        id: "msg-2",
        content: "두번째",
        embedding: null,
        globeCoordinate: null,
        epochId: null,
        reactionCount: 1,
        createdAt: new Date("2025-01-02"),
        userId: null,
      }),
    ];

    vi.mocked(messageRepository.findAll).mockResolvedValue(messages);

    const result = await getMessages.execute();

    expect(result).toHaveLength(2);
    expect(result[1].lat).toBeNull();
    expect(result[1].lng).toBeNull();
  });

  it("빈 결과를 반환할 수 있다", async () => {
    vi.mocked(messageRepository.findByCoordinateRange).mockResolvedValue([]);

    const result = await getMessages.execute({
      latMin: 0,
      latMax: 1,
      lngMin: 0,
      lngMax: 1,
    });

    expect(result).toHaveLength(0);
  });
});
