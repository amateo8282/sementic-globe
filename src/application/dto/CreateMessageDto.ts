/**
 * 메시지 생성 요청 DTO
 */
export interface CreateMessageDto {
  /** 메시지 내용 (1~280자) */
  content: string;
}
