-- Storage policies for buckets: books, covers
-- Note: storage RLS is enabled by default on storage.objects

-- Public read for books and covers (optional for MVP).
-- If you prefer private buckets, skip these and use signed URLs instead.
drop policy if exists "Public read books" on storage.objects;
create policy "Public read books" on storage.objects
for select using (bucket_id = 'books');

drop policy if exists "Public read covers" on storage.objects;
create policy "Public read covers" on storage.objects
for select using (bucket_id = 'covers');

-- Authenticated users can upload into books and covers.
drop policy if exists "Authenticated insert books" on storage.objects;
create policy "Authenticated insert books" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'books' and (
    owner = auth.uid()
  )
);

drop policy if exists "Authenticated insert covers" on storage.objects;
create policy "Authenticated insert covers" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'covers' and (
    owner = auth.uid()
  )
);

-- Authenticated users can update/delete their own files in these buckets
drop policy if exists "Update own books" on storage.objects;
create policy "Update own books" on storage.objects
for update to authenticated
using (bucket_id = 'books' and owner = auth.uid());

drop policy if exists "Delete own books" on storage.objects;
create policy "Delete own books" on storage.objects
for delete to authenticated
using (bucket_id = 'books' and owner = auth.uid());

drop policy if exists "Update own covers" on storage.objects;
create policy "Update own covers" on storage.objects
for update to authenticated
using (bucket_id = 'covers' and owner = auth.uid());

drop policy if exists "Delete own covers" on storage.objects;
create policy "Delete own covers" on storage.objects
for delete to authenticated
using (bucket_id = 'covers' and owner = auth.uid());


