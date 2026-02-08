import { Message } from "@/domain/entities/Message";
import { MessageDto } from "../dto/MessageDto";
import { MessageRepository } from "../interfaces/MessageRepository";

/** 좌표 범위 조회 파라미터 */
export interface CoordinateRange {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/**
 * 메시지 조회 유스케이스
 * 구면 좌표 범위 기반으로 메시지를 조회하거나 전체 메시지를 반환한다
 */
export class GetMessages {
  constructor(private readonly messageRepository: MessageRepository) {}

  async execute(range?: CoordinateRange): Promise<MessageDto[]> {
    let messages: Message[];

    if (range) {
      messages = await this.messageRepository.findByCoordinateRange(
        range.latMin,
        range.latMax,
        range.lngMin,
        range.lngMax
      );
    } else {
      messages = await this.messageRepository.findAll();
    }

    return messages.map(this.toDto);
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
