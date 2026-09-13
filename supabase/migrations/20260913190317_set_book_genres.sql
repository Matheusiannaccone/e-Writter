-- Substitui os gêneros de um livro mantendo as regras de integridade.

create or replace function public.set_book_genres(
    p_book_id uuid,
    p_genre_ids integer[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_genre_count integer;
    v_existing_genre_count integer;

    v_current_ids integer[];
    v_missing_ids integer[];
    v_obsolete_ids integer[];

    v_replace_count integer;
    v_index integer;
begin
    -- Apenas usuários autenticados podem alterar gêneros.
    if auth.uid() is null then
        raise exception 'authentication required';
    end if;

    -- O livro precisa existir e pertencer ao usuário.
    if not exists (
        select 1
        from public.books b
        where b.id = p_book_id
          and b.author_id = auth.uid()
    ) then
        raise exception 'book not found';
    end if;

    -- O livro deve possuir entre 1 e 3 gêneros.
    v_genre_count := cardinality(p_genre_ids);

    if p_genre_ids is null
       or v_genre_count < 1
       or v_genre_count > 3 then
        raise exception
            'a book must have between 1 and 3 genres';
    end if;

    -- IDs repetidos não são permitidos.
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

    -- Bloqueia alterações concorrentes no mesmo livro.
    perform pg_advisory_xact_lock(
        hashtextextended(p_book_id::text, 0)
    );

    -- Obtém os gêneros atuais.
    select coalesce(
        array_agg(bg.genre_id order by bg.genre_id),
        '{}'::integer[]
    )
    into v_current_ids
    from public.book_genres bg
    where bg.book_id = p_book_id;

    -- Gêneros que precisam ser adicionados.
    select coalesce(
        array_agg(genre_id order by genre_id),
        '{}'::integer[]
    )
    into v_missing_ids
    from unnest(p_genre_ids) as genre_id
    where not (
        genre_id = any(v_current_ids)
    );

    -- Gêneros que precisam ser removidos.
    select coalesce(
        array_agg(genre_id order by genre_id),
        '{}'::integer[]
    )
    into v_obsolete_ids
    from unnest(v_current_ids) as genre_id
    where not (
        genre_id = any(p_genre_ids)
    );

    -- Substitui relações diretamente quando possível.
    -- Isso evita deixar o livro temporariamente sem gêneros.
    v_replace_count := least(
        cardinality(v_missing_ids),
        cardinality(v_obsolete_ids)
    );

    if v_replace_count > 0 then
        for v_index in 1..v_replace_count loop
            update public.book_genres
            set genre_id = v_missing_ids[v_index]
            where book_id = p_book_id
              and genre_id = v_obsolete_ids[v_index];
        end loop;
    end if;

    -- Adiciona gêneros restantes.
    if cardinality(v_missing_ids) > v_replace_count then
        for v_index in
            (v_replace_count + 1)..cardinality(v_missing_ids)
        loop
            insert into public.book_genres (
                book_id,
                genre_id
            )
            values (
                p_book_id,
                v_missing_ids[v_index]
            );
        end loop;
    end if;

    -- Remove gêneros antigos restantes.
    if cardinality(v_obsolete_ids) > v_replace_count then
        for v_index in
            (v_replace_count + 1)..cardinality(v_obsolete_ids)
        loop
            delete from public.book_genres
            where book_id = p_book_id
              and genre_id = v_obsolete_ids[v_index];
        end loop;
    end if;
end;
$$;

revoke all
on function public.set_book_genres(uuid, integer[])
from public;

grant execute
on function public.set_book_genres(uuid, integer[])
to authenticated;