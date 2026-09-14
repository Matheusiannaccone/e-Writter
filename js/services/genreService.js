// Service responsável pelas operações de gêneros.

import { getGenreAdapter } from "./dataSource.js";

// Retorna todos os gêneros disponíveis.
export async function getGenres() {
  return getGenreAdapter().getGenres();
}

// Busca um gênero pelo ID.
export async function getGenreById(id) {
  return getGenreAdapter().getGenreById(id);
}

// Busca um gênero pelo slug.
export async function getGenreBySlug(slug) {
  return getGenreAdapter().getGenreBySlug(slug);
}