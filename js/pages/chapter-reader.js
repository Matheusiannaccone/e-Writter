import { getBookById } from "../services/bookService.js";
import { getChapterById, getChaptersByBook } from "../services/chapterService.js";

const state = document.querySelector("#reader-state");
const chapterElement = document.querySelector("#chapter");
const navigation = document.querySelector("#chapter-navigation");

function showState(title, message, { error = false, retry = false } = {}) {
  chapterElement.hidden = true;
  navigation.hidden = true;
  state.hidden = false;
  state.classList.toggle("error", error);
  state.replaceChildren();

  const heading = document.createElement("h1");
  heading.textContent = title;
  const description = document.createElement("p");
  description.textContent = message;
  state.append(heading, description);

  if (retry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "retry-button";
    button.textContent = "Tentar novamente";
    button.addEventListener("click", loadChapter);
    state.append(button);
  }
}

function renderContent(content) {
  const container = document.querySelector("#chapter-content");
  container.replaceChildren();
  // Parágrafos preservam quebras simples; nenhum conteúdo vira HTML.
  for (const part of content.split(/\r?\n\s*\r?\n/)) {
    if (!part.trim()) continue;
    const paragraph = document.createElement("p");
    paragraph.textContent = part.trim();
    container.append(paragraph);
  }
}

function chapterUrl(id) {
  const url = new URL("./chapter.html", window.location.href);
  url.searchParams.set("id", id);
  const dataSource = new URLSearchParams(window.location.search).get("datasource");
  if (dataSource === "supabase") url.searchParams.set("datasource", "supabase");
  return url.href;
}

function setNeighbor(linkId, titleId, chapter) {
  const link = document.getElementById(linkId);
  link.hidden = !chapter;
  if (!chapter) return;
  link.href = chapterUrl(chapter.id);
  document.getElementById(titleId).textContent = chapter.title;
}

async function loadChapter() {
  showState("Preparando sua leitura", "Carregando o capítulo…");
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    showState("Capítulo indisponível", "O endereço não contém um capítulo para leitura.");
    return;
  }

  try {
    const chapterResult = await getChapterById(id);
    if (chapterResult.error || !chapterResult.data) {
      showServiceError(chapterResult.error);
      return;
    }

    const chapter = chapterResult.data;
    const [bookResult, listResult] = await Promise.all([
      getBookById(chapter.bookId),
      getChaptersByBook(chapter.bookId)
    ]);
    if (bookResult.error || listResult.error) {
      showServiceError(bookResult.error || listResult.error);
      return;
    }

    const book = bookResult.data;
    if (!book || book.status !== "published" || chapter.status !== "published" || typeof chapter.content !== "string" || !chapter.content.trim()) {
      showState("Capítulo indisponível", "Este conteúdo ainda não está disponível para leitura.");
      return;
    }

    const chapters = (listResult.data || [])
      .filter((item) => item.status === "published")
      .sort((a, b) => a.position - b.position);
    const index = chapters.findIndex((item) => item.id === chapter.id);
    if (index < 0) {
      showState("Capítulo indisponível", "Este conteúdo ainda não está disponível para leitura.");
      return;
    }

    document.getElementById("book-title").textContent = book.title;
    document.getElementById("chapter-title").textContent = chapter.title;
    document.getElementById("chapter-position").textContent = `Capítulo ${chapter.position}`;
    document.title = `${chapter.title} · ${book.title} · e-Writter`;
    renderContent(chapter.content);
    setNeighbor("previous-chapter", "previous-title", chapters[index - 1]);
    setNeighbor("next-chapter", "next-title", chapters[index + 1]);
    navigation.hidden = chapters.length <= 1;
    chapterElement.hidden = false;
    state.hidden = true;
  } catch {
    showState("Não foi possível carregar", "Verifique sua conexão e tente novamente.", { error: true, retry: true });
  }
}

function showServiceError(error) {
  if (error?.code === "NOT_FOUND" || error?.code === "VALIDATION_ERROR" || error?.code === "FORBIDDEN") {
    showState("Capítulo indisponível", "Este capítulo não foi encontrado ou não está disponível para leitura.");
  } else {
    showState("Não foi possível carregar", "Ocorreu um erro ao buscar o capítulo.", { error: true, retry: true });
  }
}

loadChapter();
