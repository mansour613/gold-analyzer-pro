-- Optional table for Gold Analyzer Pro signal history sync.
-- The app works with local browser storage if Supabase is not configured.

create table if not exists public.signal_history (
  id text primary key,
  signal_date date not null,
  generated_at timestamptz not null,
  timeframe text not null,
  direction text not null check (direction in ('LONG', 'SHORT', 'NONE')),
  entry numeric not null,
  stop_loss numeric not null,
  take_profit_1 numeric not null,
  take_profit_2 numeric not null,
  confidence integer not null,
  grade text not null,
  status text not null,
  points numeric not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists signal_history_date_tf_idx
  on public.signal_history (signal_date desc, timeframe, generated_at desc);

alter table public.signal_history enable row level security;

-- For a public PWA with anon-key inserts, keep this table limited to signal history only.
-- Tighten policies later when user accounts are added.
create policy if not exists "anon can insert signal history"
  on public.signal_history for insert
  to anon
  with check (true);

create policy if not exists "anon can read signal history"
  on public.signal_history for select
  to anon
  using (true);
