-- Coleção pessoal: a chave composta garante um favorito por usuário/obra e serve de índice.
-- FKs removem relações órfãs ao excluir o perfil ou a obra.
create table public.favorites (
    user_id uuid not null,

    book_id uuid not null,

    created_at timestamptz not null default now(),

    constraint fk_favorites_user
        foreign key (user_id)
        references public.profiles(id)
        on delete cascade,

    constraint fk_favorites_book
        foreign key (book_id)
        references public.books(id)
        on delete cascade,

    constraint pk_favorites
        primary key (user_id, book_id)
);

-- RLS limita leitura e exclusão ao titular. Inserir também exige uma obra publicada.
-- A remoção não exige publicação, permitindo limpar favoritos de obras que voltaram a draft.
alter table public.favorites enable row level security;

create policy "favorites_select_own"
on public.favorites
for select
to authenticated
using (
    user_id = auth.uid()
);

create policy "favorites_insert_own_published_book"
on public.favorites
for insert
to authenticated
with check (
    user_id = auth.uid()
    and exists (
        select 1
        from public.books b
        where b.id = favorites.book_id
          and b.status = 'published'
    )
);

create policy "favorites_delete_own"
on public.favorites
for delete
to authenticated
using (
    user_id = auth.uid()
);