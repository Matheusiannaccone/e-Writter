-- Perfil público vinculado à conta de Auth; a exclusão da conta remove o perfil por cascata.
-- Username único/normalizado, nome aparado e limite de bio são garantidos por constraints.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  username text not null unique
    check (
      char_length(username) between 3 and 30
      and username = lower(username)
      and username = btrim(username)
      and username ~ '^[a-z0-9._]+$'
    ),

  display_name text not null
    check (
      char_length(display_name) between 1 and 60
      and display_name = btrim(display_name)
    ),

  bio text
    check (
      bio is null
      or char_length(bio) <= 500
    ),

  avatar_path text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

-- RLS permite leitura pública, mas restringe inserção e atualização ao próprio auth.uid().
-- USING seleciona linhas alteráveis; WITH CHECK também valida a identidade após a escrita.
alter table public.profiles enable row level security;

create policy "profiles_select_public"
on public.profiles
for select
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);

-- O trigger cria o perfil na mesma transação do cadastro com metadados validados.
-- SECURITY DEFINER permite a inserção durante Auth; search_path vazio exige nomes qualificados.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_display_name text;
begin
  v_username := new.raw_user_meta_data ->> 'username';
  v_display_name := new.raw_user_meta_data ->> 'display_name';

  if v_username is null or btrim(v_username) = '' then
    raise exception 'username is required';
  end if;

  if char_length(v_username) < 3
     or char_length(v_username) > 30 then
    raise exception 'username must contain between 3 and 30 characters';
  end if;

  if v_username <> btrim(v_username) then
    raise exception 'username cannot contain leading or trailing spaces';
  end if;

  if v_username <> lower(v_username) then
    raise exception 'username must use lowercase characters';
  end if;

  if v_username !~ '^[a-z0-9._]+$' then
    raise exception 'username contains invalid characters';
  end if;

  if v_display_name is null
     or btrim(v_display_name) = '' then
    raise exception 'display_name is required';
  end if;

  if char_length(v_display_name) > 60 then
    raise exception 'display_name must contain at most 60 characters';
  end if;

  if v_display_name <> btrim(v_display_name) then
    raise exception 'display_name cannot contain leading or trailing spaces';
  end if;

  insert into public.profiles (
    id,
    username,
    display_name
  )
  values (
    new.id,
    v_username,
    v_display_name
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Função reutilizada por triggers de atualização para manter updated_at pelo relógio do banco.
create or replace function public.handle_updated_user()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;

create trigger on_profiles_updated
before update on public.profiles
for each row
execute function public.handle_updated_user();