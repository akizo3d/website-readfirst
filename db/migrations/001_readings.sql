create table if not exists public.readings (
  id text primary key,
  user_id uuid not null,
  title text not null,
  source_type text not null default 'pdf',
  tags text[] not null default '{}',
  language text not null default 'original',
  enhancement_status text not null default 'raw',
  progress real not null default 0,
  blob_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now()
);

create index if not exists readings_user_idx on public.readings (user_id, last_opened_at desc);
create index if not exists readings_title_idx on public.readings using gin (to_tsvector('simple', coalesce(title,'')));
