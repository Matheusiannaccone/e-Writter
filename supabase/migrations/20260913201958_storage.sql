-- Configura os buckets e as regras de acesso das imagens do MVP.

-- =========================================================
-- BUCKETS
-- =========================================================

-- Avatares são públicos para leitura.
-- Apenas arquivos WebP são persistidos e o limite é 2 MB.
insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/webp']
)
on conflict (id) do update
set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


-- Capas são públicas para leitura.
-- Apenas arquivos WebP são persistidos e o limite é 5 MB.
insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'covers',
    'covers',
    true,
    5242880,
    array['image/webp']
)
on conflict (id) do update
set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


-- =========================================================
-- AVATARS
-- Path:
-- {user_id}/avatar.webp
--
-- O bucket já representa "avatars", então storage.objects.name
-- contém apenas:
-- {user_id}/avatar.webp
-- =========================================================

create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name = auth.uid()::text || '/avatar.webp'
);


create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name = auth.uid()::text || '/avatar.webp'
)
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name = auth.uid()::text || '/avatar.webp'
);


create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name = auth.uid()::text || '/avatar.webp'
);


-- =========================================================
-- COVERS
-- Path:
-- {book_id}/cover.webp
--
-- O usuário só pode alterar a capa se for autor do livro.
-- =========================================================

create policy "covers_insert_by_book_author"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'covers'
    and name = (storage.foldername(name))[1] || '/cover.webp'
    and exists (
        select 1
        from public.books b
        where b.id::text = (storage.foldername(name))[1]
          and b.author_id = auth.uid()
    )
);


create policy "covers_update_by_book_author"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'covers'
    and name = (storage.foldername(name))[1] || '/cover.webp'
    and exists (
        select 1
        from public.books b
        where b.id::text = (storage.foldername(name))[1]
          and b.author_id = auth.uid()
    )
)
with check (
    bucket_id = 'covers'
    and name = (storage.foldername(name))[1] || '/cover.webp'
    and exists (
        select 1
        from public.books b
        where b.id::text = (storage.foldername(name))[1]
          and b.author_id = auth.uid()
    )
);


create policy "covers_delete_by_book_author"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'covers'
    and name = (storage.foldername(name))[1] || '/cover.webp'
    and exists (
        select 1
        from public.books b
        where b.id::text = (storage.foldername(name))[1]
          and b.author_id = auth.uid()
    )
);