create table public.book_genres (
    book_id uuid not null,

    genre_id integer not null,

    constraint fk_book_genres_book
        foreign key (book_id)
        references public.books(id)
        on delete cascade,

    constraint fk_book_genres_genre
        foreign key (genre_id)
        references public.genres(id)
        on delete restrict,

    constraint pk_book_genres
        primary key (book_id, genre_id)
);

alter table public.book_genres enable row level security;

create policy "book_genres_select_visible"
on public.book_genres
for select
using (
    exists (
        select 1
        from public.books b
        where b.id = book_genres.book_id
          and (
              b.status = 'published'
              or b.author_id = auth.uid()
          )
    )
);

create policy "book_genres_insert_by_book_author"
on public.book_genres
for insert
to authenticated
with check (
    exists (
        select 1
        from public.books b
        where b.id = book_genres.book_id
          and b.author_id = auth.uid()
    )
);

create policy "book_genres_delete_by_book_author"
on public.book_genres
for delete
to authenticated
using (
    exists (
        select 1
        from public.books b
        where b.id = book_genres.book_id
          and b.author_id = auth.uid()
    )
);

create or replace function public.validate_book_genre_count()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_book_id uuid;
    v_count integer;
begin
    v_book_id := case
        when tg_op = 'INSERT' then new.book_id
        else old.book_id
    end;

    -- Evita concorrência gerando contagens inconsistentes
    -- para o mesmo livro.
    perform pg_advisory_xact_lock(
        hashtextextended(v_book_id::text, 0)
    );

    select count(*)
    into v_count
    from public.book_genres bg
    where bg.book_id = v_book_id;

    -- =====================================================
    -- INSERT
    -- =====================================================

    if tg_op = 'INSERT' then

        if v_count >= 3 then
            raise exception
                'a book cannot have more than 3 genres';
        end if;

        return new;
    end if;

    -- =====================================================
    -- DELETE
    -- =====================================================

    if tg_op = 'DELETE' then

        -- Se o próprio livro estiver sendo excluído,
        -- não devemos impedir o ON DELETE CASCADE.
        if not exists (
            select 1
            from public.books b
            where b.id = v_book_id
        ) then
            return old;
        end if;

        if v_count <= 1 then
            raise exception
                'a book must have at least 1 genre';
        end if;

        return old;
    end if;

    return null;
end;
$$;

create trigger on_book_genre_insert_validate_count
before insert on public.book_genres
for each row
execute function public.validate_book_genre_count();

create trigger on_book_genre_delete_validate_count
before delete on public.book_genres
for each row
execute function public.validate_book_genre_count();