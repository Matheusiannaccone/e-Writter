import { getBookById } from "../services/bookService.js";
import { getChaptersByBook } from "../services/chapterService.js";
import { getProfile } from "../services/profileService.js";
import {
  isFavorite,
  addFavorite,
  removeFavorite
} from "../services/favoriteService.js";

const elements = {
  status: document.querySelector("#obra-status"),
  content: document.querySelector("#obra-content"),
  capa: document.querySelector("#obra-cover"),
  titulo: document.querySelector("#obra-title"),
  autor: document.querySelector("#obra-author"),
  generos: document.querySelector("#obra-tags"),
  statusPublicacao: document.querySelector("#obra-publication-status"),
  idioma: document.querySelector("#obra-language"),
  quantidadeCapitulos: document.querySelector("#obra-chapter-count"),
  sinopse: document.querySelector("#obra-description"),
  capitulosResumo: document.querySelector("#chapter-count-label"),
  capitulosLista: document.querySelector("#chapter-list"),
  btnComecar: document.querySelector("#start-reading"),
  btnFavorito: document.querySelector("#favorite-button"),
  favoritoFeedback: document.querySelector("#favorite-status")
};

const params = new URLSearchParams(window.location.search);
const bookId = params.get("id");

let currentBook = null;
let currentChapters = [];
let favoriteState = false;

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", isError);
  elements.status.hidden = false;
}

function formatLanguage(language) {
  const languages = {
    "pt-BR": "Português",
    "en-US": "Inglês",
    "es-ES": "Espanhol"
  };
  return languages[language] ?? language ?? "Não informado";
}

function formatPublicationStatus(status) {
  const statuses = {
    ongoing: "Em andamento",
    completed: "Concluída",
    discontinued: "Descontinuada"
  };
  return statuses[status] ?? status ?? "Não informado";
}

function showError(message) {
  elements.content.hidden = true;
  setStatus(message, true);
}

const renderCover = (book) => {
 elements.capa.replaceChildren();

  if (book.coverPath) {
    const image = document.createElement("img");

    image.src = book.coverPath;
    image.alt = `Capa de ${book.title}`;

    image.onerror = () => renderCoverPlaceholder(book.title);

    elements.capa.appendChild(image);
    return;
  }

  renderCoverPlaceholder(book.title);
}

function renderCoverPlaceholder(title) {
  elements.capa.replaceChildren();

  const coverTitle = document.createElement("span");
  coverTitle.className = "cover-title";
  coverTitle.textContent = title || "E-writter";

  const ornament = document.createElement("span");
  ornament.className = "cover-ornament";
  ornament.setAttribute("aria-hidden", "true");
  ornament.textContent = "✦";

  const small = document.createElement("span");
  small.className = "cover-small";
  small.textContent = "E-writter";

  elements.capa.append(small, coverTitle, ornament);
};

function renderCoverPlaceholder(title) {
  elements.capa.replaceChildren();
  const initial = document.createElement("span");
  initial.className = "capa-inicial";
  initial.textContent = (title?.trim()?.[0] ?? "E").toUpperCase();
  elements.capa.appendChild(initial);
}

function renderGenres(genres = []) {
  elements.generos.replaceChildren();

  if (!genres.length) {
    const tag = document.createElement("span");
    tag.className = "obra-tag";
    tag.textContent = "Sem gênero";
    elements.generos.appendChild(tag);
    return;
  }

  genres.forEach((genre) => {
    const tag = document.createElement("span");
    tag.className = "obra-tag";
    tag.textContent = genre.name;
    elements.generos.appendChild(tag);
  });
}

