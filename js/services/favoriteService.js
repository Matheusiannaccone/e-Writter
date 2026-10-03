// Service responsável pelas operações de favoritos.

import { getFavoriteAdapter } from "./dataSource.js";

// Retorna os favoritos do usuário autenticado.
export async function listFavorites() {
  return getFavoriteAdapter().listFavorites();
}

// Verifica se um livro está favoritado.
export async function isFavorite(bookId) {
  return getFavoriteAdapter().isFavorite(bookId);
}

// Adiciona um livro aos favoritos.
export async function addFavorite(bookId) {
  return getFavoriteAdapter().addFavorite(bookId);
}

// Remove um livro dos favoritos.
export async function removeFavorite(bookId) {
  return getFavoriteAdapter().removeFavorite(bookId);
}