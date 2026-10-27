/**
 * Contrato de capítulos usado pelo editor, pelo ateliê e pelo leitor.
 * Os adapters definem visibilidade e mutações; o Supabase também aplica triggers e RLS.
 */
import { getChapterAdapter } from "./dataSource.js";

/**
 * Lista os capítulos visíveis em ordem crescente de position.
 * @param {string} bookId - UUID da obra.
 * @returns {Promise<{data: object[]|null, error: object|null}>} Lista, inclusive vazia, ou erro.
 */
export async function getChaptersByBook(bookId) {
  return getChapterAdapter().getChaptersByBook(bookId);
}

/**
 * Busca um capítulo respeitando a visibilidade da obra e do capítulo.
 * @param {string} id - UUID do capítulo.
 * @returns {Promise<{data: object|null, error: object|null}>} Capítulo ou erro.
 */
export async function getChapterById(id) {
  return getChapterAdapter().getChapterById(id);
}

/**
 * Acrescenta um rascunho ao final de uma obra própria; a posição é atribuída pelo adapter/banco.
 * @param {string} bookId - UUID da obra.
 * @param {{title?: string|null, content?: string|null}} data - Texto inicial, que pode estar incompleto no adapter.
 * @returns {Promise<{data: object|null, error: object|null}>} Capítulo criado ou erro.
 */
export async function createChapter(bookId, data) {
  return getChapterAdapter().createChapter(
    bookId,
    data
  );
}

/**
 * Atualiza apenas título e conteúdo, preservando posição e vínculo com a obra.
 * @param {string} id - UUID do capítulo.
 * @param {{title?: string|null, content?: string|null}} data - Campos a atualizar.
 * @returns {Promise<{data: object|null, error: object|null}>} Capítulo atualizado ou erro.
 */
export async function updateChapter(id, data) {
  return getChapterAdapter().updateChapter(
    id,
    data
  );
}

/**
 * Publica o capítulo próprio com título e conteúdo de 500 a 15.000 caracteres.
 * @param {string} id - UUID do capítulo.
 * @returns {Promise<{data: object|null, error: object|null}>} Capítulo publicado ou erro.
 */
export async function publishChapter(id) {
  return getChapterAdapter().publishChapter(id);
}

/**
 * Exclui o capítulo próprio selecionado e todos os posteriores por posição.
 * @param {string} id - UUID do início da exclusão.
 * @returns {Promise<{data: {id: string, deletedIds: string[]}|null, error: object|null}>} IDs previstos para a exclusão ou erro.
 */
export async function deleteChapter(id) {
  return getChapterAdapter().deleteChapter(id);
}
/**
 * Solicita despublicação. No Supabase, a RPC inclui a cauda publicada e pode despublicar a obra;
 * no Mock, altera somente o capítulo e impede retirar o último de uma obra publicada.
 * @param {string} id - UUID do capítulo.
 * @returns {Promise<{data: object|null, error: object|null}>} Capítulo após a operação ou erro.
 */
export async function unpublishChapter(id) {
  return getChapterAdapter().unpublishChapter(id);
}
