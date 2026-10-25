import { getBooks } from "../services/bookService.js";
import { getProfile } from "../services/profileService.js";

const elements = {
  status: document.querySelector("#catalog-status"),
  grid: document.querySelector("#book-grid")
};

// Paleta usada nas capas sem imagem.
const coverTones = [
  "book-cover-tone-1",
  "book-cover-tone-2",
  "book-cover-tone-3",
  "book-cover-tone-4",
  "book-cover-tone-5",
  "book-cover-tone-6"
];

// Exibe o estado atual do catálogo.
function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", isError);
}

// Cria um elemento HTML com texto seguro.
function createTextElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  element.textContent = text ?? "";

  return element;
}

// Mostra uma mensagem quando não existem obras.
function renderEmptyCatalog() {
  elements.grid.replaceChildren();

  const container = document.createElement("div");
  container.className = "catalog-empty";

  const symbol = createTextElement(
    "span",
    "catalog-empty-symbol",
    "❦"
  );

  symbol.setAttribute("aria-hidden", "true");

  const title = createTextElement(
    "h3",
    "",
    "Nossa estante está esperando por você"
  );

  const description = createTextElement(
    "p",
    "",
    "Ainda não encontramos obras publicadas no catálogo. " +
    "Volte em breve para descobrir novas histórias."
  );

  container.append(symbol, title, description);
  elements.grid.appendChild(container);
}

// Cria uma capa ilustrativa quando a obra não tem imagem.
function createCoverPlaceholder(book, index) {
  const cover = document.createElement("div");

  cover.classList.add(
    "book-cover",
    coverTones[index % coverTones.length]
  );

  cover.setAttribute("aria-hidden", "true");

  const small = createTextElement(
    "span",
    "book-cover-small",
    "E-WRITTER COLLECTION"
  );

  const ornament = createTextElement(
    "span",
    "book-cover-ornament",
    "❦"
  );

  const title = createTextElement(
    "span",
    "book-cover-title",
    book.title || "Sem título"
  );

  const bottom = createTextElement(
    "span",
    "book-cover-bottom",
    "UMA NOVA HISTÓRIA"
  );

  cover.append(small, ornament, title, bottom);

  return cover;
}

// Cria a capa da obra, utilizando a imagem quando disponível.
function createCover(book, index) {
  if (!book.coverPath) {
    return createCoverPlaceholder(book, index);
  }

  const cover = document.createElement("div");
  cover.classList.add("book-cover", "has-image");

  const image = document.createElement("img");

  image.className = "book-cover-image";
  image.src = book.coverPath;
  image.alt = `Capa de ${book.title || "obra sem título"}`;
  image.loading = "lazy";

  image.addEventListener(
    "error",
    () => {
      const placeholder = createCoverPlaceholder(book, index);

      cover.replaceWith(placeholder);
    },
    { once: true }
  );

  cover.appendChild(image);

  return cover;
}

// Cria as etiquetas de gênero.
function createGenres(genres) {
  const container = document.createElement("div");

  container.className = "book-card-genres";

  if (!Array.isArray(genres) || genres.length === 0) {
    container.appendChild(
      createTextElement(
        "span",
        "book-genre",
        "Sem gênero"
      )
    );

    return container;
  }

  genres.slice(0, 3).forEach((genre) => {
    container.appendChild(
      createTextElement(
        "span",
        "book-genre",
        genre.name || "Gênero"
      )
    );
  });

  return container;
}

// Busca o nome público do autor.
async function getAuthorName(authorId) {
  if (!authorId) {
    return "Autor não informado";
  }

  try {
    const result = await getProfile(authorId);

    if (result.error || !result.data) {
      return "Autor não informado";
    }

    return (
      result.data.displayName ||
      result.data.username ||
      "Autor não informado"
    );
  } catch (error) {
    console.error("Erro ao carregar autor:", error);

    return "Autor não informado";
  }
}

// Cria um cartão completo para uma obra.
function createBookCard(book, authorName, index) {
  const article = document.createElement("article");

  article.className = "book-card";
  article.style.animationDelay = `${Math.min(index, 8) * 45}ms`;

  const link = document.createElement("a");

  link.className = "book-card-link";

  link.href =
    `detalhes-obra.html?id=${encodeURIComponent(book.id)}`;

  link.setAttribute(
    "aria-label",
    `Conhecer a obra ${book.title || "sem título"}`
  );

  const cover = createCover(book, index);

  const info = document.createElement("div");
  info.className = "book-card-info";

  const genres = createGenres(book.genres);

  const title = createTextElement(
    "h3",
    "book-card-title",
    book.title || "Obra sem título"
  );

  const author = createTextElement(
    "p",
    "book-card-author",
    `Por ${authorName}`
  );

  const description = createTextElement(
    "p",
    "book-card-description",
    book.description || "Esta obra ainda não possui uma sinopse."
  );

  const cta = createTextElement(
    "span",
    "book-card-cta",
    "Conhecer obra →"
  );

  info.append(
    genres,
    title,
    author,
    description,
    cta
  );

  link.append(cover, info);
  article.appendChild(link);

  return article;
}

// Carrega o catálogo.
async function loadCatalog() {
  setStatus("Abrindo as portas da biblioteca...");

  elements.grid.replaceChildren();

  try {
    const result = await getBooks();

    if (result.error) {
      console.error("Erro ao consultar as obras:", result.error);

      setStatus(
        "Não foi possível carregar o catálogo. Tente novamente mais tarde.",
        true
      );

      return;
    }

    const books = Array.isArray(result.data)
      ? result.data
      : [];

    // Evita exibir obras incompletas sem identificação.
    const validBooks = books.filter(
      (book) => book && book.id
    );

    if (validBooks.length === 0) {
      setStatus("");
      renderEmptyCatalog();
      return;
    }

    // Busca os autores sem interromper o catálogo caso um perfil falhe.
    const cards = await Promise.all(
      validBooks.map(async (book, index) => {
        const authorName = await getAuthorName(book.authorId);

        return createBookCard(book, authorName, index);
      })
    );

    elements.grid.replaceChildren(...cards);

    setStatus("");
  } catch (error) {
    console.error("Erro inesperado ao carregar o catálogo:", error);

    setStatus(
      "Ocorreu um erro ao abrir a biblioteca. " +
      "Verifique sua conexão e tente novamente.",
      true
    );
  }
}

// Inicializa a página.
loadCatalog();