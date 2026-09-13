// Adapter Supabase responsável pelas operações de favoritos.

import { supabase } from "../../supabaseClient.js";

// Campos retornados do livro associado ao favorito.
const FAVORITE_SELECT = `
  user_id,
  book_id,
  created_at,
  book:books!fk_favorites_book (
    id,
    title,
    author_id,
    cover_path,
    status,
    publication_status,
    language,
    published_at,
    author:profiles!fk_books_author (
      id,
      username,
      display_name,
      avatar_path
    ),
    book_genres!fk_book_genres_book (
      genre:genres!fk_book_genres_genre (
        id,
        name,
        slug
      )
    )
  )
`;

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

// Identifica falhas de conexão.
function isNetworkError(error) {
  if (!error) {
    return false;
  }

  const message =
    error.message?.toLowerCase() ?? "";

  return (
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    message.includes("network request failed")
  );
}

// Normaliza erros retornados pelo Supabase.
function normalizeSupabaseError(
  error,
  defaultMessage
) {
  if (isNetworkError(error)) {
    return createError(
      "NETWORK_ERROR",
      "Não foi possível conectar ao servidor."
    );
  }

  const message =
    error?.message?.toLowerCase() ?? "";

  const code =
    error?.code ?? "";

  if (
    code === "23505" ||
    message.includes(
      "duplicate key value"
    )
  ) {
    return createError(
      "CONFLICT",
      "Livro já adicionado aos favoritos."
    );
  }

  return createError(
    "UNKNOWN",
    defaultMessage
  );
}

// Busca o usuário autenticado.
async function getAuthenticatedUser() {
  const {
    data,
    error
  } = await supabase.auth.getUser();

  if (error) {
    if (isNetworkError(error)) {
      return {
        user: null,
        error: createError(
          "NETWORK_ERROR",
          "Não foi possível conectar ao servidor."
        )
      };
    }

    return {
      user: null,
      error: createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      )
    };
  }

  if (!data?.user) {
    return {
      user: null,
      error: createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      )
    };
  }

  return {
    user: data.user,
    error: null
  };
}

// Normaliza o autor retornado pelo relacionamento.
function normalizeAuthor(profile) {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarPath: profile.avatar_path
  };
}

// Normaliza o resumo de livro retornado no favorito.
function normalizeBookSummary(book) {
  if (!book) {
    return null;
  }

  const genres =
    (book.book_genres ?? [])
      .map(
        (relation) =>
          relation.genre
      )
      .filter(Boolean)
      .map(
        (genre) => ({
          id: genre.id,
          name: genre.name,
          slug: genre.slug
        })
      );

  return {
    id: book.id,
    title: book.title,
    author:
      normalizeAuthor(
        book.author
      ),
    coverPath: book.cover_path,
    status: book.status,
    publicationStatus:
      book.publication_status,
    language: book.language,
    genres,
    publishedAt:
      book.published_at
  };
}

// Normaliza um favorito.
function normalizeFavorite(favorite) {
  return {
    userId: favorite.user_id,
    bookId: favorite.book_id,
    createdAt: favorite.created_at,
    book:
      normalizeBookSummary(
        favorite.book
      )
  };
}

// Verifica se um livro publicado existe.
async function getPublishedBook(bookId) {
  const {
    data,
    error
  } = await supabase
    .from("books")
    .select("id, status")
    .eq("id", bookId)
    .maybeSingle();

  if (error) {
    return {
      book: null,
      error: normalizeSupabaseError(
        error,
        "Não foi possível verificar o livro."
      )
    };
  }

  if (!data) {
    return {
      book: null,
      error: createError(
        "NOT_FOUND",
        "Livro não encontrado."
      )
    };
  }

  if (data.status !== "published") {
    return {
      book: null,
      error: createError(
        "VALIDATION_ERROR",
        "Apenas livros publicados podem ser adicionados aos favoritos."
      )
    };
  }

  return {
    book: data,
    error: null
  };
}

export const supabaseFavoriteAdapter = {
  // Retorna os favoritos do usuário autenticado.
  async listFavorites() {
    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const {
      data,
      error
    } = await supabase
      .from("favorites")
      .select(FAVORITE_SELECT)
      .eq(
        "user_id",
        auth.user.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível buscar os favoritos."
      );
    }

    return {
      data: (data ?? []).map(
        normalizeFavorite
      ),
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

    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const {
      data,
      error
    } = await supabase
      .from("favorites")
      .select("book_id")
      .eq(
        "user_id",
        auth.user.id
      )
      .eq(
        "book_id",
        bookId
      )
      .maybeSingle();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível verificar o favorito."
      );
    }

    return {
      data: data !== null,
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

    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const bookResult =
      await getPublishedBook(
        bookId
      );

    if (bookResult.error) {
      return bookResult.error;
    }

    const {
      data,
      error
    } = await supabase
      .from("favorites")
      .insert({
        user_id:
          auth.user.id,
        book_id:
          bookId
      })
      .select(FAVORITE_SELECT)
      .single();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível adicionar o favorito."
      );
    }

    return {
      data:
        normalizeFavorite(data),
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

    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const {
      data,
      error
    } = await supabase
      .from("favorites")
      .delete()
      .eq(
        "user_id",
        auth.user.id
      )
      .eq(
        "book_id",
        bookId
      )
      .select("book_id")
      .maybeSingle();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível remover o favorito."
      );
    }

    if (!data) {
      return createError(
        "NOT_FOUND",
        "Favorito não encontrado."
      );
    }

    return {
      data: {
        bookId: data.book_id
      },
      error: null
    };
  }
};