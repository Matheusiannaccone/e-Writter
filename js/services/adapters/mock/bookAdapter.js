// Adapter Mock responsável pelas operações de livros.

import { mockAuthAdapter } from "./authAdapter.js";
import {
  mockBooks,
  mockBookGenres,
  mockGenres,
  mockChapters
} from "./mockData.js";

// Cria um erro no formato padrão dos services.
function createError(code, message) {
  return {
    data: null,
    error: {
      code,
      message
    }
  };
}

// Valida UUID no formato usado pelos livros.
function isValidUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

// Retorna os gêneros associados a um livro.
function getBookGenres(bookId) {
  const genreIds = mockBookGenres
    .filter(
      (relation) =>
        relation.bookId === bookId
    )
    .map(
      (relation) =>
        relation.genreId
    );

  return mockGenres
    .filter(
      (genre) =>
        genreIds.includes(genre.id)
    )
    .map(
      (genre) => ({ ...genre })
    );
}

// Retorna uma cópia normalizada do livro.
function normalizeBook(book) {
  return {
    ...book,
    genres: getBookGenres(book.id)
  };
}

// Busca o usuário autenticado.
async function getAuthenticatedUser() {
  const result =
    await mockAuthAdapter.getCurrentUser();

  if (result.error || !result.data) {
    return null;
  }

  return result.data;
}

// Valida a lista de gêneros.
function validateGenreIds(genreIds) {
  if (
    !Array.isArray(genreIds) ||
    genreIds.length < 1 ||
    genreIds.length > 3
  ) {
    return createError(
      "VALIDATION_ERROR",
      "O livro deve possuir entre 1 e 3 gêneros."
    );
  }

  if (
    genreIds.some(
      (id) =>
        !Number.isInteger(id) ||
        id <= 0
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "IDs de gênero inválidos."
    );
  }

  if (
    new Set(genreIds).size !==
    genreIds.length
  ) {
    return createError(
      "VALIDATION_ERROR",
      "Os gêneros não podem ser repetidos."
    );
  }

  const allGenresExist =
    genreIds.every(
      (id) =>
        mockGenres.some(
          (genre) =>
            genre.id === id
        )
    );

  if (!allGenresExist) {
    return createError(
      "VALIDATION_ERROR",
      "Um ou mais gêneros não existem."
    );
  }

  return null;
}

// Substitui os gêneros associados a um livro.
function replaceBookGenres(
  bookId,
  genreIds
) {
  for (
    let index =
      mockBookGenres.length - 1;
    index >= 0;
    index--
  ) {
    if (
      mockBookGenres[index].bookId ===
      bookId
    ) {
      mockBookGenres.splice(
        index,
        1
      );
    }
  }

  for (const genreId of genreIds) {
    mockBookGenres.push({
      bookId,
      genreId
    });
  }
}

