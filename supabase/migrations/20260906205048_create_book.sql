CREATE TABLE public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    author_id UUID,

    title TEXT NOT NULL,

    description TEXT,

    cover_path TEXT,

    status TEXT NOT NULL DEFAULT 'draft',

    publication_status TEXT NOT NULL DEFAULT 'ongoing',

    language TEXT NOT NULL DEFAULT 'pt-BR',

    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_books_author
        FOREIGN KEY (author_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_books_status
        CHECK (status IN ('draft', 'published')),

    CONSTRAINT chk_books_publication_status
        CHECK (
            publication_status IN (
                'ongoing',
                'completed',
                'discontinued'
            )
        ),

    CONSTRAINT chk_books_title_not_blank
        CHECK (char_length(btrim(title)) > 0)
);

alter table books enable row level security;


create policy "books_select_visible"
on public.books
for select
using (
    status = 'published'
    or author_id = auth.uid()
);

create policy "books_insert_own"
on public.books
for insert
to authenticated
with check (
    author_id = auth.uid()
);

create policy "books_update_own"
on public.books
for update
to authenticated
using (
    author_id = auth.uid()
)
with check (
    author_id = auth.uid()
);

create policy "books_delete_own"
on public.books
for delete
to authenticated
using (
    author_id = auth.uid()
);

create or replace function public.handle_book_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.status = 'published' then

        if tg_op = 'INSERT' then
            new.published_at := now();

        elsif old.status is distinct from 'published' then
            new.published_at := now();

        else
            -- Impede alteração manual da data original.
            new.published_at := old.published_at;
        end if;

    else
        -- Livro draft nunca possui published_at.
        new.published_at := null;
    end if;

    return new;
end;
$$;

create trigger on_books_updated
before update on public.books
for each row
execute function public.handle_updated_user();

create trigger on_book_publication_status_changed
before insert or update on public.books
for each row
execute function public.handle_book_publication();
