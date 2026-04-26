-- ShotenX: provider services (Task 8) + user transaction ledger (Task 7)
-- Run in Supabase SQL Editor, or: supabase db push (CLI)

-- ---------------------------------------------------------------------------
-- services: registered APIs / agent listings per authenticated user
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  price_sats integer not null default 10
    check (price_sats > 0 and price_sats <= 100000000),
  endpoint_url text not null,
  category text not null default 'AI',
  api_key text not null,
  lightning_address text,
  created_at timestamptz not null default now()
);

comment on table public.services is 'User-registered L402-facing services (ShotenX register page).';

create index if not exists services_user_created_idx
  on public.services (user_id, created_at desc);

alter table public.services enable row level security;

drop policy if exists "services_select_own" on public.services;
create policy "services_select_own"
  on public.services for select
  using (auth.uid() = user_id);

drop policy if exists "services_insert_own" on public.services;
create policy "services_insert_own"
  on public.services for insert
  with check (auth.uid() = user_id);

drop policy if exists "services_update_own" on public.services;
create policy "services_update_own"
  on public.services for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "services_delete_own" on public.services;
create policy "services_delete_own"
  on public.services for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- transactions: Lightning / L402 events attributed to a user (Task 7)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_sats integer not null default 0
    check (amount_sats >= 0 and amount_sats <= 100000000),
  service_name text not null default 'Lightning',
  payment_hash text,
  status text not null default 'pending'
    check (status in ('pending', 'settled', 'consumed', 'expired', 'failed')),
  checkout_id text,
  request_path text,
  event text not null default 'manual',
  created_at timestamptz not null default now()
);

comment on table public.transactions is 'Per-user payment ledger; optional mirror of L402 events from app.';

create index if not exists transactions_user_created_idx
  on public.transactions (user_id, created_at desc);

create index if not exists transactions_payment_hash_idx
  on public.transactions (payment_hash)
  where payment_hash is not null;

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
  on public.transactions for delete
  using (auth.uid() = user_id);
