// Acompanha o formato da rota atual: alguns servidores redirecionam .html
// para rotas limpas descartando a query. Não passar por esse redirect preserva IDs.
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

export function preserveDataSource(links) {
  for (const link of links) link.href = withDataSource(link.getAttribute("href")).href;
}

export function bookDetailsUrl(bookId) {
  const url = withDataSource("./detalhes-obra.html");
  url.searchParams.set("id", bookId);
  return url;
}

// Somente a navegação global carrega o contexto da obra entre páginas.
export function withHeaderContext(path) {
  const url = withDataSource(path);
  const current = new URL(window.location.href);
  const bookId = current.searchParams.get('bookId') || current.searchParams.get('book');
  if (bookId) url.searchParams.set('bookId', bookId);
  return url;
}
