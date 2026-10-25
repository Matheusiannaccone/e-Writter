// Contexto de navegação dos editores. Não seleciona datasource nem autoriza obras.
export function getRequestedBookId() {
  const params = new URL(window.location.href).searchParams;
  // Compatibilidade com links antigos do ateliê; bookId é o parâmetro canônico.
  return params.has('bookId') ? params.get('bookId') : params.get('book');
}

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

export function syncEditorLinks(bookId) {
  document.querySelectorAll('[data-editor-link]').forEach((link) => {
    link.href = editorUrl('./book-editor.html', bookId).href;
  });
}
