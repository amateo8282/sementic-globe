import { Message } from "@/domain/entities/Message";
import { Reaction } from "@/domain/entities/Reaction";

/**
 * 메시지 저장소 인터페이스
 * Infrastructure 계층에서 구현한다
 */
export interface MessageRepository {
  /** 메시지 저장 */
  save(message: Message): Promise<Message>;

  /** ID로 메시지 조회 */
  findById(id: string): Promise<Message | null>;

  /** 위도/경도 범위 내 메시지 목록 조회 */
  findByCoordinateRange(
    latMin: number,
    latMax: number,
    lngMin: number,
    lngMax: number
  ): Promise<Message[]>;

  /** 모든 메시지 조회 */
  findAll(): Promise<Message[]>;

  /** 메시지에 반응 추가 */
  addReaction(reaction: Reaction): Promise<Reaction>;

  /** 사용자의 특정 메시지 반응 조회 (중복 방지용) */
  findReactionByUserAndMessage(
    userId: string,
    messageId: string
  ): Promise<Reaction | null>;

  /** 메시지 업데이트 (반응 수 등) */
  update(message: Message): Promise<Message>;
}
