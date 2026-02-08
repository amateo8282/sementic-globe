/**
 * 메시지 응답 DTO
 * 클라이언트에 전달되는 메시지 데이터 구조
 */
export interface MessageDto {
  id: string;
  content: string;
  lat: number | null;
  lng: number | null;
  reactionCount: number;
  createdAt: string;
}
