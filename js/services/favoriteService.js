/**
 * Fachada da biblioteca pessoal: cada adapter associa favoritos à conta autenticada.
 * A listagem inclui o resumo da obra; consumidores precisam tratar relações indisponíveis.
 */
import { getFavoriteAdapter } from "./dataSource.js";

/**
 * Lista os favoritos da conta, do mais recente para o mais antigo.
 * @returns {Promise<{data: object[]|null, error: object|null}>} Registros com userId, bookId, createdAt e book.
 */
export async function listFavorites() {
  return getFavoriteAdapter().listFavorites();
}

/**
 * Consulta a existência da relação entre a conta atual e a obra.
 * @param {string} bookId - UUID da obra.
 * @returns {Promise<{data: boolean|null, error: object|null}>} true se a relação existe; null em erro.
 */
export async function isFavorite(bookId) {
  return getFavoriteAdapter().isFavorite(bookId);
}

/**
 * Adiciona uma obra publicada, recusando duplicidade.
 * @param {string} bookId - UUID da obra.
 * @returns {Promise<{data: object|null, error: object|null}>} Favorito criado ou erro, incluindo CONFLICT.
 */
export async function addFavorite(bookId) {
  return getFavoriteAdapter().addFavorite(bookId);
}

/**
 * Remove a relação da conta atual, inclusive quando a obra deixou de estar pública.
 * @param {string} bookId - UUID da obra.
 * @returns {Promise<{data: {bookId: string}|null, error: object|null}>} Obra removida da coleção ou erro.
 */
export async function removeFavorite(bookId) {
  return getFavoriteAdapter().removeFavorite(bookId);
}