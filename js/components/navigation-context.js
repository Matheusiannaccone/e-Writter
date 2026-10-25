// Acompanha o formato da rota atual: alguns servidores redirecionam .html
// para rotas limpas descartando a query. Não passar por esse redirect preserva IDs.
export function withDataSource(path) {
  const current = new URL(window.location.href);
  const url = new URL(path, current);
  if (url.origin === current.origin && (current.pathname === "/" || /\/[^/.]+\/?$/.test(current.pathname))) {
    url.pathname = url.pathname.replace(/\.html$/, "");
  }
  const source = new URLSearchParams(window.location.search).get("datasource");
  if (source === "mock" || source === "supabase") url.searchParams.set("datasource", source);
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
