-- messages 테이블에 user_id 추가 (기존 시드 데이터 호환 위해 nullable)
ALTER TABLE public.messages ADD COLUMN user_id uuid;

-- reactions 테이블에 user_id 추가
ALTER TABLE public.reactions ADD COLUMN user_id uuid;

-- 동일 사용자의 동일 메시지 중복 반응 방지
ALTER TABLE public.reactions ADD CONSTRAINT reactions_user_message_unique
  UNIQUE (message_id, user_id);

-- 본인 메시지만 삭제 가능 RLS 정책
CREATE POLICY "messages_delete_policy"
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
