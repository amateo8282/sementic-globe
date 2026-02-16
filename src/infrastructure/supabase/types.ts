/**
 * Supabase 데이터베이스 타입 정의
 * 실제 DB 스키마와 일치해야 한다
 */

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: MessagesRow;
        Insert: MessagesInsert;
        Update: MessagesUpdate;
        Relationships: [
          {
            foreignKeyName: "messages_epoch_id_fkey";
            columns: ["epoch_id"];
            isOneToOne: false;
            referencedRelation: "epochs";
            referencedColumns: ["id"];
          },
        ];
      };
      reactions: {
        Row: ReactionsRow;
        Insert: ReactionsInsert;
        Update: ReactionsUpdate;
        Relationships: [
          {
            foreignKeyName: "reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      epochs: {
        Row: EpochsRow;
        Insert: EpochsInsert;
        Update: EpochsUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_reaction_count: {
        Args: { target_message_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/** messages 테이블 행 타입 */
export interface MessagesRow {
  id: string;
  content: string;
  embedding: string | null;
  lat: number | null;
  lng: number | null;
  epoch_id: string | null;
  reaction_count: number;
  created_at: string;
  user_id: string | null;
}

/** messages 테이블 삽입 타입 */
export interface MessagesInsert {
  id?: string;
  content: string;
  embedding?: string | null;
  lat?: number | null;
  lng?: number | null;
  epoch_id?: string | null;
  reaction_count?: number;
  created_at?: string;
  user_id?: string | null;
}

/** messages 테이블 업데이트 타입 */
export interface MessagesUpdate {
  id?: string;
  content?: string;
  embedding?: string | null;
  lat?: number | null;
  lng?: number | null;
  epoch_id?: string | null;
  reaction_count?: number;
  created_at?: string;
  user_id?: string | null;
}

/** reactions 테이블 행 타입 */
export interface ReactionsRow {
  id: string;
  message_id: string;
  user_id: string;
  created_at: string;
}

/** reactions 테이블 삽입 타입 */
export interface ReactionsInsert {
  id?: string;
  message_id: string;
  user_id: string;
  created_at?: string;
}

/** reactions 테이블 업데이트 타입 */
export interface ReactionsUpdate {
  id?: string;
  message_id?: string;
  user_id?: string;
  created_at?: string;
}

/** epochs 테이블 행 타입 */
export interface EpochsRow {
  id: string;
  start_date: string;
  end_date: string;
  message_count: number;
}

/** epochs 테이블 삽입 타입 */
export interface EpochsInsert {
  id?: string;
  start_date: string;
  end_date: string;
  message_count?: number;
}

/** epochs 테이블 업데이트 타입 */
export interface EpochsUpdate {
  id?: string;
  start_date?: string;
  end_date?: string;
  message_count?: number;
}