export const mockBookAdapter = {
  // Retorna apenas livros publicados.
  async getBooks() {
    const books = mockBooks
      .filter(
        (book) =>
          book.status ===
          "published"
      )
      .map(normalizeBook);

    return {
      data: books,
      error: null
    };
  },

  // Busca um livro visível pelo ID.
  async getBookById(id) {
    if (!isValidUuid(id)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de livro inválido."
      );
    }

    const book =
      mockBooks.find(
        (item) =>
          item.id === id
      );

    if (!book) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    const user =
      await getAuthenticatedUser();

    const isOwner =
      user?.id === book.authorId;

    if (
      book.status !==
        "published" &&
      !isOwner
    ) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    return {
      data: normalizeBook(book),
      error: null
    };
  },

  // Retorna todos os livros do usuário autenticado.
  async getMyBooks() {
    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const books = mockBooks
      .filter(
        (book) =>
          book.authorId === user.id
      )
      .map(normalizeBook);

    return {
      data: books,
      error: null
    };
  },

  // Retorna apenas livros publicados de um autor.
  async getBooksByAuthor(
    authorId
  ) {
    if (!isValidUuid(authorId)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de autor inválido."
      );
    }

    const books = mockBooks
      .filter(
        (book) =>
          book.authorId ===
            authorId &&
          book.status ===
            "published"
      )
      .map(normalizeBook);

    return {
      data: books,
      error: null
    };
  },

  // Cria um novo livro em rascunho.
  async createBook(data) {
    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    if (
      !data ||
      typeof data !== "object"
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Dados do livro inválidos."
      );
    }

    if (
      typeof data.title !==
        "string" ||
      data.title.trim() === ""
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Título do livro é obrigatório."
      );
    }

    const genreError =
      validateGenreIds(
        data.genreIds
      );

    if (genreError) {
      return genreError;
    }

    if (
      data.description !==
        undefined &&
      data.description !== null &&
      typeof data.description !==
        "string"
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Descrição inválida."
      );
    }

    const now =
      new Date().toISOString();

    const book = {
      id: crypto.randomUUID(),
      authorId: user.id,
      title: data.title.trim(),
      description:
        data.description == null ||
        data.description.trim() === ""
          ? null
          : data.description.trim(),
      coverPath: null,
      status: "draft",
      publicationStatus:
        "ongoing",
      language: "pt-BR",
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    };

    mockBooks.push(book);

    for (
      const genreId of
      data.genreIds
    ) {
      mockBookGenres.push({
        bookId: book.id,
        genreId
      });
    }

    return {
      data: normalizeBook(book),
      error: null
    };
  },

  // Atualiza os dados de um livro do usuário autenticado.
  async updateBook(id, data) {
    if (!isValidUuid(id)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de livro inválido."
      );
    }

    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const book =
      mockBooks.find(
        (item) =>
          item.id === id &&
          item.authorId ===
            user.id
      );

    if (!book) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    if (
      !data ||
      typeof data !== "object" ||
      Object.keys(data).length === 0
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Nenhum dado para atualizar."
      );
    }

    const allowedFields = [
      "title",
      "description",
      "coverPath",
      "publicationStatus",
      "language",
      "genreIds"
    ];

    const hasAllowedField =
      Object.keys(data).some(
        (key) =>
          allowedFields.includes(
            key
          )
      );

    if (!hasAllowedField) {
      return createError(
        "VALIDATION_ERROR",
        "Nenhum dado válido para atualizar."
      );
    }

    if (
      "title" in data
    ) {
      if (
        typeof data.title !==
          "string" ||
        data.title.trim() === ""
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Título do livro é obrigatório."
        );
      }

      book.title =
        data.title.trim();
    }

    if (
      "description" in data
    ) {
      if (
        data.description !==
          null &&
        typeof data.description !==
          "string"
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Descrição inválida."
        );
      }

      book.description =
        data.description == null ||
        data.description.trim() ===
          ""
          ? null
          : data.description.trim();
    }

    if (
      "coverPath" in data
    ) {
      if (
        data.coverPath !== null &&
        typeof data.coverPath !==
          "string"
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Capa inválida."
        );
      }

      book.coverPath =
        data.coverPath == null ||
        data.coverPath.trim() === ""
          ? null
          : data.coverPath.trim();
    }

    if (
      "publicationStatus" in data
    ) {
      const validStatuses = [
        "ongoing",
        "completed",
        "discontinued"
      ];

      if (
        !validStatuses.includes(
          data.publicationStatus
        )
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Status de publicação inválido."
        );
      }

      book.publicationStatus =
        data.publicationStatus;
    }

    if (
      "language" in data
    ) {
      if (
        typeof data.language !==
          "string" ||
        data.language.trim() === ""
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Idioma inválido."
        );
      }

      book.language =
        data.language.trim();
    }

    if (
      "genreIds" in data
    ) {
      const genreError =
        validateGenreIds(
          data.genreIds
        );

      if (genreError) {
        return genreError;
      }

      replaceBookGenres(
        id,
        data.genreIds
      );
    }

    book.updatedAt =
      new Date().toISOString();

    return {
      data: normalizeBook(book),
      error: null
    };
  },

  // Publica um livro do usuário autenticado.
  async publishBook(id) {
    if (!isValidUuid(id)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de livro inválido."
      );
    }

    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const book =
      mockBooks.find(
        (item) =>
          item.id === id &&
          item.authorId ===
            user.id
      );

    if (!book) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    if (
      !book.description ||
      book.description.trim() === ""
    ) {
      return createError(
        "VALIDATION_ERROR",
        "O livro precisa possuir uma descrição para ser publicado."
      );
    }

    const genres =
      getBookGenres(id);

    if (
      genres.length < 1 ||
      genres.length > 3
    ) {
      return createError(
        "VALIDATION_ERROR",
        "O livro precisa possuir entre 1 e 3 gêneros para ser publicado."
      );
    }

    const hasPublishedChapter =
      mockChapters.some(
        (chapter) =>
          chapter.bookId === id &&
          chapter.status ===
            "published"
      );

    if (!hasPublishedChapter) {
      return createError(
        "VALIDATION_ERROR",
        "O livro precisa possuir pelo menos um capítulo publicado."
      );
    }

    if (
      book.status !==
      "published"
    ) {
      book.status =
        "published";

      book.publishedAt =
        new Date().toISOString();
    }

    book.updatedAt =
      new Date().toISOString();

    return {
      data: normalizeBook(book),
      error: null
    };
  },

  // Exclui um livro do usuário autenticado.
  async deleteBook(id) {
    if (!isValidUuid(id)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de livro inválido."
      );
    }

    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const index =
      mockBooks.findIndex(
        (book) =>
          book.id === id &&
          book.authorId ===
            user.id
      );

    if (index === -1) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    mockBooks.splice(
      index,
      1
    );

    for (
      let relationIndex =
        mockBookGenres.length - 1;
      relationIndex >= 0;
      relationIndex--
    ) {
      if (
        mockBookGenres[
          relationIndex
        ].bookId === id
      ) {
        mockBookGenres.splice(
          relationIndex,
          1
        );
      }
    }

    for (
      let chapterIndex =
        mockChapters.length - 1;
      chapterIndex >= 0;
      chapterIndex--
    ) {
      if (
        mockChapters[
          chapterIndex
        ].bookId === id
      ) {
        mockChapters.splice(
          chapterIndex,
          1
        );
      }
    }

    return {
      data: {
        id
      },
      error: null
    };
  }
};