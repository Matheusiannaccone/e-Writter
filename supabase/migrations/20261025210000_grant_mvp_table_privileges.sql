-- e-Writter: privilégios explícitos de tabela para os papéis usados pelo PostgREST.
-- GRANT habilita a operação na tabela; RLS continua delimitando as linhas acessíveis.
-- Esta migration explicita os privilégios necessários às tabelas criadas anteriormente.

-- USAGE permite aos papéis resolver os objetos do schema public.
grant usage on schema public to anon, authenticated;

-- Revoga os privilégios anteriores antes de conceder somente as operações do MVP.
-- Isso também retira TRUNCATE, REFERENCES, TRIGGER e MAINTAIN destas tabelas.
revoke all privileges on table
    public.profiles,
    public.books,
    public.chapters,
    public.genres,
    public.book_genres,
    public.favorites
from anon, authenticated;

-- Leitura anônima de perfis, obras, capítulos, gêneros e associações.
-- As políticas RLS filtram obras e capítulos conforme sua visibilidade.
grant select on table
    public.profiles,
    public.books,
    public.chapters,
    public.genres,
    public.book_genres
 to anon;

-- Autenticados também leem registros próprios privados conforme as políticas RLS.
grant select on table
    public.profiles,
    public.books,
    public.chapters,
    public.genres,
    public.book_genres,
    public.favorites
 to authenticated;

-- Perfis normalmente são criados pelo trigger de auth.users.
-- INSERT e UPDATE diretos continuam limitados pela RLS ao perfil do próprio usuário.
grant insert, update on table public.profiles to authenticated;

-- Escrita de obras e capítulos: RLS restringe as alterações ao autor.
grant insert, update, delete on table
    public.books,
    public.chapters
 to authenticated;

-- UPDATE de associações ocorre pela RPC SECURITY DEFINER, que valida autoria e gêneros.
-- O cliente recebe apenas INSERT e DELETE diretos, também sujeitos às políticas.
grant insert, delete on table public.book_genres to authenticated;

-- Favoritos permitem inserir/remover relações próprias, conforme RLS.
grant insert, delete on table public.favorites to authenticated;

-- Os papéis do frontend não recebem escrita em genres.
-- Também não recebem DELETE direto de profiles nem UPDATE de favorites.
