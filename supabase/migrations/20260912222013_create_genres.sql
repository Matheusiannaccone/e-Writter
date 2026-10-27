-- Vocabulário controlado com ID identity e unicidade de nome/slug.
-- O índice da chave primária e os índices UNIQUE são criados pelas próprias constraints.
create table public.genres (
  id integer generated always as identity primary key,

  name text not null unique,

  slug text not null unique
);

-- Carga inicial dos gêneros disponíveis para associação às obras.
insert into public.genres (name, slug)
values
  ('Ação', 'acao'),
  ('Aventura', 'aventura'),
  ('Comédia', 'comedia'),
  ('Drama', 'drama'),
  ('Fantasia', 'fantasia'),
  ('Ficção Científica', 'ficcao-cientifica'),
  ('Mistério', 'misterio'),
  ('Romance', 'romance'),
  ('Suspense', 'suspense'),
  ('Terror', 'terror'),
  ('Ficção Histórica', 'ficcao-historica'),
  ('Fanfic', 'fanfic');

-- A política abre apenas SELECT público; esta migration não cria políticas de escrita para clientes.
alter table public.genres enable row level security;

create policy "genres_select_public"
on public.genres
for select
using (true);