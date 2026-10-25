// Preserva apenas a seleção explícita de fonte nos links da navegação.
export function withDataSource(path) {
  const url = new URL(path, window.location.href);
  const source = new URLSearchParams(window.location.search).get("datasource");
  if (source === "mock" || source === "supabase") url.searchParams.set("datasource", source);
  return url;
}

export function preserveDataSource(links) {
  for (const link of links) link.href = withDataSource(link.getAttribute("href")).href;
}
