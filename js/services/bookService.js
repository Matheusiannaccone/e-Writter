// Service responsável pelas operações de livros.

import { getBookAdapter } from "./dataSource.js";

// Retorna os livros publicados disponíveis no catálogo.
export async function getBooks() {
  return getBookAdapter().getBooks();
}

// Busca um livro pelo ID.
export async function getBookById(id) {
  return getBookAdapter().getBookById(id);
}

// Retorna todos os livros do usuário autenticado.
export async function getMyBooks() {
  return getBookAdapter().getMyBooks();
}

// Retorna os livros publicados de um autor.
export async function getBooksByAuthor(authorId) {
  return getBookAdapter().getBooksByAuthor(authorId);
}

// Filtra os livros por texto e gênero.
export function filterBooks(
  books,
  { query = "", genreId = "" } = {}
) {
  if (!Array.isArray(books)) {
    return [];
  }

  // Normaliza o texto para ignorar maiúsculas e acentos.
  const normalizeText = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const searchTerm = normalizeText(query);

  return books.filter((book) => {
    if (!book) {
      return false;
    }

    // Pesquisa por título, sinopse e nome do autor.
    const searchableText = normalizeText([
      book.title,
      book.description,
      book.authorName
    ].join(" "));

    const matchesText =
      !searchTerm ||
      searchableText.includes(searchTerm);

    // Filtra pelo ID do gênero selecionado.
    const matchesGenre =
      !genreId ||
      (Array.isArray(book.genres) &&
        book.genres.some(
          (genre) =>
            String(genre.id) === String(genreId)
        ));

    return matchesText && matchesGenre;
  });
}

// Cria um novo livro.
export async function createBook(data) {
  return getBookAdapter().createBook(data);
}

// Atualiza os dados de um livro.
export async function updateBook(id, data) {
  return getBookAdapter().updateBook(id, data);
}

// Publica um livro.
export async function publishBook(id) {
  return getBookAdapter().publishBook(id);
}

// Exclui um livro.
export async function deleteBook(id) {
  return getBookAdapter().deleteBook(id);
}