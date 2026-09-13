// Service responsável pelas operações de imagens.

import { getImageAdapter } from "./dataSource.js";

// Envia ou substitui o avatar do usuário autenticado.
export async function uploadAvatar(file) {
  return getImageAdapter().uploadAvatar(file);
}

// Remove o avatar do usuário autenticado.
export async function removeAvatar() {
  return getImageAdapter().removeAvatar();
}

// Envia ou substitui a capa de um livro.
export async function uploadBookCover(bookId, file) {
  return getImageAdapter().uploadBookCover(bookId, file);
}

// Remove a capa de um livro.
export async function removeBookCover(bookId) {
  return getImageAdapter().removeBookCover(bookId);
}