/**
 * Constrói o card compartilhado pelas listagens a partir de dados já consultados.
 * Resolve a capa pelo imageService e inclui o controle de favoritos quando aplicável.
 */
import { createFavoriteButton } from "./favorite-button.js";
import { getBookCoverUrl } from "../services/imageService.js";

/**
 * Cria um card com link e, opcionalmente, um controle de favorito fora desse link.
 * @param {object} book - Obra com id, title, status e coverPath opcional.
 * @param {{href: string, author?: string, genres?: Array<string|object>, metadata?: string, showFavoriteButton?: boolean}} options - Apresentação e destino.
 * @returns {Promise<HTMLElement>} Article pronto para montagem, mesmo se a capa falhar.
 * @throws {TypeError} Quando a obra ou o destino não são fornecidos.
 */
export async function createBookCard(book, { href, author, genres = [], metadata, showFavoriteButton = true } = {}) {
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
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("load", () => { placeholder.hidden = true; });
        image.addEventListener("error", () => { image.remove(); placeholder.hidden = false; });
        image.src = url;
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
  if (showFavoriteButton && book.status === "published") card.append(createFavoriteButton(book));
  return card;
}
