import { Message } from "@/domain/entities/Message";
import { CreateMessageDto } from "../dto/CreateMessageDto";
import { MessageDto } from "../dto/MessageDto";
import { MessageRepository } from "../interfaces/MessageRepository";
import { EmbeddingService } from "../interfaces/EmbeddingService";
import { PlacementService } from "../interfaces/PlacementService";

/**
 * 메시지 생성 유스케이스
 * 텍스트 내용을 받아 임베딩 변환 -> 좌표 계산 -> DB 저장 과정을 수행한다
 */
export class CreateMessage {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly placementService: PlacementService
  ) {}

  async execute(dto: CreateMessageDto): Promise<MessageDto> {
    // 1. 메시지 엔티티 생성 (유효성 검사 포함)
    const message = Message.create({
      id: crypto.randomUUID(),
      content: dto.content,
      embedding: null,
      globeCoordinate: null,
      epochId: null,
      reactionCount: 0,
      createdAt: new Date(),
    });

    // 2. 텍스트를 임베딩 벡터로 변환
    const embedding = await this.embeddingService.embed(message.content);
    const messageWithEmbedding = message.withEmbedding(embedding);

    // 3. 기존 메시지를 기반으로 구체 좌표 계산
    const existingMessages = await this.messageRepository.findAll();
    const references = existingMessages
      .filter((m) => m.embedding !== null && m.globeCoordinate !== null)
      .map((m) => ({
        embedding: m.embedding!,
        coordinate: m.globeCoordinate!,
      }));

    const coordinate = await this.placementService.calculateCoordinate(
      embedding,
      references
    );
    const messageWithCoordinate =
      messageWithEmbedding.withCoordinate(coordinate);

    // 4. 저장
    const savedMessage = await this.messageRepository.save(messageWithCoordinate);

    return this.toDto(savedMessage);
  }

  private toDto(message: Message): MessageDto {
    return {
      id: message.id,
      content: message.content,
      lat: message.globeCoordinate?.lat ?? null,
      lng: message.globeCoordinate?.lng ?? null,
      reactionCount: message.reactionCount,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
