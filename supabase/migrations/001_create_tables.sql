-- pgvector 확장 활성화
create extension if not exists vector with schema public;

-- messages 테이블: 익명 메시지 저장
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  lat double precision,
  lng double precision,
  epoch_id uuid,
  reaction_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- reactions 테이블: 메시지에 대한 반응(공감)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- epochs 테이블: UMAP 재계산 주기 단위
create table if not exists public.epochs (
  id uuid primary key default gen_random_uuid(),
  start_date timestamptz not null,
  end_date timestamptz not null,
  message_count integer not null default 0
);

-- messages 테이블에 epoch_id 외래 키 추가
alter table public.messages
  add constraint messages_epoch_id_fkey
  foreign key (epoch_id) references public.epochs(id) on delete set null;

-- 인덱스 생성
create index if not exists idx_messages_lat_lng on public.messages (lat, lng);
create index if not exists idx_messages_epoch_id on public.messages (epoch_id);
create index if not exists idx_messages_created_at on public.messages (created_at desc);
create index if not exists idx_reactions_message_id on public.reactions (message_id);

-- 반응 수 증가 RPC 함수
create or replace function public.increment_reaction_count(target_message_id uuid)
returns void as $$
begin
  update public.messages
  set reaction_count = reaction_count + 1
  where id = target_message_id;
end;
$$ language plpgsql security definer;

-- RLS 정책 설정
alter table public.messages enable row level security;
alter table public.reactions enable row level security;
alter table public.epochs enable row level security;

-- messages: 누구나 읽기 가능
create policy "messages_select_policy"
  on public.messages for select
  to anon, authenticated
  using (true);

-- messages: anon, authenticated 역할로 쓰기 가능
create policy "messages_insert_policy"
  on public.messages for insert
  to anon, authenticated
  with check (true);

-- messages: 업데이트 허용 (반응 수 증가 등)
create policy "messages_update_policy"
  on public.messages for update
  to anon, authenticated
  using (true)
  with check (true);

-- reactions: 누구나 읽기 가능
create policy "reactions_select_policy"
  on public.reactions for select
  to anon, authenticated
  using (true);

-- reactions: anon, authenticated 역할로 쓰기 가능
create policy "reactions_insert_policy"
  on public.reactions for insert
  to anon, authenticated
  with check (true);

-- epochs: 누구나 읽기 가능
create policy "epochs_select_policy"
  on public.epochs for select
  to anon, authenticated
  using (true);
