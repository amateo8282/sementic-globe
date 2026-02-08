/**
 * 메시지 생성 요청 DTO
 */
export interface CreateMessageDto {
  /** 메시지 내용 (1~280자) */
  content: string;
  /** 작성자 ID (인증된 사용자) */
  userId: string;
}
