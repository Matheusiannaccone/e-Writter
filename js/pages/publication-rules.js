/**
 * Calcula mensagens de impedimento para as ações de publicação no ateliê.
 * As funções não persistem dados nem concedem autorização; adapters e banco validam a operação.
 */
/**
 * Calcula impedimentos locais a partir do título e do comprimento bruto do conteúdo.
 * @param {object|null} chapter - Dados persistidos do capítulo.
 * @returns {string[]} Motivos para bloquear a publicação; vazio indica ausência destes impedimentos.
 */
export function chapterBlockers(chapter) {
  const reasons = [];
  if (!chapter?.title?.trim()) reasons.push('Adicione um título ao capítulo.');
  const length = chapter?.content?.length ?? 0;
  if (length < 500 || length > 15000) reasons.push(`O conteúdo precisa ter de 500 a 15.000 caracteres (atual: ${length}).`);
  return reasons;
}

/**
 * Calcula os requisitos locais da obra, incluindo ao menos um capítulo publicado.
 * @param {object|null} book - Obra com gêneros normalizados.
 * @param {object[]} chapters - Capítulos já consultados para a obra.
 * @returns {string[]} Mensagens para a interface; não verifica autoria ou sessão.
 */
export function bookBlockers(book, chapters) {
  const reasons = [];
  if (!book?.title?.trim()) reasons.push('Adicione um título à obra.');
  if (!book?.description?.trim()) reasons.push('Adicione uma descrição à obra.');
  const count = book?.genres?.length ?? 0;
  if (count < 1 || count > 3) reasons.push('Selecione de 1 a 3 gêneros.');
  if (!chapters.some((chapter) => chapter.status === 'published')) reasons.push('Publique pelo menos um capítulo.');
  return reasons;
}
