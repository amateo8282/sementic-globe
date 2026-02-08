export interface EpochProps {
  id: string;
  startDate: Date;
  endDate: Date;
  messageCount: number;
}

/**
 * 에포크 엔티티
 * 일정 기간 동안의 메시지 군집을 나타내는 시간 단위
 * UMAP 재계산 주기와 연동된다
 */
export class Epoch {
  readonly id: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly messageCount: number;

  private constructor(props: EpochProps) {
    this.id = props.id;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.messageCount = props.messageCount;
  }

  static create(props: EpochProps): Epoch {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error("에포크 ID는 비어있을 수 없습니다");
    }
    if (props.endDate <= props.startDate) {
      throw new Error("종료 날짜는 시작 날짜 이후여야 합니다");
    }
    if (props.messageCount < 0) {
      throw new Error("메시지 수는 0 이상이어야 합니다");
    }
    return new Epoch(props);
  }

  /** 에포크가 활성 상태인지 확인 */
  isActive(now: Date = new Date()): boolean {
    return now >= this.startDate && now <= this.endDate;
  }
}
