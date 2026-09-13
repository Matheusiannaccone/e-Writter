// Adapter Mock responsável pelas operações de imagens.

export const mockImageAdapter = {
  // Envia ou substitui o avatar do usuário autenticado.
  async uploadAvatar(file) {
    throw new Error("Not implemented");
  },

  // Remove o avatar do usuário autenticado.
  async removeAvatar() {
    throw new Error("Not implemented");
  },

  // Envia ou substitui a capa de um livro.
  async uploadBookCover(bookId, file) {
    throw new Error("Not implemented");
  },

  // Remove a capa de um livro.
  async removeBookCover(bookId) {
    throw new Error("Not implemented");
  }
};