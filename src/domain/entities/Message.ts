import { GlobeCoordinate } from "../value-objects/GlobeCoordinate";
import { Embedding } from "../value-objects/Embedding";

export interface MessageProps {
  id: string;
  content: string;
  embedding: Embedding | null;
  globeCoordinate: GlobeCoordinate | null;
  epochId: string | null;
  reactionCount: number;
  createdAt: Date;
}

/**
 * 익명 메시지 엔티티
 * 사용자가 남기는 짧은 텍스트 메시지로, 의미 기반으로 구체 위에 배치된다
 */
export class Message {
  readonly id: string;
  readonly content: string;
  readonly embedding: Embedding | null;
  readonly globeCoordinate: GlobeCoordinate | null;
  readonly epochId: string | null;
  readonly reactionCount: number;
  readonly createdAt: Date;

  private constructor(props: MessageProps) {
    this.id = props.id;
    this.content = props.content;
    this.embedding = props.embedding;
    this.globeCoordinate = props.globeCoordinate;
    this.epochId = props.epochId;
    this.reactionCount = props.reactionCount;
    this.createdAt = props.createdAt;
  }

  static create(props: MessageProps): Message {
    if (!props.content || props.content.trim().length === 0) {
      throw new Error("메시지 내용은 비어있을 수 없습니다");
    }
    if (props.content.length > 280) {
      throw new Error("메시지는 280자를 초과할 수 없습니다");
    }
    if (props.reactionCount < 0) {
      throw new Error("반응 수는 0 이상이어야 합니다");
    }
    return new Message(props);
  }

  /** 임베딩이 설정된 새로운 메시지 반환 */
  withEmbedding(embedding: Embedding): Message {
    return new Message({ ...this.toProps(), embedding });
  }

  /** 구체 좌표가 설정된 새로운 메시지 반환 */
  withCoordinate(coordinate: GlobeCoordinate): Message {
    return new Message({ ...this.toProps(), globeCoordinate: coordinate });
  }

  /** 반응이 추가된 새로운 메시지 반환 */
  withReaction(): Message {
    return new Message({
      ...this.toProps(),
      reactionCount: this.reactionCount + 1,
    });
  }

  private toProps(): MessageProps {
    return {
      id: this.id,
      content: this.content,
      embedding: this.embedding,
      globeCoordinate: this.globeCoordinate,
      epochId: this.epochId,
      reactionCount: this.reactionCount,
      createdAt: this.createdAt,
    };
  }
}
