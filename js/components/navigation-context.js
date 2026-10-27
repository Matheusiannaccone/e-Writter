/**
 * Monta URLs para o catálogo e a navegação compartilhada preservando datasource.
 * withDataSource mantém a extensão informada no destino; apenas editor-navigation
 * possui tratamento específico para os caminhos sem extensão dos editores.
 */
/**
 * Resolve o destino e copia o primeiro datasource atual quando for mock ou supabase.
 * @param {string} path - Caminho relativo ou URL de destino.
 * @returns {URL} URL com o caminho informado, sem reescrever a extensão.
 */
export function withDataSource(path) {
  const current = new URL(window.location.href);
  const url = new URL(path, current);

  const source = new URLSearchParams(
    window.location.search
  ).get("datasource");

  if (source === "mock" || source === "supabase") {
    url.searchParams.set("datasource", source);
  }

  return url;
}

/**
 * Propaga a fonte da página aos links fornecidos.
 * @param {Iterable<HTMLAnchorElement>} links - Links cujos href serão atualizados.
 * @returns {void} Atualiza os elementos no próprio documento.
 */
export function preserveDataSource(links) {
  for (const link of links) link.href = withDataSource(link.getAttribute("href")).href;
}

/**
 * Monta o link público de detalhes com o identificador no parâmetro id.
 * @param {string} bookId - Identificador da obra.
 * @returns {URL} Destino de detalhes com datasource preservado.
 */
export function bookDetailsUrl(bookId) {
  const url = withDataSource("./detalhes-obra.html");
  url.searchParams.set("id", bookId);
  return url;
}

/**
 * Propaga o contexto de obra usado pela navegação global, além de datasource.
 * @param {string} path - Destino do cabeçalho.
 * @returns {URL} Destino com bookId quando houver uma seleção atual não vazia.
 */
export function withHeaderContext(path) {
  const url = withDataSource(path);
  const current = new URL(window.location.href);
  const bookId = current.searchParams.get('bookId') || current.searchParams.get('book');
  if (bookId) url.searchParams.set('bookId', bookId);
  return url;
}
