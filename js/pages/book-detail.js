const state = document.querySelector("#book-state");
const content = document.querySelector("#book-content");
const retry = document.querySelector("#book-retry");

function showState(message, canRetry = false) {
  state.textContent = message;
  state.hidden = !message;
  content.hidden = !!message;
  retry.hidden = !canRetry;
}

async function loadBook() {
  showState("Carregando obra…");
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return showState("Obra não encontrada.");
  try {
    const [{ getBookById }, { getChaptersByBook }, { getProfile }] = await Promise.all([
      import("../services/bookService.js"),
      import("../services/chapterService.js"),
      import("../services/profileService.js")
    ]);
    const [bookResult, chaptersResult] = await Promise.all([getBookById(id), getChaptersByBook(id)]);
    if (bookResult.error?.code === "NOT_FOUND" || bookResult.error?.code === "VALIDATION_ERROR") return showState("Obra não encontrada.");
    if (bookResult.error || chaptersResult.error) throw bookResult.error || chaptersResult.error;
    const book = bookResult.data;
    if (!book || book.status !== "published") return showState("Obra não encontrada.");
    document.title = `${book.title} · e-Writter`;
    document.querySelector("#book-title").textContent = book.title;
    document.querySelector("#book-description").textContent = book.description || "Sem descrição disponível.";
    document.querySelector("#book-genres").textContent = (book.genres || []).map((genre) => typeof genre === "string" ? genre : genre.name).filter(Boolean).join(" · ");
    let author = "Autor não informado";
    if (book.authorId) {
      try {
        const result = await getProfile(book.authorId);
        author = result.data?.displayName || result.data?.username || author;
      } catch { /* Perfil opcional para leitura pública. */ }
    }
    document.querySelector("#book-author").textContent = author;
    const list = document.querySelector("#book-chapters");
    list.replaceChildren();
    const chapters = (chaptersResult.data || []).filter((chapter) => chapter.status === "published").sort((a, b) => a.position - b.position);
    for (const chapter of chapters) {
      const url = new URL("./chapter.html", window.location.href);
      url.searchParams.set("id", chapter.id);
      if (new URLSearchParams(window.location.search).get("datasource") === "supabase") url.searchParams.set("datasource", "supabase");
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = url.href;
      link.textContent = chapter.title;
      item.append(link);
      list.append(item);
    }
    if (!chapters.length) {
      const item = document.createElement("li");
      item.textContent = "Nenhum capítulo disponível para leitura.";
      list.append(item);
    }
    showState("");
  } catch {
    showState("Não foi possível carregar esta obra agora.", true);
  }
}

retry.addEventListener("click", loadBook);
loadBook();
