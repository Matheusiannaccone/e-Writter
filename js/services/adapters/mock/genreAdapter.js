// Adapter Mock responsável pelas operações de gêneros.

export const mockGenreAdapter = {
  // Retorna todos os gêneros disponíveis.
  async getGenres() {
    throw new Error("Not implemented");
  },

  // Busca um gênero pelo ID.
  async getGenreById(id) {
    throw new Error("Not implemented");
  },

  // Busca um gênero pelo slug.
  async getGenreBySlug(slug) {
    throw new Error("Not implemented");
  }
};