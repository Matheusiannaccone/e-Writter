// Paleta usada nas capas sem imagem.
const coverTones = [
  "book-cover-tone-1",
  "book-cover-tone-2",
  "book-cover-tone-3",
  "book-cover-tone-4",
  "book-cover-tone-5",
  "book-cover-tone-6"
];

// Cria um elemento HTML com texto seguro.
export function createTextElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  element.textContent = text ?? "";

  return element;
}

// Cria uma capa ilustrativa quando a obra não tem imagem.
const createCoverPlaceholder = (book, index) => {
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
const createCover = (book, index) => {
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
const createGenres = (genres) => {
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

// Cria um cartão completo para uma obra.
export function createBookCard(book, authorName, index) {
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