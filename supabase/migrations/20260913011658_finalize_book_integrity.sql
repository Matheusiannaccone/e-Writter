create or replace function public.ensure_book_has_genres()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_count integer;
begin
    -- Se o livro já foi removido dentro da mesma transação,
    -- não há nada para validar.
    if not exists (
        select 1
        from public.books b
        where b.id = new.id
    ) then
        return null;
    end if;

    select count(*)
    into v_count
    from public.book_genres bg
    where bg.book_id = new.id;

    if v_count < 1 or v_count > 3 then
        raise exception
            'a book must have between 1 and 3 genres';
    end if;

    return null;
end;
$$;

create constraint trigger book_requires_genres
after insert on public.books
deferrable initially deferred
for each row
execute function public.ensure_book_has_genres();

create or replace function public.create_book(
    p_title text,
    p_description text,
    p_genre_ids integer[]
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
    v_book_id uuid;
    v_genre_count integer;
    v_existing_genre_count integer;
begin
    -- Precisa estar autenticado.
    if auth.uid() is null then
        raise exception 'authentication required';
    end if;

    -- Título obrigatório.
    if p_title is null
       or btrim(p_title) = '' then
        raise exception 'book title is required';
    end if;

    -- Precisa informar entre 1 e 3 gêneros.
    v_genre_count := cardinality(p_genre_ids);

    if p_genre_ids is null
       or v_genre_count < 1
       or v_genre_count > 3 then
        raise exception
            'a book must have between 1 and 3 genres';
    end if;

    -- Não permite IDs repetidos.
    if (
        select count(distinct genre_id)
        from unnest(p_genre_ids) as genre_id
    ) <> v_genre_count then
        raise exception
            'genre ids must be unique';
    end if;

    -- Todos os gêneros precisam existir.
    select count(*)
    into v_existing_genre_count
    from public.genres g
    where g.id = any(p_genre_ids);

    if v_existing_genre_count <> v_genre_count then
        raise exception
            'one or more genres do not exist';
    end if;

    insert into public.books (
        author_id,
        title,
        description
    )
    values (
        auth.uid(),
        btrim(p_title),
        nullif(btrim(p_description), '')
    )
    returning id
    into v_book_id;

    insert into public.book_genres (
        book_id,
        genre_id
    )
    select
        v_book_id,
        genre_id
    from unnest(p_genre_ids) as genre_id;

    return v_book_id;
end;
$$;

revoke all
on function public.create_book(text, text, integer[])
from public;

grant execute
on function public.create_book(text, text, integer[])
to authenticated;

create or replace function public.validate_book_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_genre_count integer;
    v_published_chapter_count integer;
begin
    if new.status <> 'published' then
        return new;
    end if;

    -- A tabela já possui CHECK para título não vazio,
    -- mas mantemos a validação explícita de publicação.
    if new.title is null
       or btrim(new.title) = '' then
        raise exception
            'published book requires a title';
    end if;

    if new.description is null
       or btrim(new.description) = '' then
        raise exception
            'published book requires a description';
    end if;

    select count(*)
    into v_genre_count
    from public.book_genres bg
    where bg.book_id = new.id;

    if v_genre_count < 1 or v_genre_count > 3 then
        raise exception
            'published book requires between 1 and 3 genres';
    end if;

    select count(*)
    into v_published_chapter_count
    from public.chapters c
    where c.book_id = new.id
      and c.status = 'published';

    if v_published_chapter_count < 1 then
        raise exception
            'published book requires at least 1 published chapter';
    end if;

    return new;
end;
$$;

create trigger on_book_validate_publication
before insert or update on public.books
for each row
execute function public.validate_book_publication();

create or replace function public.validate_published_book_chapters()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_book_id uuid;
begin
    if tg_op = 'DELETE' then
        v_book_id := old.book_id;
    else
        v_book_id := new.book_id;
    end if;

    -- Se o próprio livro estiver sendo excluído,
    -- não interfere no ON DELETE CASCADE.
    if not exists (
        select 1
        from public.books b
        where b.id = v_book_id
    ) then
        return null;
    end if;

    -- Só precisamos validar livros publicados.
    if not exists (
        select 1
        from public.books b
        where b.id = v_book_id
          and b.status = 'published'
    ) then
        return null;
    end if;

    if not exists (
        select 1
        from public.chapters c
        where c.book_id = v_book_id
          and c.status = 'published'
    ) then
        raise exception
            'a published book must have at least 1 published chapter';
    end if;

    return null;
end;
$$;

create trigger on_chapter_status_changed_validate_book
after update of status on public.chapters
for each row
when (old.status is distinct from new.status)
execute function public.validate_published_book_chapters();


create trigger on_chapter_deleted_validate_book
after delete on public.chapters
for each row
execute function public.validate_published_book_chapters();