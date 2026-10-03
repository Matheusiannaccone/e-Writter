// Service responsável pelas operações de capítulos.

import { getChapterAdapter } from "./dataSource.js";

// Retorna os capítulos visíveis de um livro.
export async function getChaptersByBook(bookId) {
  return getChapterAdapter().getChaptersByBook(bookId);
}

// Busca um capítulo pelo ID.
export async function getChapterById(id) {
  return getChapterAdapter().getChapterById(id);
}

// Cria um novo capítulo no final do livro.
export async function createChapter(bookId, data) {
  return getChapterAdapter().createChapter(
    bookId,
    data
  );
}

// Atualiza os dados de um capítulo.
export async function updateChapter(id, data) {
  return getChapterAdapter().updateChapter(
    id,
    data
  );
}

// Publica um capítulo.
export async function publishChapter(id) {
  return getChapterAdapter().publishChapter(id);
}

// Exclui um capítulo e os posteriores.
export async function deleteChapter(id) {
  return getChapterAdapter().deleteChapter(id);
}