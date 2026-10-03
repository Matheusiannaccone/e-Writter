// Adapter Mock responsável pelas operações de favoritos.

import {
  mockFavorites,
  mockBooks,
  mockProfiles,
  mockBookGenres,
  mockGenres
} from "./mockData.js";

import { mockAuthAdapter } from "./authAdapter.js";

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

// Valida UUIDs de livros.
function isValidUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

// Retorna o usuário autenticado no Mock.
async function getAuthenticatedUser() {
  const result =
    await mockAuthAdapter.getCurrentUser();

  if (result.error || !result.data) {
    return null;
  }

  return result.data;
}

// Cria o resumo do autor utilizado no livro.
function getAuthorSummary(authorId) {
  if (!authorId) {
    return null;
  }

  const profile =
    mockProfiles.find(
      (item) =>
        item.id === authorId
    );

  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    avatarPath: profile.avatarPath
  };
}

// Retorna os gêneros associados ao livro.
function getBookGenres(bookId) {
  const genreIds =
    mockBookGenres
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
        genreIds.includes(
          genre.id
        )
    )
    .map(
      (genre) => ({
        id: genre.id,
        name: genre.name,
        slug: genre.slug
      })
    );
}

// Normaliza o resumo de livro retornado no favorito.
function normalizeBookSummary(book) {
  if (!book) {
    return null;
  }

  return {
    id: book.id,
    title: book.title,
    author:
      getAuthorSummary(
        book.authorId
      ),
    coverPath: book.coverPath,
    status: book.status,
    publicationStatus:
      book.publicationStatus,
    language: book.language,
    genres:
      getBookGenres(book.id),
    publishedAt:
      book.publishedAt
  };
}

// Normaliza um favorito.
function normalizeFavorite(favorite) {
  const book =
    mockBooks.find(
      (item) =>
        item.id === favorite.bookId
    );

  return {
    userId: favorite.userId,
    bookId: favorite.bookId,
    createdAt: favorite.createdAt,
    book:
      normalizeBookSummary(book)
  };
}

export const mockFavoriteAdapter = {
  // Retorna os favoritos do usuário autenticado.
  async listFavorites() {
    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const favorites =
      mockFavorites
        .filter(
          (favorite) =>
            favorite.userId ===
            user.id
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        )
        .map(normalizeFavorite);

    return {
      data: favorites,
      error: null
    };
  },

  // Verifica se um livro está favoritado.
  async isFavorite(bookId) {
    if (!isValidUuid(bookId)) {
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

    const favorite =
      mockFavorites.some(
        (item) =>
          item.userId === user.id &&
          item.bookId === bookId
      );

    return {
      data: favorite,
      error: null
    };
  },

  // Adiciona um livro publicado aos favoritos.
  async addFavorite(bookId) {
    if (!isValidUuid(bookId)) {
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
          item.id === bookId
      );

    if (!book) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    if (book.status !== "published") {
      return createError(
        "VALIDATION_ERROR",
        "Apenas livros publicados podem ser adicionados aos favoritos."
      );
    }

    const alreadyFavorite =
      mockFavorites.some(
        (item) =>
          item.userId === user.id &&
          item.bookId === bookId
      );

    if (alreadyFavorite) {
      return createError(
        "CONFLICT",
        "Livro já adicionado aos favoritos."
      );
    }

    const favorite = {
      userId: user.id,
      bookId,
      createdAt:
        new Date().toISOString()
    };

    mockFavorites.push(
      favorite
    );

    return {
      data:
        normalizeFavorite(
          favorite
        ),
      error: null
    };
  },

  // Remove um livro dos favoritos.
  async removeFavorite(bookId) {
    if (!isValidUuid(bookId)) {
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
      mockFavorites.findIndex(
        (item) =>
          item.userId === user.id &&
          item.bookId === bookId
      );

    if (index === -1) {
      return createError(
        "NOT_FOUND",
        "Favorito não encontrado."
      );
    }

    mockFavorites.splice(
      index,
      1
    );

    return {
      data: {
        bookId
      },
      error: null
    };
  }
};