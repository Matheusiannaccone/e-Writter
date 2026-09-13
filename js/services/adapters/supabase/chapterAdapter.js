// Adapter Supabase responsável pelas operações de capítulos.

export const supabaseChapterAdapter = {
  // Retorna os capítulos visíveis de um livro.
  async getChaptersByBook(bookId) {
    throw new Error("Not implemented");
  },

  // Busca um capítulo pelo ID.
  async getChapterById(id) {
    throw new Error("Not implemented");
  },

  // Cria um novo capítulo no final do livro.
  async createChapter(bookId, data) {
    throw new Error("Not implemented");
  },

  // Atualiza os dados de um capítulo.
  async updateChapter(id, data) {
    throw new Error("Not implemented");
  },

  // Publica um capítulo.
  async publishChapter(id) {
    throw new Error("Not implemented");
  },

  // Exclui um capítulo e todos os posteriores.
  async deleteChapter(id) {
    throw new Error("Not implemented");
  }
};