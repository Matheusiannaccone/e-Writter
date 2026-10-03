create table public.genres (
  id integer generated always as identity primary key,

  name text not null unique,

  slug text not null unique
);

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

alter table public.genres enable row level security;

create policy "genres_select_public"
on public.genres
for select
using (true);