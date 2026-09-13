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