const renderChapters = (chapters = []) => {
  currentChapters = chapters;
  elements.capitulosLista.replaceChildren();
  elements.quantidadeCapitulos.textContent = String(chapters.length);
  elements.capitulosResumo.textContent = `${chapters.length} publicado${chapters.length === 1 ? "" : "s"}`;

  if (!chapters.length) {
    const empty = document.createElement("p");
    empty.className = "capitulos-vazio";
    empty.textContent = "Esta obra ainda não possui capítulos publicados.";
    elements.capitulosLista.appendChild(empty);
    elements.btnComecar.disabled = true;
    return;
  }

  if (!chapters.length) {
  const empty = document.createElement("p");

  empty.className = "capitulos-vazio";
  empty.textContent =
    "Esta obra ainda não possui capítulos publicados.";

  elements.capitulosLista.appendChild(empty);

  elements.btnComecar.setAttribute("aria-disabled", "true");
  elements.btnComecar.href = "#capitulos";

  return;
}

elements.btnComecar.removeAttribute("aria-disabled");
elements.btnComecar.href = "#capitulos";

  chapters.forEach((chapter, index) => {
    const item = document.createElement("article");
    item.className = "capitulo-item";

    const link = document.createElement("a");
    link.className = "capitulo-link";
    link.href = `leitor.html?bookId=${encodeURIComponent(currentBook.id)}&chapterId=${encodeURIComponent(chapter.id)}`;
    link.textContent = `Capítulo ${chapter.position ?? index + 1} — ${chapter.title}`;

    const info = document.createElement("span");
    info.className = "capitulo-info";
    info.textContent = "Publicado";

    item.append(link, info);
    elements.capitulosLista.appendChild(item);
  });
}

function renderBook(book, author) {
  elements.titulo.textContent = book.title;
  elements.autor.textContent = author?.displayName || author?.username || "Autor não informado";
  elements.sinopse.textContent = book.description || "Esta obra ainda não possui uma sinopse.";
  elements.statusPublicacao.textContent = formatPublicationStatus(book.publicationStatus);
  elements.idioma.textContent = formatLanguage(book.language);

  renderCover(book);
  renderGenres(book.genres ?? []);
  elements.content.hidden = false;
}

async function loadFavorite() {
  const result = await isFavorite(bookId);

  if (result.error) {
    if (result.error.code === "UNAUTHENTICATED") {
      favoriteState = false;
      elements.btnFavorito.disabled = false;
      elements.btnFavorito.textContent = "♡ Favoritar";
      return;
    }

    elements.favoritoFeedback.textContent = "Não foi possível verificar o favorito.";
    return;
  }

  favoriteState = Boolean(result.data);
  updateFavoriteButton();
}

function updateFavoriteButton() {
  elements.btnFavorito.setAttribute("aria-pressed", String(favoriteState));
  elements.btnFavorito.textContent = favoriteState ? "♥ Favoritado" : "♡ Favoritar";
}

async function toggleFavorite() {
  elements.btnFavorito.disabled = true;
  elements.favoritoFeedback.textContent = "";

  const result = favoriteState
    ? await removeFavorite(bookId)
    : await addFavorite(bookId);

  if (result.error) {
    elements.favoritoFeedback.textContent = result.error.code === "UNAUTHENTICATED"
      ? "Entre na sua conta para favoritar esta obra."
      : result.error.message;
    elements.btnFavorito.disabled = false;
    return;
  }

  favoriteState = !favoriteState;
  updateFavoriteButton();
  elements.favoritoFeedback.textContent = favoriteState
    ? "Obra adicionada aos favoritos."
    : "Obra removida dos favoritos.";
  elements.btnFavorito.disabled = false;
}

function startReading() {
  const firstChapter = currentChapters[0];
  if (!firstChapter || !currentBook) return;

  window.location.href = `leitor.html?bookId=${encodeURIComponent(currentBook.id)}&chapterId=${encodeURIComponent(firstChapter.id)}`;
}

async function loadPage() {
  if (!bookId) {
    showError("Não foi informado o ID da obra.");
    return;
  }

  setStatus("Carregando obra...");

  const bookResult = await getBookById(bookId);
  if (bookResult.error || !bookResult.data) {
    showError(bookResult.error?.message || "Não foi possível carregar a obra.");
    return;
  }

  currentBook = bookResult.data;

  const [authorResult, chaptersResult] = await Promise.all([
    getProfile(currentBook.authorId),
    getChaptersByBook(currentBook.id)
  ]);

  if (authorResult.error && authorResult.error.code !== "NOT_FOUND") {
    showError(authorResult.error.message || "Não foi possível carregar o autor.");
    return;
  }

  if (chaptersResult.error) {
    showError(chaptersResult.error.message || "Não foi possível carregar os capítulos.");
    return;
  }

  renderBook(currentBook, authorResult.data);
  renderChapters(chaptersResult.data ?? []);
  setStatus("");
  elements.status.hidden = true;

  await loadFavorite();
}

elements.btnFavorito.addEventListener("click", toggleFavorite);
elements.btnComecar.addEventListener("click", startReading);

loadPage().catch((error) => {
  console.error(error);
  showError("Ocorreu um erro inesperado ao carregar a obra.");
});
