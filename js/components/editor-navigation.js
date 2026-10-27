/**
 * Centraliza os parâmetros dos links entre os dois editores.
 * A seleção de uma obra continua sujeita à consulta das obras próprias na página de destino.
 */
/**
 * Lê o ID solicitado, priorizando bookId mesmo se estiver vazio.
 * @returns {string|null} ID canônico ou valor do parâmetro legado book.
 */
export function getRequestedBookId() {
  const params = new URL(window.location.href).searchParams;
  // Compatibilidade com links antigos do ateliê; bookId é o parâmetro canônico.
  return params.has('bookId') ? params.get('bookId') : params.get('book');
}

/**
 * Monta o destino com a query atual, substituindo a seleção por bookId.
 * @param {string} target - Caminho relativo ou URL de destino.
 * @param {string|null} [bookId] - Obra selecionada; vazio remove os IDs da query.
 * @returns {URL} Destino com fonte preservada e formato de rota compatível com o editor atual.
 */
export function editorUrl(target, bookId = getRequestedBookId()) {
  const current = new URL(window.location.href);
  // Servidores com clean URLs podem redirecionar .html descartando a query.
  // Se a página já está sem extensão, navegue diretamente no mesmo formato.
  const cleanEditorPath = /\/(?:book-editor|chapter-editor)\/?$/.test(current.pathname);
  const base = new URL(current);
  if (cleanEditorPath) base.pathname = base.pathname.replace(/\/$/, '');
  const url = new URL(target, base);
  if (cleanEditorPath) {
    url.pathname = url.pathname.replace(/\/(book-editor|chapter-editor)\.html$/, '/$1');
  }
  url.search = current.search;
  // getDataSource usa o primeiro valor. Mantê-lo também em queries duplicadas
  // impede que a navegação troque a fonte de dados efetivamente em uso.
  if (current.searchParams.has('datasource')) {
    url.searchParams.set('datasource', current.searchParams.get('datasource'));
  }
  url.searchParams.delete('book');
  if (bookId) url.searchParams.set('bookId', bookId);
  else url.searchParams.delete('bookId');
  return url;
}

/**
 * Atualiza os links de retorno/ateliê marcados no documento.
 * @param {string|null} [bookId] - Seleção a propagar; undefined usa a URL atual.
 * @returns {void} Altera os href dos links encontrados.
 */
export function syncEditorLinks(bookId) {
  document.querySelectorAll('[data-editor-link]').forEach((link) => {
    link.href = editorUrl('./book-editor.html', bookId).href;
  });
}
