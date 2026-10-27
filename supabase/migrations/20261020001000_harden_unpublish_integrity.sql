-- A integridade de livros publicados é avaliada no estado final da transação.
-- Nenhuma configuração de sessão participa da autorização ou da validação.

drop trigger if exists on_chapter_status_changed_validate_book
on public.chapters;

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

-- A cascata de despublicação pode atualizar vários capítulos antes de ajustar a
-- obra. A constraint trigger vê somente o estado final no COMMIT e rejeita toda
-- transação que deixe uma obra publicada sem capítulo publicado.
create constraint trigger on_chapter_status_changed_validate_book
after update on public.chapters
deferrable initially deferred
for each row
when (old.status is distinct from new.status)
execute function public.validate_published_book_chapters();


-- RPC SECURITY DEFINER com autenticação/autoria explícitas e locks sobre obra e capítulo.
-- Despublica o alvo e a cauda publicada; se não sobrar capítulo publicado, também muda a obra para draft.
-- Qualquer falha desfaz a operação; a constraint adiada avalia o estado final da transação.
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

    if v_book_status = 'published' and not v_has_published_chapter then
        update public.books
        set status = 'draft'
        where id = v_book_id;
    end if;
end;
$$;

-- A execução elevada fica restrita a authenticated; estar autenticado não dispensa a checagem de autoria.
revoke all
on function public.unpublish_chapter(uuid)
from public;

grant execute
on function public.unpublish_chapter(uuid)
to authenticated;
