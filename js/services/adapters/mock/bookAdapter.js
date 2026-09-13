// Adapter Mock responsável pelas operações de livros.

export const mockBookAdapter = {
  async getBooks() {
    throw new Error("Not implemented");
  },

  async getBookById(id) {
    throw new Error("Not implemented");
  },

  async getMyBooks() {
    throw new Error("Not implemented");
  },

  async getBooksByAuthor(authorId) {
    throw new Error("Not implemented");
  },

  async createBook(data) {
    throw new Error("Not implemented");
  },

  async updateBook(id, data) {
    throw new Error("Not implemented");
  },

  async publishBook(id) {
    throw new Error("Not implemented");
  },

  async deleteBook(id) {
    throw new Error("Not implemented");
  }
};