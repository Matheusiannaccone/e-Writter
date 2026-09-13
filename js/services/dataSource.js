import { mockAuthAdapter } from "./adapters/mock/authAdapter.js";
import { supabaseAuthAdapter } from "./adapters/supabase/authAdapter.js";

import { mockProfileAdapter } from "./adapters/mock/profileAdapter.js";
import { supabaseProfileAdapter } from "./adapters/supabase/profileAdapter.js";

import { mockGenreAdapter } from "./adapters/mock/genreAdapter.js";
import { supabaseGenreAdapter } from "./adapters/supabase/genreAdapter.js";

import { mockBookAdapter } from "./adapters/mock/bookAdapter.js";
import { supabaseBookAdapter } from "./adapters/supabase/bookAdapter.js";

import { mockChapterAdapter } from "./adapters/mock/chapterAdapter.js";
import { supabaseChapterAdapter } from "./adapters/supabase/chapterAdapter.js";

import { mockFavoriteAdapter } from "./adapters/mock/favoriteAdapter.js";
import { supabaseFavoriteAdapter } from "./adapters/supabase/favoriteAdapter.js";

export function getDataSource() {
  const hostname = window.location.hostname;

  const params = new URLSearchParams(window.location.search);
  const requestedDataSource = params.get("datasource");

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  if (isLocal && requestedDataSource !== "supabase") {
    return "mock";
  }

  return "supabase";
}

// Retorna o adapter de autenticação conforme a fonte de dados atual.
export function getAuthAdapter() {
  const dataSource = getDataSource();

  if (dataSource === "mock") {
    return mockAuthAdapter;
  }

  return supabaseAuthAdapter;
}

// Retorna o adapter de perfil conforme a fonte de dados atual.
export function getProfileAdapter() {
  const dataSource = getDataSource();

  if (dataSource === "mock") {
    return mockProfileAdapter;
  }

  return supabaseProfileAdapter;
}

// Retorna o adapter de gênero conforme a fonte de dados atual.
export function getGenreAdapter() {
  const dataSource = getDataSource();

  if (dataSource === "mock") {
    return mockGenreAdapter;
  }

  return supabaseGenreAdapter;
}

// Retorna o adapter de livros conforme a fonte de dados atual.
export function getBookAdapter() {
  const dataSource = getDataSource();

  if (dataSource === "mock") {
    return mockBookAdapter;
  }

  return supabaseBookAdapter;
}

// Retorna o adapter de capítulos conforme a fonte de dados atual.
export function getChapterAdapter() {
  const dataSource = getDataSource();

  if (dataSource === "mock") {
    return mockChapterAdapter;
  }

  return supabaseChapterAdapter;
}

// Retorna o adapter de favoritos conforme a fonte de dados atual.
export function getFavoriteAdapter() {
  const dataSource = getDataSource();

  if (dataSource === "mock") {
    return mockFavoriteAdapter;
  }

  return supabaseFavoriteAdapter;
}