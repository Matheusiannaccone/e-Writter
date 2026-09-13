// Adapter Supabase responsável pelas operações de favoritos.

export const supabaseFavoriteAdapter = {
  // Retorna os favoritos do usuário autenticado.
  async listFavorites() {
    throw new Error("Not implemented");
  },

  // Verifica se um livro está favoritado.
  async isFavorite(bookId) {
    throw new Error("Not implemented");
  },

  // Adiciona um livro aos favoritos.
  async addFavorite(bookId) {
    throw new Error("Not implemented");
  },

  // Remove um livro dos favoritos.
  async removeFavorite(bookId) {
    throw new Error("Not implemented");
  }
};