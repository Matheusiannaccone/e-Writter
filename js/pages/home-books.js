const grid = document.querySelector("#home-books-grid");
const state = document.querySelector("#home-books-state");

const retry = document.querySelector("#home-books-retry");

async function cardForBook(book, { createBookCard, getProfile }) {
  let author = "Autor não informado";
  if (book.authorId) {
    try {
      const profileResult = await getProfile(book.authorId);
      author = profileResult.data?.displayName || profileResult.data?.username || author;
    } catch { /* Perfil opcional para descoberta pública. */ }
  }
  const href = new URL("./book.html", window.location.href);
  href.searchParams.set("id", book.id);
  if (new URLSearchParams(window.location.search).get("datasource") === "supabase") href.searchParams.set("datasource", "supabase");

  return createBookCard(book, {
    href: href.href,
    author,
    genres: book.genres,
    metadata: book.publicationStatus === "completed" ? "Concluído" : "Em andamento"
  });
}

async function loadBooks() {
  grid.replaceChildren();
  state.textContent = "Carregando livros…";
  state.hidden = false;
  retry.hidden = true;
  try {
    const [cardModule, booksModule, profilesModule] = await Promise.all([
      import("../components/book-card.js"),
      import("../services/bookService.js"),
      import("../services/profileService.js")
    ]);
    const services = { ...cardModule, ...profilesModule };
    const { getBooks } = booksModule;
    const result = await getBooks();
    if (result.error) throw result.error;
    const books = (result.data || []).filter((book) => book.status === "published");
    const cards = await Promise.all(books.map((book) => cardForBook(book, services)));
    grid.replaceChildren(...cards);
    state.textContent = cards.length ? "" : "Ainda não há livros publicados. Volte em breve para descobrir novas histórias.";
    state.hidden = cards.length > 0;
  } catch {
    state.textContent = "Não foi possível carregar os livros agora.";
    retry.hidden = false;
  }
}

if (grid && state && retry) {
  retry.addEventListener("click", loadBooks);
  loadBooks();
}
