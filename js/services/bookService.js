/**
 * Contrato de obras consumido pelo catálogo e pelas páginas de autoria.
 * Delega validação, autorização e persistência ao adapter ativo, preservando { data, error }.
 */
import { getBookAdapter } from "./dataSource.js";

/**
 * Lista obras publicadas do catálogo.
 * @returns {Promise<{data: object[]|null, error: object|null}>} Obras com gêneros normalizados.
 */
export async function getBooks() {
  return getBookAdapter().getBooks();
}

/**
 * Busca uma obra conforme a visibilidade permitida ao usuário atual.
 * @param {string} id - UUID da obra.
 * @returns {Promise<{data: object|null, error: object|null}>} Obra ou erro; rascunhos alheios não são expostos.
 */
export async function getBookById(id) {
  return getBookAdapter().getBookById(id);
}

/**
 * Lista obras publicadas e rascunhos da conta autenticada.
 * @returns {Promise<{data: object[]|null, error: object|null}>} Obras próprias ou erro de autenticação.
 */
export async function getMyBooks() {
  return getBookAdapter().getMyBooks();
}

/**
 * Lista somente obras publicadas de um autor.
 * @param {string} authorId - Identificador do autor validado pelo adapter.
 * @returns {Promise<{data: object[]|null, error: object|null}>} Obras públicas do autor.
 */
export async function getBooksByAuthor(authorId) {
  return getBookAdapter().getBooksByAuthor(authorId);
}

/**
 * Cria uma obra em rascunho com título e de um a três gêneros.
 * @param {{title: string, description?: string|null, genreIds: number[]}} data - Dados iniciais.
 * @returns {Promise<{data: object|null, error: object|null}>} Obra criada ou erro de validação/persistência.
 */
export async function createBook(data) {
  return getBookAdapter().createBook(data);
}

/**
 * Atualiza os campos aceitos pelo adapter; publicação possui operações próprias.
 * @param {string} id - UUID da obra.
 * @param {{title?: string, description?: string|null, coverPath?: string|null, publicationStatus?: string, language?: string, genreIds?: number[]}} data - Campos a atualizar.
 * @returns {Promise<{data: object|null, error: object|null}>} Obra atualizada ou erro.
 */
export async function updateBook(id, data) {
  return getBookAdapter().updateBook(id, data);
}

/**
 * Publica a obra própria conforme os requisitos de descrição, gêneros e capítulos.
 * @param {string} id - UUID da obra.
 * @returns {Promise<{data: object|null, error: object|null}>} Obra publicada ou erro.
 */
export async function publishBook(id) {
  return getBookAdapter().publishBook(id);
}

/**
 * Exclui uma obra própria e suas relações de capítulos e gêneros.
 * @param {string} id - UUID da obra.
 * @returns {Promise<{data: {id: string}|null, error: object|null}>} Identificador removido ou erro.
 */
export async function deleteBook(id) {
  return getBookAdapter().deleteBook(id);
}
/**
 * Retorna uma obra própria a rascunho, retirando-a do catálogo público.
 * @param {string} id - UUID da obra.
 * @returns {Promise<{data: object|null, error: object|null}>} Obra após despublicação ou erro.
 */
export async function unpublishBook(id) {
  return getBookAdapter().unpublishBook(id);
}
