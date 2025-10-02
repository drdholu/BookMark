-- Enable RLS
alter table public.books enable row level security;
alter table public.reading_progress enable row level security;

-- Books policies: owner-only
drop policy if exists "books_select_own" on public.books;
create policy "books_select_own" on public.books
for select using (auth.uid() = user_id);

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own" on public.books
for insert with check (auth.uid() = user_id);

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own" on public.books
for update using (auth.uid() = user_id);

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own" on public.books
for delete using (auth.uid() = user_id);

-- Reading progress policies: owner-only
drop policy if exists "progress_select_own" on public.reading_progress;
create policy "progress_select_own" on public.reading_progress
for select using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.reading_progress;
create policy "progress_insert_own" on public.reading_progress
for insert with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.reading_progress;
create policy "progress_update_own" on public.reading_progress
for update using (auth.uid() = user_id);

drop policy if exists "progress_delete_own" on public.reading_progress;
create policy "progress_delete_own" on public.reading_progress
for delete using (auth.uid() = user_id);


