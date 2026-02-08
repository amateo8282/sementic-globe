import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseMessageRepository } from "../repositories/SupabaseMessageRepository";
import { OpenAIEmbeddingService } from "../services/OpenAIEmbeddingService";
import { CosineSimilarityPlacementService } from "../services/CosineSimilarityPlacementService";
import type { MessageRepository } from "@/application/interfaces/MessageRepository";
import type { EmbeddingService } from "@/application/interfaces/EmbeddingService";
import type { PlacementService } from "@/application/interfaces/PlacementService";

/**
 * 의존성 주입 컨테이너
 * 싱글톤 패턴으로 서비스/레포지토리 인스턴스를 관리한다
 */
class Container {
  private messageRepository: MessageRepository | null = null;
  private embeddingService: EmbeddingService | null = null;
  private placementService: PlacementService | null = null;

  /**
   * Supabase 클라이언트로 MessageRepository 생성
   * 서버/브라우저 환경에 따라 다른 클라이언트를 전달한다
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMessageRepository(client: SupabaseClient<any>): MessageRepository {
    if (!this.messageRepository) {
      this.messageRepository = new SupabaseMessageRepository(client);
    }
    return this.messageRepository;
  }

  getEmbeddingService(): EmbeddingService {
    if (!this.embeddingService) {
      this.embeddingService = new OpenAIEmbeddingService();
    }
    return this.embeddingService;
  }

  getPlacementService(): PlacementService {
    if (!this.placementService) {
      this.placementService = new CosineSimilarityPlacementService();
    }
    return this.placementService;
  }

  /** 컨테이너 초기화 (테스트용) */
  reset(): void {
    this.messageRepository = null;
    this.embeddingService = null;
    this.placementService = null;
  }
}

export const container = new Container();
