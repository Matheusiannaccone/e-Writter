/**
 * Abstrai envio, remoção e resolução de capas, além das operações de avatar dos adapters.
 * Caminhos lógicos persistidos não são URLs; a exibição de capas usa getBookCoverUrl.
 */
import { getImageAdapter } from "./dataSource.js";

/**
 * Envia/substitui o avatar da conta; o Mock apenas altera o caminho no fixture em memória.
 * @param {Blob} file - Imagem JPEG, PNG ou WebP de até 2 MiB.
 * @returns {Promise<{data: {path: string}|null, error: object|null}>} Caminho lógico ou erro.
 */
export async function uploadAvatar(file) {
  return getImageAdapter().uploadAvatar(file);
}

/**
 * Remove o avatar da conta autenticada pelo adapter.
 * @returns {Promise<{data: {path: null}|null, error: object|null}>} Caminho limpo ou erro.
 */
export async function removeAvatar() {
  return getImageAdapter().removeAvatar();
}

/**
 * Salva a capa de uma obra própria. O Supabase converte para WebP; o Mock guarda o arquivo no IndexedDB.
 * @param {string} bookId - UUID da obra já persistida.
 * @param {Blob} file - Imagem JPEG, PNG ou WebP de até 5 MiB.
 * @returns {Promise<{data: {path: string}|null, error: object|null}>} Caminho lógico da capa ou erro.
 */
export async function uploadBookCover(bookId, file) {
  return getImageAdapter().uploadBookCover(bookId, file);
}

/**
 * Remove a capa e limpa a referência da obra pelo adapter.
 * @param {string} bookId - UUID da obra.
 * @returns {Promise<{data: {path: null}|null, error: object|null}>} Referência limpa ou erro.
 */
export async function removeBookCover(bookId) {
  return getImageAdapter().removeBookCover(bookId);
}
/**
 * Resolve uma capa persistida para exibição sem expor Storage/IndexedDB às páginas.
 * @param {string} path - Caminho lógico no formato covers/{UUID}/cover.webp.
 * @returns {Promise<{data: {url: string}|null, error: object|null}>} URL pública com versão ou URL blob temporária no Mock.
 */
export async function getBookCoverUrl(path) {
  return getImageAdapter().getBookCoverUrl(path);
}
