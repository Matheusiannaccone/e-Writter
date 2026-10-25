import { getBookById } from "../services/bookService.js";
import {
  getChapterById,
  getChaptersByBook
} from "../services/chapterService.js";
import { getProfile } from "../services/profileService.js";

const elements = {
  statusPanel: document.querySelector("#reader-status-panel"),
  statusMessage: document.querySelector("#reader-status-message"),
  content: document.querySelector("#reader-content"),

  backLink: document.querySelector("#reader-back-link"),
  chaptersLink: document.querySelector("#reader-chapters-link"),

  bookTitle: document.querySelector("#reader-book-title"),
  author: document.querySelector("#reader-author"),

  chapterNumber: document.querySelector("#reader-chapter-number"),
  chapterTitle: document.querySelector("#reader-chapter-title"),
  chapterText: document.querySelector("#reader-chapter-text"),

  previousButton: document.querySelector("#reader-previous"),
  nextButton: document.querySelector("#reader-next"),

  progressText: document.querySelector("#reader-progress-text"),
  progressBar: document.querySelector("#reader-progress-bar"),
  progressFill: document.querySelector("#reader-progress-fill"),

  feedback: document.querySelector("#reader-navigation-feedback")
};

const params = new URLSearchParams(window.location.search);

const bookId = params.get("bookId");
const chapterId = params.get("chapterId");

let currentBook = null;
let publishedChapters = [];
let currentChapterIndex = -1;

// ----------------------------------------
// Mensagens de estado
// ----------------------------------------

function showStatus(message, isError = false) {
  elements.statusPanel.hidden = false;
  elements.statusPanel.classList.toggle("is-error", isError);
  elements.statusMessage.textContent = message;

  elements.content.hidden = true;
}

function hideStatus() {
  elements.statusPanel.hidden = true;
  elements.statusPanel.classList.remove("is-error");
}

function showNavigationFeedback(message = "") {
  elements.feedback.textContent = message;
}

// ----------------------------------------
// Segurança e conteúdo
// ----------------------------------------

// Cria parágrafos usando texto simples.
// Nenhum conteúdo do capítulo é interpretado como HTML.
function renderChapterText(content) {
  elements.chapterText.replaceChildren();

  const normalizedContent = String(content ?? "").replace(/\r\n?/g, "\n");

  if (!normalizedContent.trim()) {
    const paragraph = document.createElement("p");

    paragraph.className = "reader-paragraph";
    paragraph.textContent = "Este capítulo não possui conteúdo.";

    elements.chapterText.appendChild(paragraph);
    return;
  }

  const paragraphs = normalizedContent
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  paragraphs.forEach((text) => {
    const paragraph = document.createElement("p");

    paragraph.className = "reader-paragraph";
    paragraph.textContent = text;

    elements.chapterText.appendChild(paragraph);
  });
}

// ----------------------------------------
// Progresso e navegação
// ----------------------------------------

function updateProgress() {
  const total = publishedChapters.length;
  const current = currentChapterIndex + 1;

  if (total <= 0 || currentChapterIndex < 0) {
    elements.progressText.textContent = "Sem capítulos";
    elements.progressFill.style.width = "0%";
    elements.progressBar.setAttribute("aria-valuenow", "0");
    return;
  }

  const percentage = Math.round((current / total) * 100);

  elements.progressText.textContent =
    `Capítulo ${current} de ${total}`;

  elements.progressFill.style.width = `${percentage}%`;

  elements.progressBar.setAttribute(
    "aria-valuenow",
    String(percentage)
  );
}

function updateNavigation() {
  const hasPrevious = currentChapterIndex > 0;
  const hasNext =
    currentChapterIndex >= 0 &&
    currentChapterIndex < publishedChapters.length - 1;

  elements.previousButton.disabled = !hasPrevious;
  elements.nextButton.disabled = !hasNext;

  updateProgress();
}

function navigateToChapter(chapter) {
  if (!chapter || chapter.status !== "published") {
    showNavigationFeedback(
      "Este capítulo não está disponível para leitura."
    );
    return;
  }

  const destination =
    `leitor.html?bookId=${encodeURIComponent(currentBook.id)}` +
    `&chapterId=${encodeURIComponent(chapter.id)}`;

  window.location.href = destination;
}

// ----------------------------------------
// Exibição da obra e do capítulo
// ----------------------------------------

function renderChapter(chapter) {
  elements.chapterNumber.textContent =
    `CAPÍTULO ${chapter.position ?? currentChapterIndex + 1}`;

  elements.chapterTitle.textContent =
    chapter.title || "Capítulo sem título";

  renderChapterText(chapter.content);

  document.title =
    `${chapter.title || "Leitura"} | ${currentBook.title} | E-writter`;

  updateNavigation();
  showNavigationFeedback("");

  // Volta ao início do texto quando o capítulo muda.
  window.scrollTo({
    top: 0,
    behavior: "auto"
  });
}

