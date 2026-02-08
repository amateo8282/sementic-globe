import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * 서버용 Supabase 클라이언트
 * 서버 컴포넌트, API 라우트, 서버 액션에서 사용한다
 * Service Role Key를 사용하여 RLS를 우회한다
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase 서버 환경변수가 설정되지 않았습니다: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
