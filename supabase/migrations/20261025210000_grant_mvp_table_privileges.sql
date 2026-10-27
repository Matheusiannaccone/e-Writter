-- e-Writter: explicit least-privilege table access for PostgREST roles.
-- RLS policies remain the per-row authorization boundary.
-- Do not change previously-applied migrations.

-- These roles must be able to resolve the public schema to access its objects.
grant usage on schema public to anon, authenticated;

-- Remove implicit/default table grants before adding the MVP allowlist.
-- This also removes potentially excessive operations (TRUNCATE, REFERENCES,
-- TRIGGER, MAINTAIN) on these specific tables.
revoke all privileges on table
    public.profiles,
    public.books,
    public.chapters,
    public.genres,
    public.book_genres,
    public.favorites
from anon, authenticated;

-- Public read of application profiles, public books, published chapters,
-- controlled genres, and genre associations is constrained by RLS.
grant select on table
    public.profiles,
    public.books,
    public.chapters,
    public.genres,
    public.book_genres
 to anon;

-- Authenticated users also read their own private records according to RLS.
grant select on table
    public.profiles,
    public.books,
    public.chapters,
    public.genres,
    public.book_genres,
    public.favorites
 to authenticated;

-- Profiles are ordinarily created by the auth.users trigger.
-- The RLS 1.0 matrix still allows an authenticated user to insert only
-- their own profile; keeping INSERT follows the currently-approved matrix.
grant insert, update on table public.profiles to authenticated;

-- Books and chapters: writers can mutate only their own data via RLS.
grant insert, update, delete on table
    public.books,
    public.chapters
 to authenticated;

-- Association updates are performed through the checked SECURITY DEFINER RPC.
-- Direct UPDATE is intentionally not granted.
grant insert, delete on table public.book_genres to authenticated;

-- A private per-user favorites collection, constrained by RLS.
grant insert, delete on table public.favorites to authenticated;

-- 'genres' has no DML grants to web-facing roles.
-- No permission is granted for direct DELETE of profiles or UPDATE of favorites.
