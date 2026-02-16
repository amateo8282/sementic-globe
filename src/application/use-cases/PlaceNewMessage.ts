import { MessageDto } from "../dto/MessageDto";
import { MessageRepository } from "../interfaces/MessageRepository";
import { PlacementService } from "../interfaces/PlacementService";
import { Message } from "@/domain/entities/Message";

/**
 * 기존 메시지와의 코사인 유사도 기반으로 구체 좌표를 결정하는 유스케이스
 * 임베딩이 이미 설정된 메시지에 좌표를 할당한다
 */
export class PlaceNewMessage {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly placementService: PlacementService
  ) {}

  async execute(messageId: string): Promise<MessageDto> {
    // 1. 대상 메시지 조회
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new Error("메시지를 찾을 수 없습니다");
    }

    // 2. 임베딩 존재 확인
    if (!message.embedding) {
      throw new Error("임베딩이 설정되지 않은 메시지입니다");
    }

    // 3. 기존 메시지 중 임베딩과 좌표가 모두 있는 것만 참조
    const allMessages = await this.messageRepository.findAll();
    const references = allMessages
      .filter((m) => m.embedding !== null && m.globeCoordinate !== null)
      .map((m) => ({
        embedding: m.embedding!,
        coordinate: m.globeCoordinate!,
      }));

    // 4. 좌표 계산 및 저장
    const coordinate = await this.placementService.calculateCoordinate(
      message.embedding,
      references
    );
    const updatedMessage = message.withCoordinate(coordinate);
    const savedMessage = await this.messageRepository.update(updatedMessage);

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
