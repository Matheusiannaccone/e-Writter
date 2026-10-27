-- Etapa inicial da despublicação. A migration 20261020001000 substitui a função
-- de integridade e unpublish_chapter, eliminando o uso da configuração de sessão.
-- Os comentários abaixo descrevem esta versão intermediária na sequência de migrations.
-- Despublicação autorizada e atômica de obras e capítulos.

-- A cascata de despublicação precisa atualizar mais de um capítulo antes de
-- decidir se a obra continuará publicada. O bypass só existe dentro da
-- transação marcada por unpublish_chapter; alterações comuns continuam sendo
-- protegidas pelo gatilho de integridade.
create or replace function public.validate_published_book_chapters()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    v_book_id uuid;
begin
    if current_setting('e_writter.unpublish_chapter', true) = 'on' then
        return null;
    end if;

    if tg_op = 'DELETE' then
        v_book_id := old.book_id;
    else
        v_book_id := new.book_id;
    end if;

    if not exists (
        select 1
        from public.books b
        where b.id = v_book_id
    ) then
        return null;
    end if;

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

-- RPC elevada: autenticação e autoria são verificadas antes de bloquear e alterar a obra.
-- Retorna void; o adapter consulta depois a obra para entregar os dados atualizados.
create or replace function public.unpublish_book(
    p_book_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_status text;
begin
    if auth.uid() is null then
        raise exception 'authentication required';
    end if;

    select b.status
    into v_status
    from public.books b
    where b.id = p_book_id
      and b.author_id = auth.uid()
    for update;

    if not found then
        raise exception 'book not found';
    end if;

    if v_status <> 'published' then
        raise exception 'book is already draft';
    end if;

    update public.books
    set status = 'draft'
    where id = p_book_id;
end;
$$;

revoke all
on function public.unpublish_book(uuid)
from public;

grant execute
on function public.unpublish_book(uuid)
to authenticated;


create or replace function public.unpublish_chapter(
    p_chapter_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_book_id uuid;
    v_position integer;
    v_chapter_status text;
    v_book_status text;
    v_has_published_chapter boolean;
begin
    if auth.uid() is null then
        raise exception 'authentication required';
    end if;

    -- Bloqueia o livro e o capítulo para manter a cascata sequencial consistente.
    select c.book_id, c.position, c.status, b.status
    into v_book_id, v_position, v_chapter_status, v_book_status
    from public.chapters c
    join public.books b on b.id = c.book_id
    where c.id = p_chapter_id
      and b.author_id = auth.uid()
    for update of b, c;

    if not found then
        raise exception 'chapter not found';
    end if;

    if v_chapter_status <> 'published' then
        raise exception 'chapter is already draft';
    end if;

    -- O gatilho de integridade é suspenso apenas nesta transação, enquanto a
    -- cauda é atualizada e o estado final da obra é calculado.
    perform set_config('e_writter.unpublish_chapter', 'on', true);

    update public.chapters
    set status = 'draft'
    where book_id = v_book_id
      and position >= v_position
      and status = 'published';

    select exists (
        select 1
        from public.chapters c
        where c.book_id = v_book_id
          and c.status = 'published'
    )
    into v_has_published_chapter;

    -- Se não restar capítulo publicado, a obra publicada retorna automaticamente
    -- a draft. Caso contrário, ela preserva o estado e a data de publicação.
    if v_book_status = 'published' and not v_has_published_chapter then
        update public.books
        set status = 'draft'
        where id = v_book_id;
    end if;
end;
$$;

revoke all
on function public.unpublish_chapter(uuid)
from public;

grant execute
on function public.unpublish_chapter(uuid)
to authenticated;
