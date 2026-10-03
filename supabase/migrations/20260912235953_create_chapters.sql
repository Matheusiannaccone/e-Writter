create table public.chapters (
    id uuid primary key default gen_random_uuid(),

    book_id uuid not null,

    title text,

    content text,

    status text not null default 'draft',

    position integer not null,

    published_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint fk_chapters_book
        foreign key (book_id)
        references public.books(id)
        on delete cascade,

    constraint chk_chapters_status
        check (status in ('draft', 'published')),

    constraint chk_chapters_position
        check (position > 0),

    constraint uq_chapters_book_position
        unique (book_id, position)
);

alter table public.chapters enable row level security;

create policy "chapters_select_visible"
on public.chapters
for select
using (
    exists (
        select 1
        from public.books b
        where b.id = chapters.book_id
          and (
              (
                  chapters.status = 'published'
                  and b.status = 'published'
              )
              or b.author_id = auth.uid()
          )
    )
);

create policy "chapters_insert_by_book_author"
on public.chapters
for insert
to authenticated
with check (
    exists (
        select 1
        from public.books b
        where b.id = chapters.book_id
          and b.author_id = auth.uid()
    )
);

create policy "chapters_update_by_book_author"
on public.chapters
for update
to authenticated
using (
    exists (
        select 1
        from public.books b
        where b.id = chapters.book_id
          and b.author_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.books b
        where b.id = chapters.book_id
          and b.author_id = auth.uid()
    )
);

create policy "chapters_delete_by_book_author"
on public.chapters
for delete
to authenticated
using (
    exists (
        select 1
        from public.books b
        where b.id = chapters.book_id
          and b.author_id = auth.uid()
    )
);

-- =========================================================
-- UPDATED_AT
-- =========================================================

-- Reutiliza a função já criada na migration de profiles.

create trigger on_chapters_updated
before update on public.chapters
for each row
execute function public.handle_updated_user();


-- =========================================================
-- POSIÇÃO AUTOMÁTICA
-- =========================================================

create or replace function public.assign_chapter_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    -- Evita dois capítulos recebendo a mesma posição
    -- caso sejam criados simultaneamente no mesmo livro.
    perform pg_advisory_xact_lock(
        hashtextextended(new.book_id::text, 0)
    );

    select coalesce(max(c.position), 0) + 1
    into new.position
    from public.chapters c
    where c.book_id = new.book_id;

    return new;
end;
$$;

create trigger on_chapter_created_assign_position
before insert on public.chapters
for each row
execute function public.assign_chapter_position();


-- =========================================================
-- IMPEDIR REORDENAÇÃO / MUDANÇA DE LIVRO
-- =========================================================

create or replace function public.prevent_chapter_reorder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.position is distinct from old.position then
        raise exception
            'chapter position cannot be changed';
    end if;

    if new.book_id is distinct from old.book_id then
        raise exception
            'chapter cannot be moved to another book';
    end if;

    return new;
end;
$$;

create trigger on_chapter_updated_prevent_reorder
before update on public.chapters
for each row
execute function public.prevent_chapter_reorder();


-- =========================================================
-- PUBLICAÇÃO DO CAPÍTULO
-- =========================================================

create or replace function public.handle_chapter_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.status = 'published' then

        -- Título obrigatório para publicação.
        if new.title is null
           or btrim(new.title) = '' then
            raise exception
                'published chapter requires a title';
        end if;

        -- Conteúdo entre 500 e 15000 caracteres.
        if new.content is null
           or char_length(new.content) < 500
           or char_length(new.content) > 15000 then
            raise exception
                'published chapter content must contain between 500 and 15000 characters';
        end if;

        -- Primeira publicação.
        if tg_op = 'INSERT' then
            new.published_at := now();

        elsif old.status is distinct from 'published' then
            new.published_at := now();

        else
            -- Se já estava publicado, preserva a data original.
            new.published_at := old.published_at;
        end if;

    else
        -- Draft nunca possui published_at.
        new.published_at := null;
    end if;

    return new;
end;
$$;

create trigger on_chapter_publication_status_changed
before insert or update on public.chapters
for each row
execute function public.handle_chapter_publication();


-- =========================================================
-- EXCLUSÃO SEQUENCIAL
-- =========================================================

create or replace function public.delete_later_chapters()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    -- Se o livro inteiro estiver sendo removido por CASCADE,
    -- não precisamos aplicar a regra de exclusão sequencial.
    if not exists (
        select 1
        from public.books b
        where b.id = old.book_id
    ) then
        return old;
    end if;

    -- Evita recursão: os DELETEs disparados por esta função
    -- não executam novamente a exclusão da cauda.
    if pg_trigger_depth() = 1 then
        delete from public.chapters
        where book_id = old.book_id
          and position > old.position;
    end if;

    return old;
end;
$$;

create trigger on_chapter_deleted_remove_later
after delete on public.chapters
for each row
execute function public.delete_later_chapters();