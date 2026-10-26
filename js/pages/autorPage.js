import { getProfileByUsername } from "../services/profileService.js";
import { getBooksByAuthor } from "../services/bookService.js";
import { getPublicImageUrl } from "../services/imageService.js";

import {
  createBookCard,
  createTextElement
} from "../components/bookCard.js";

const elements = {
  status: document.querySelector("#author-status"),
  profile: document.querySelector("#author-profile"),
  avatar: document.querySelector("#author-avatar"),
  name: document.querySelector("#author-name"),
  username: document.querySelector("#author-username"),
  bio: document.querySelector("#author-bio"),
  count: document.querySelector("#author-count"),
  unavailable: document.querySelector("#author-unavailable"),
  unavailableMessage: document.querySelector("#author-unavailable-message"),
  works: document.querySelector("#author-works"),
  worksStatus: document.querySelector("#works-status"),
  grid: document.querySelector("#author-book-grid")
};

const params = new URLSearchParams(window.location.search);
const username = params.get("username");

// Mostra a página de perfil indisponível.
function showUnavailable(message) {
  elements.status.textContent = "";
  elements.profile.hidden = true;
  elements.works.hidden = true;

  elements.unavailableMessage.textContent = message;
  elements.unavailable.hidden = false;

  document.title = "Perfil indisponível | E-writter";
}

// Mostra uma mensagem de estado na área de obras.
function setWorksStatus(message, isError = false) {
  elements.worksStatus.textContent = message;
  elements.worksStatus.classList.toggle("is-error", isError);
}

// Gera as iniciais usadas quando o autor não possui avatar.
function getInitials(name) {
  const letters = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase());

  return letters.join("") || "?";
}

// Exibe o avatar do autor ou, na falta dele, as iniciais.
function renderAvatar(profile, name) {
  const showInitials = () => {
    const initials = createTextElement(
      "span",
      "author-avatar-initials",
      getInitials(name)
    );

    initials.setAttribute("aria-hidden", "true");
    elements.avatar.replaceChildren(initials);
  };

  const url = getPublicImageUrl(profile.avatarPath);

  if (!url) {
    showInitials();
    return;
  }

  const image = document.createElement("img");

  image.className = "author-avatar-image";
  image.src = url;
  image.alt = `Foto de perfil de ${name}`;
  image.loading = "lazy";

  image.addEventListener("error", showInitials, { once: true });

  elements.avatar.replaceChildren(image);
}

// Exibe somente os dados públicos do perfil.
function renderProfile(profile, name) {
  elements.name.textContent = name;
  elements.username.textContent = profile.username
    ? `@${profile.username}`
    : "";

  const bio = typeof profile.bio === "string" ? profile.bio.trim() : "";

  elements.bio.textContent = bio;
  elements.bio.hidden = bio === "";

  renderAvatar(profile, name);

  document.title = `${name} | E-writter`;

  elements.status.textContent = "";
  elements.profile.hidden = false;
}

// Mostra uma mensagem quando o autor ainda não publicou obras.
function renderNoWorks() {
  const container = document.createElement("div");
  container.className = "catalog-empty";

  const symbol = createTextElement("span", "catalog-empty-symbol", "❦");
  symbol.setAttribute("aria-hidden", "true");

  const title = createTextElement(
    "h3",
    "",
    "Nenhuma obra publicada ainda"
  );

  const description = createTextElement(
    "p",
    "",
    "Este autor ainda não publicou histórias. " +
    "Volte em breve para acompanhar as novidades."
  );

  container.append(symbol, title, description);
  elements.grid.replaceChildren(container);
}

// Atualiza o texto com a quantidade de obras do autor.
function renderCount(total) {
  elements.count.textContent =
    `${total} ${total === 1 ? "obra publicada" : "obras publicadas"}`;
}

// Carrega e exibe as obras publicadas do autor.
async function loadWorks(profile, name) {
  elements.works.hidden = false;
  setWorksStatus("Carregando obras...");

  try {
    const result = await getBooksByAuthor(profile.id);

    if (result.error) {
      console.error("Erro ao consultar as obras do autor:", result.error);

      elements.count.textContent = "";
      elements.grid.replaceChildren();

      setWorksStatus(
        "Não foi possível carregar as obras deste autor. " +
        "Tente novamente mais tarde.",
        true
      );

      return;
    }

    const books = Array.isArray(result.data) ? result.data : [];

    // Garante que somente obras publicadas deste autor sejam exibidas.
    const publishedBooks = books.filter(
      (book) =>
        book &&
        book.id &&
        book.status === "published" &&
        book.authorId === profile.id
    );

    setWorksStatus("");
    renderCount(publishedBooks.length);

    if (publishedBooks.length === 0) {
      renderNoWorks();
      return;
    }

    const cards = publishedBooks.map((book, index) =>
      createBookCard(book, name, index)
    );

    elements.grid.replaceChildren(...cards);
  } catch (error) {
    console.error("Erro inesperado ao carregar as obras do autor:", error);

    elements.count.textContent = "";
    elements.grid.replaceChildren();

    setWorksStatus(
      "Não foi possível carregar as obras deste autor. " +
      "Tente novamente mais tarde.",
      true
    );
  }
}

// Carrega o perfil público e, em seguida, as obras publicadas.
async function loadAuthorPage() {
  if (!username) {
    showUnavailable("Nenhum autor foi informado.");
    return;
  }

  try {
    const result = await getProfileByUsername(username);

    if (result.error || !result.data) {
      const notFound =
        !result.error ||
        result.error.code === "NOT_FOUND" ||
        result.error.code === "VALIDATION_ERROR";

      if (!notFound) {
        console.error("Erro ao consultar o perfil:", result.error);
      }

      showUnavailable(
        notFound
          ? "Não encontramos este autor. O perfil pode não existir ou ter sido removido."
          : "Não foi possível carregar o perfil agora. Tente novamente mais tarde."
      );

      return;
    }

    const profile = result.data;
    const name = profile.displayName || profile.username || "Autor";

    renderProfile(profile, name);

    await loadWorks(profile, name);
  } catch (error) {
    console.error("Erro inesperado ao carregar o perfil:", error);

    showUnavailable(
      "Não foi possível carregar o perfil agora. Tente novamente mais tarde."
    );
  }
}

loadAuthorPage();