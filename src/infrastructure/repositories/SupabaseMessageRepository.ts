import { SupabaseClient } from "@supabase/supabase-js";
import { Message } from "@/domain/entities/Message";
import { Reaction } from "@/domain/entities/Reaction";
import { Embedding } from "@/domain/value-objects/Embedding";
import { GlobeCoordinate } from "@/domain/value-objects/GlobeCoordinate";
import type { MessageRepository } from "@/application/interfaces/MessageRepository";
import type { MessagesRow, ReactionsRow } from "../supabase/types";

/**
 * Supabase를 사용한 MessageRepository 구현
 * pgvector로 임베딩을 저장하고 구면 좌표 범위 기반 조회를 지원한다
 */
export class SupabaseMessageRepository implements MessageRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly client: SupabaseClient<any>) {}

  async save(message: Message): Promise<Message> {
    const { data, error } = await this.client
      .from("messages")
      .insert({
        id: message.id,
        content: message.content,
        embedding: message.embedding
          ? this.embeddingToString(message.embedding)
          : null,
        lat: message.globeCoordinate?.lat ?? null,
        lng: message.globeCoordinate?.lng ?? null,
        epoch_id: message.epochId,
        reaction_count: message.reactionCount,
        user_id: message.userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`메시지 저장 실패: ${error.message}`);
    }

    return this.rowToMessage(data as MessagesRow);
  }

  async findById(id: string): Promise<Message | null> {
    const { data, error } = await this.client
      .from("messages")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`메시지 조회 실패: ${error.message}`);
    }

    return this.rowToMessage(data as MessagesRow);
  }

  async findByCoordinateRange(
    latMin: number,
    latMax: number,
    lngMin: number,
    lngMax: number
  ): Promise<Message[]> {
    const { data, error } = await this.client
      .from("messages")
      .select("*")
      .gte("lat", latMin)
      .lte("lat", latMax)
      .gte("lng", lngMin)
      .lte("lng", lngMax)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`좌표 범위 조회 실패: ${error.message}`);
    }

    return ((data ?? []) as MessagesRow[]).map((row) => this.rowToMessage(row));
  }

  async findAll(): Promise<Message[]> {
    const { data, error } = await this.client
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`전체 메시지 조회 실패: ${error.message}`);
    }

    return ((data ?? []) as MessagesRow[]).map((row) => this.rowToMessage(row));
  }

  async addReaction(reaction: Reaction): Promise<Reaction> {
    const { error: insertError } = await this.client.from("reactions").insert({
      id: reaction.id,
      message_id: reaction.messageId,
      user_id: reaction.userId,
    });

    if (insertError) {
      throw new Error(`반응 추가 실패: ${insertError.message}`);
    }

    // 메시지의 반응 수 증가
    const { error: rpcError } = await this.client.rpc(
      "increment_reaction_count",
      { target_message_id: reaction.messageId }
    );

    // RPC가 없으면 직접 업데이트 (폴백)
    if (rpcError) {
      const { data: currentMessage } = await this.client
        .from("messages")
        .select("reaction_count")
        .eq("id", reaction.messageId)
        .single();

      if (currentMessage) {
        const row = currentMessage as MessagesRow;
        await this.client
          .from("messages")
          .update({ reaction_count: row.reaction_count + 1 })
          .eq("id", reaction.messageId);
      }
    }

    return reaction;
  }

  async findReactionByUserAndMessage(
    userId: string,
    messageId: string
  ): Promise<Reaction | null> {
    const { data, error } = await this.client
      .from("reactions")
      .select("*")
      .eq("user_id", userId)
      .eq("message_id", messageId)
      .maybeSingle();

    if (error) {
      throw new Error(`반응 조회 실패: ${error.message}`);
    }

    if (!data) return null;

    const row = data as ReactionsRow;
    return Reaction.create({
      id: row.id,
      messageId: row.message_id,
      userId: row.user_id,
      createdAt: new Date(row.created_at),
    });
  }

  async update(message: Message): Promise<Message> {
    const { data, error } = await this.client
      .from("messages")
      .update({
        content: message.content,
        embedding: message.embedding
          ? this.embeddingToString(message.embedding)
          : null,
        lat: message.globeCoordinate?.lat ?? null,
        lng: message.globeCoordinate?.lng ?? null,
        epoch_id: message.epochId,
        reaction_count: message.reactionCount,
      })
      .eq("id", message.id)
      .select()
      .single();

    if (error) {
      throw new Error(`메시지 업데이트 실패: ${error.message}`);
    }

    return this.rowToMessage(data as MessagesRow);
  }

  /** DB 행을 Message 엔티티로 변환 */
  private rowToMessage(row: MessagesRow): Message {
    return Message.create({
      id: row.id,
      content: row.content,
      embedding: row.embedding ? this.stringToEmbedding(row.embedding) : null,
      globeCoordinate:
        row.lat !== null && row.lng !== null
          ? GlobeCoordinate.create(row.lat, row.lng)
          : null,
      epochId: row.epoch_id,
      reactionCount: row.reaction_count,
      createdAt: new Date(row.created_at),
      userId: row.user_id,
    });
  }

  /** Embedding 값 객체를 pgvector 문자열로 변환 */
  private embeddingToString(embedding: Embedding): string {
    return `[${embedding.vector.join(",")}]`;
  }

  /** pgvector 문자열을 Embedding 값 객체로 변환 */
  private stringToEmbedding(str: string): Embedding {
    const cleaned = str.replace(/^\[|\]$/g, "");
    const vector = cleaned.split(",").map(Number);
    return Embedding.create(vector);
  }
}