async function renderBookHeading(book) {
  elements.bookTitle.textContent = book.title || "Obra sem título";

  elements.backLink.href =
    `detalhes-obra.html?id=${encodeURIComponent(book.id)}`;

  elements.chaptersLink.href =
    `detalhes-obra.html?id=${encodeURIComponent(book.id)}#capitulos`;

  try {
    const authorResult = await getProfile(book.authorId);

    if (!authorResult.error && authorResult.data) {
      elements.author.textContent =
        authorResult.data.displayName ||
        authorResult.data.username ||
        "Autor não informado";
    } else {
      elements.author.textContent = "Autor não informado";
    }
  } catch (error) {
    console.error("Erro ao carregar o autor:", error);
    elements.author.textContent = "Autor não informado";
  }
}

// ----------------------------------------
// Carregamento principal
// ----------------------------------------

async function loadReader() {
  if (!bookId || !chapterId) {
    showStatus(
      "Não foi possível abrir a leitura. O endereço não informa a obra e o capítulo.",
      true
    );
    return;
  }

  showStatus("Abrindo o livro e preparando a leitura...");

  try {
    // 1. Busca a obra.
    const bookResult = await getBookById(bookId);

    if (bookResult.error || !bookResult.data) {
      showStatus(
        "Esta obra não existe ou não está disponível para leitura.",
        true
      );
      return;
    }

    currentBook = bookResult.data;

    // 2. A leitura pública exige uma obra publicada.
    if (currentBook.status !== "published") {
      showStatus(
        "Esta obra ainda não foi publicada e não está disponível para leitura.",
        true
      );
      return;
    }

    // 3. Busca o capítulo solicitado.
    const chapterResult = await getChapterById(chapterId);

    if (chapterResult.error || !chapterResult.data) {
      showStatus(
        "Este capítulo não existe ou não está disponível para leitura.",
        true
      );
      return;
    }

    const requestedChapter = chapterResult.data;

    // 4. Confere se o capítulo pertence à obra informada na URL.
    if (requestedChapter.bookId !== currentBook.id) {
      showStatus(
        "O capítulo informado não pertence a esta obra.",
        true
      );
      return;
    }

    // 5. Não permite abrir diretamente capítulos em rascunho.
    if (requestedChapter.status !== "published") {
      showStatus(
        "Este capítulo ainda não foi publicado e não está disponível para leitura.",
        true
      );
      return;
    }

    // 6. Busca a lista ordenada e filtra apenas capítulos publicados.
    const chaptersResult = await getChaptersByBook(currentBook.id);

    if (chaptersResult.error) {
      showStatus(
        chaptersResult.error.message ||
        "Não foi possível carregar a sequência de capítulos.",
        true
      );
      return;
    }

    publishedChapters = (chaptersResult.data ?? [])
      .filter((chapter) => chapter.status === "published")
      .sort((a, b) => a.position - b.position);

    // 7. Confere se o capítulo solicitado está na sequência disponível.
    currentChapterIndex = publishedChapters.findIndex(
      (chapter) => chapter.id === requestedChapter.id
    );

    if (currentChapterIndex === -1) {
      showStatus(
        "Este capítulo não faz parte da sequência de leitura disponível.",
        true
      );
      return;
    }

    const chapter = publishedChapters[currentChapterIndex];

    // 8. Exibe a obra e o capítulo.
    await renderBookHeading(currentBook);

    renderChapter(chapter);

    hideStatus();
    elements.content.hidden = false;

  } catch (error) {
    console.error("Erro ao abrir o leitor:", error);

    showStatus(
      "Ocorreu um erro ao abrir o capítulo. Tente novamente.",
      true
    );
  }
}

// ----------------------------------------
// Eventos dos botões
// ----------------------------------------

elements.previousButton.addEventListener("click", () => {
  if (currentChapterIndex <= 0) {
    return;
  }

  const previousChapter =
    publishedChapters[currentChapterIndex - 1];

  navigateToChapter(previousChapter);
});

elements.nextButton.addEventListener("click", () => {
  if (currentChapterIndex < 0) {
    return;
  }

  if (currentChapterIndex >= publishedChapters.length - 1) {
    showNavigationFeedback(
      "Você chegou ao último capítulo publicado desta obra."
    );
    return;
  }

  const nextChapter =
    publishedChapters[currentChapterIndex + 1];

  navigateToChapter(nextChapter);
});

// Inicializa a página.
loadReader();