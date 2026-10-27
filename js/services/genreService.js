/**
 * Consulta o vocabulário de gêneros pelo adapter ativo.
 * As páginas recebem id numérico, name e slug; este service não altera o catálogo de gêneros.
 */
import { getGenreAdapter } from "./dataSource.js";

/**
 * Lista os gêneros ordenados por nome.
 * @returns {Promise<{data: object[]|null, error: object|null}>} Catálogo de gêneros.
 */
export async function getGenres() {
  return getGenreAdapter().getGenres();
}

/**
 * Busca um gênero por identificador numérico positivo.
 * @param {number} id - Inteiro positivo, sem conversão implícita de string.
 * @returns {Promise<{data: object|null, error: object|null}>} Gênero ou erro.
 */
export async function getGenreById(id) {
  return getGenreAdapter().getGenreById(id);
}

/**
 * Busca um gênero após remover espaços nas pontas e converter o slug para minúsculas.
 * @param {string} slug - Slug do gênero.
 * @returns {Promise<{data: object|null, error: object|null}>} Gênero ou erro.
 */
export async function getGenreBySlug(slug) {
  return getGenreAdapter().getGenreBySlug(slug);
}