const grid = document.querySelector("#home-books-grid");
const state = document.querySelector("#home-books-state");

async function cardForBook(book, { createBookCard, getChaptersByBook, getProfile }) {
  const chaptersResult = await getChaptersByBook(book.id);
  if (chaptersResult.error) return null;

  const firstChapter = (chaptersResult.data || [])
    .filter((chapter) => chapter.status === "published")
    .sort((a, b) => a.position - b.position)[0];
  if (!firstChapter) return null;

  const profileResult = await getProfile(book.authorId);
  const author = profileResult.data?.displayName || profileResult.data?.username || "Autor não informado";
  const href = new URL("./chapter.html", window.location.href);
  href.searchParams.set("id", firstChapter.id);

  return createBookCard(book, {
    href: href.href,
    author,
    genres: book.genres,
    metadata: book.publicationStatus === "completed" ? "Concluído" : "Em andamento"
  });
}

async function loadBooks() {
  try {
    const [cardModule, booksModule, chaptersModule, profilesModule] = await Promise.all([
      import("../components/book-card.js"),
      import("../services/bookService.js"),
      import("../services/chapterService.js"),
      import("../services/profileService.js")
    ]);
    const services = { ...cardModule, ...chaptersModule, ...profilesModule };
    const { getBooks } = booksModule;
    const result = await getBooks();
    if (result.error) throw result.error;
    const cards = await Promise.all((result.data || []).map((book) => cardForBook(book, services)));
    const available = cards.filter(Boolean);
    grid.replaceChildren(...available);
    state.textContent = available.length ? "" : "Ainda não há livros disponíveis para leitura.";
    state.hidden = available.length > 0;
  } catch {
    state.textContent = "Não foi possível carregar os livros agora.";
  }
}

if (grid && state) loadBooks();
