import { getBookCoverUrl } from "../services/imageService.js";
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


function renderCoverPlaceholder(title) {
  elements.capa.replaceChildren();

  const initial = document.createElement("span");
  initial.className = "capa-inicial";
  initial.textContent = (title?.trim()?.[0] ?? "E").toUpperCase();

  elements.capa.appendChild(initial);
  elements.capa.setAttribute("aria-label", `Capa ilustrativa de ${title || "obra sem título"}`);
}

async function renderCover(book) {
  renderCoverPlaceholder(book.title);

  if (!book.coverPath) {
    return;
  }

  try {
    const result = await getBookCoverUrl(book.coverPath);
    const url = result.error ? null : result.data?.url;

    if (!url) {
      return;
    }

    const image = document.createElement("img");
    image.className = "obra-cover-image";
    image.alt = "";
    image.src = url;

    image.addEventListener("load", () => {
      elements.capa.replaceChildren(image);
      elements.capa.setAttribute("aria-label", `Capa de ${book.title}`);
    });

    image.addEventListener("error", () => {
      renderCoverPlaceholder(book.title);
    });

  } catch (error) {
    console.warn("Não foi possível carregar a capa:", error);
    renderCoverPlaceholder(book.title);
  }
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

function renderChapters(chapters = []) {
  currentChapters = chapters;
  elements.capitulosLista.replaceChildren();
  elements.quantidadeCapitulos.textContent = String(chapters.length);
  elements.capitulosResumo.textContent = `${chapters.length} publicado${chapters.length === 1 ? "" : "s"}`;

  if (!chapters.length) {
    const empty = document.createElement("p");
    empty.className = "capitulos-vazio";
    empty.textContent = "Esta obra ainda não possui capítulos publicados.";
    elements.capitulosLista.appendChild(empty);
    elements.btnComecar.setAttribute("aria-disabled", "true");
    elements.btnComecar.removeAttribute("href");
    return;
  }

  elements.btnComecar.removeAttribute("aria-disabled");
  elements.btnComecar.href = `./chapter?id=${encodeURIComponent(chapters[0].id)}`;
  chapters.forEach((chapter, index) => {
    const item = document.createElement("article");
    item.className = "capitulo-item";

    const link = document.createElement("a");
    link.className = "capitulo-link";
    link.href = `./chapter?id=${encodeURIComponent(chapter.id)}`;
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

function updateFavoriteButton() {
  elements.btnFavorito.setAttribute(
    "aria-pressed",
    String(favoriteState)
  );

  elements.btnFavorito.textContent = favoriteState
    ? "♥ Favoritado"
    : "♡ Favoritar";
}

async function loadFavorite() {
  elements.btnFavorito.disabled = true;
  elements.favoritoFeedback.textContent = "";

  try {
    const result = await isFavorite(bookId);

    if (result?.error) {
      favoriteState = false;
      updateFavoriteButton();

      if (result.error.code === "UNAUTHENTICATED") {
        elements.favoritoFeedback.textContent =
          "Entre na sua conta para favoritar esta obra.";
      } else {
        elements.favoritoFeedback.textContent =
          "Não foi possível consultar seus favoritos.";
      }
      return;
    }

    favoriteState = Boolean(result?.data);
    updateFavoriteButton();
  } catch (error) {
    console.error("Erro ao consultar favoritos:", error);
    favoriteState = false;
    updateFavoriteButton();
    elements.favoritoFeedback.textContent =
      "Não foi possível consultar seus favoritos.";
  } finally {
    elements.btnFavorito.disabled = false;
  }
}

async function toggleFavorite() {
  if (!currentBook || elements.btnFavorito.disabled) {
    return;
  }

  elements.btnFavorito.disabled = true;
  elements.favoritoFeedback.textContent = "";

  try {
    const result = favoriteState
      ? await removeFavorite(bookId)
      : await addFavorite(bookId);

    if (result?.error) {
      elements.favoritoFeedback.textContent =
        result.error.code === "UNAUTHENTICATED"
          ? "Entre na sua conta para favoritar esta obra."
          : result.error.message ||
            "Não foi possível atualizar o favorito.";
      return;
    }

    favoriteState = !favoriteState;
    updateFavoriteButton();

    elements.favoritoFeedback.textContent = favoriteState
      ? "Obra adicionada aos favoritos."
      : "Obra removida dos favoritos.";
  } catch (error) {
    console.error("Erro ao atualizar favorito:", error);
    elements.favoritoFeedback.textContent =
      "Ocorreu um erro ao atualizar o favorito.";
  } finally {
    elements.btnFavorito.disabled = false;
  }
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

  const publishedChapters = (chaptersResult.data ?? [])
  .filter((chapter) => chapter.status === "published")
  .sort((a, b) => a.position - b.position);

  renderBook(currentBook, authorResult.data);
  renderChapters(publishedChapters);
  setStatus("");
  elements.status.hidden = true;

  await loadFavorite();
}

elements.btnFavorito.addEventListener("click", toggleFavorite);

loadPage().catch((error) => {
  console.error(error);
  showError("Ocorreu um erro inesperado ao carregar a obra.");
});
