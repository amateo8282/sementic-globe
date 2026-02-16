export interface ReactionProps {
  id: string;
  messageId: string;
  userId: string;
  createdAt: Date;
}

/**
 * 메시지에 대한 반응(공감) 엔티티
 * userId로 중복 반응을 방지한다
 */
export class Reaction {
  readonly id: string;
  readonly messageId: string;
  readonly userId: string;
  readonly createdAt: Date;

  private constructor(props: ReactionProps) {
    this.id = props.id;
    this.messageId = props.messageId;
    this.userId = props.userId;
    this.createdAt = props.createdAt;
  }

  static create(props: ReactionProps): Reaction {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("반응 ID는 비어있을 수 없습니다");
    }
    if (!props.messageId || props.messageId.trim().length === 0) {
      throw new Error("메시지 ID는 비어있을 수 없습니다");
    }
    if (!props.userId || props.userId.trim().length === 0) {
      throw new Error("사용자 ID는 비어있을 수 없습니다");
    }
    return new Reaction(props);
  }
}
