import { getBookCoverUrl } from "../services/imageService.js";

// Use o mesmo card nas listas da Home, do catálogo, da busca e da biblioteca.
// A página fornece o destino e os dados de apresentação; a URL da capa vem do service.
export async function createBookCard(book, { href, author, genres = [], metadata } = {}) {
  if (!book || !href) throw new TypeError("O card precisa de um livro e de um destino.");

  const title = String(book.title || "Livro sem título").trim() || "Livro sem título";
  const card = document.createElement("article");
  card.className = "book-card";

  const link = document.createElement("a");
  link.className = "book-card__link";
  link.href = href;
  link.setAttribute("aria-label", `Abrir livro: ${title}`);

  const cover = document.createElement("span");
  cover.className = "book-card__cover";
  const placeholder = document.createElement("span");
  placeholder.className = "book-card__placeholder";
  placeholder.textContent = "Sem capa";
  cover.append(placeholder);

  if (book.coverPath) {
    try {
      const { data, error } = await getBookCoverUrl(book.coverPath);
      const url = error ? null : data?.url;
      if (url) {
        const image = document.createElement("img");
        image.className = "book-card__image";
        image.src = url;
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("load", () => { placeholder.hidden = true; });
        image.addEventListener("error", () => { image.remove(); placeholder.hidden = false; });
        cover.append(image);
      }
    } catch {
      // A ausência ou falha da capa não impede a navegação para o livro.
    }
  }

  const content = document.createElement("span");
  content.className = "book-card__content";
  const heading = document.createElement("span");
  heading.className = "book-card__title";
  heading.textContent = title;
  content.append(heading);

  if (author) {
    const byline = document.createElement("span");
    byline.className = "book-card__author";
    byline.textContent = String(author);
    content.append(byline);
  }

  const labels = Array.isArray(genres) ? genres.map((genre) => typeof genre === "string" ? genre : genre?.name).filter(Boolean) : [];
  if (labels.length || metadata) {
    const details = document.createElement("span");
    details.className = "book-card__metadata";
    details.textContent = [...labels, ...(metadata ? [String(metadata)] : [])].join(" · ");
    content.append(details);
  }

  link.append(cover, content);
  card.append(link);
  return card;
}
