-- Books and reading progress schema

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  author text,
  format text not null check (format in ('epub','pdf')),
  cover_url text,
  file_url text not null,
  size_bytes integer,
  uploaded_at timestamptz not null default now(),
  drm_flag boolean not null default false
);

create index if not exists books_user_id_idx on public.books(user_id);

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  location_json jsonb not null,
  updated_at timestamptz not null default now(),
  unique(user_id, book_id)
);

create index if not exists reading_progress_user_book_idx on public.reading_progress(user_id, book_id);


