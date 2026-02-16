import { Reaction } from "@/domain/entities/Reaction";
import { Message } from "@/domain/entities/Message";
import { MessageDto } from "../dto/MessageDto";
import { MessageRepository } from "../interfaces/MessageRepository";

/**
 * 메시지에 반응 추가 유스케이스
 * 반응(공감)을 생성하고 메시지의 반응 수를 증가시킨다
 * 동일 사용자의 중복 반응을 방지한다
 */
export class ReactToMessage {
  constructor(private readonly messageRepository: MessageRepository) {}

  async execute(messageId: string, userId: string): Promise<MessageDto> {
    // 1. 대상 메시지 조회
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new Error("메시지를 찾을 수 없습니다");
    }

    // 2. 중복 반응 체크
    const existingReaction =
      await this.messageRepository.findReactionByUserAndMessage(
        userId,
        messageId
      );
    if (existingReaction) {
      throw new Error("이미 반응한 메시지입니다");
    }

    // 3. 반응 엔티티 생성 및 저장
    const reaction = Reaction.create({
      id: crypto.randomUUID(),
      messageId,
      userId,
      createdAt: new Date(),
    });
    await this.messageRepository.addReaction(reaction);

    // 4. 메시지 반응 수 증가 및 저장
    const updatedMessage = message.withReaction();
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
