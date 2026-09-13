// Adapter Supabase responsável pelas operações de livros.

import { supabase } from "../../supabaseClient.js";

// Campos retornados nas consultas de livros.
const BOOK_SELECT = `
  id,
  author_id,
  title,
  description,
  cover_path,
  status,
  publication_status,
  language,
  published_at,
  created_at,
  updated_at,
  book_genres (
    genres (
      id,
      name,
      slug
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

// Valida UUIDs usados por livros e autores.
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

// Normaliza o objeto retornado pelo Supabase.
function normalizeBook(book) {
  if (!book) {
    return null;
  }

  const genres = (
    book.book_genres ?? []
  )
    .map(
      (relation) => relation.genres
    )
    .filter(Boolean)
    .map((genre) => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug
    }));

  return {
    id: book.id,
    authorId: book.author_id,
    title: book.title,
    description: book.description,
    coverPath: book.cover_path,
    status: book.status,
    publicationStatus:
      book.publication_status,
    language: book.language,
    publishedAt: book.published_at,
    createdAt: book.created_at,
    updatedAt: book.updated_at,
    genres
  };
}

// Normaliza erros conhecidos do banco.
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

  if (
    message.includes(
      "authentication required"
    )
  ) {
    return createError(
      "UNAUTHENTICATED",
      "Nenhum usuário autenticado."
    );
  }

  if (
    message.includes(
      "book not found"
    )
  ) {
    return createError(
      "NOT_FOUND",
      "Livro não encontrado."
    );
  }

  if (
    message.includes(
      "book title is required"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "Título do livro é obrigatório."
    );
  }

  if (
    message.includes(
      "between 1 and 3 genres"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "O livro deve possuir entre 1 e 3 gêneros."
    );
  }

  if (
    message.includes(
      "genre ids must be unique"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "Os gêneros não podem ser repetidos."
    );
  }

  if (
    message.includes(
      "one or more genres do not exist"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "Um ou mais gêneros não existem."
    );
  }

  if (
    message.includes(
      "published book requires a description"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "O livro precisa possuir uma descrição para ser publicado."
    );
  }

  if (
    message.includes(
      "published book requires between 1 and 3 genres"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "O livro precisa possuir entre 1 e 3 gêneros para ser publicado."
    );
  }

  if (
    message.includes(
      "published book requires at least 1 published chapter"
    ) ||
    message.includes(
      "a published book must have at least 1 published chapter"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "O livro precisa possuir pelo menos um capítulo publicado."
    );
  }

  return createError(
    "UNKNOWN",
    defaultMessage
  );
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

  return null;
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

// Busca um livro completo pelo ID.
async function fetchBookById(id) {
  const {
    data,
    error
  } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return normalizeSupabaseError(
      error,
      "Não foi possível buscar o livro."
    );
  }

  if (!data) {
    return createError(
      "NOT_FOUND",
      "Livro não encontrado."
    );
  }

  return {
    data: normalizeBook(data),
    error: null
  };
}

export const supabaseBookAdapter = {
  // Retorna os livros publicados do catálogo.
  async getBooks() {
    const {
      data,
      error
    } = await supabase
      .from("books")
      .select(BOOK_SELECT)
      .eq("status", "published")
      .order("published_at", {
        ascending: false
      });

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível buscar os livros."
      );
    }

    return {
      data: (data ?? []).map(
        normalizeBook
      ),
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

    return fetchBookById(id);
  },

  // Retorna todos os livros do usuário autenticado.
  async getMyBooks() {
    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const {
      data,
      error
    } = await supabase
      .from("books")
      .select(BOOK_SELECT)
      .eq("author_id", auth.user.id)
      .order("updated_at", {
        ascending: false
      });

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível buscar seus livros."
      );
    }

    return {
      data: (data ?? []).map(
        normalizeBook
      ),
      error: null
    };
  },

  // Retorna os livros publicados de um autor.
  async getBooksByAuthor(authorId) {
    if (!isValidUuid(authorId)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de autor inválido."
      );
    }

    const {
      data,
      error
    } = await supabase
      .from("books")
      .select(BOOK_SELECT)
      .eq("author_id", authorId)
      .eq("status", "published")
      .order("published_at", {
        ascending: false
      });

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível buscar os livros do autor."
      );
    }

    return {
      data: (data ?? []).map(
        normalizeBook
      ),
      error: null
    };
  },

  // Cria um novo livro em draft.
  async createBook(data) {
    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
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
      typeof data.title !== "string" ||
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
      data.description !== undefined &&
      data.description !== null &&
      typeof data.description !== "string"
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Descrição inválida."
      );
    }

    const description =
      data.description == null ||
      data.description.trim() === ""
        ? null
        : data.description.trim();

    const {
      data: bookId,
      error
    } = await supabase.rpc(
      "create_book",
      {
        p_title:
          data.title.trim(),
        p_description:
          description,
        p_genre_ids:
          data.genreIds
      }
    );

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível criar o livro."
      );
    }

    return fetchBookById(bookId);
  },

  // Atualiza os dados de um livro.
  async updateBook(id, data) {
    if (!isValidUuid(id)) {
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
          allowedFields.includes(key)
      );

    if (!hasAllowedField) {
      return createError(
        "VALIDATION_ERROR",
        "Nenhum dado válido para atualizar."
      );
    }

    const update = {};

    if ("title" in data) {
      if (
        typeof data.title !== "string" ||
        data.title.trim() === ""
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Título do livro é obrigatório."
        );
      }

      update.title =
        data.title.trim();
    }

    if ("description" in data) {
      if (
        data.description !== null &&
        typeof data.description !== "string"
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Descrição inválida."
        );
      }

      update.description =
        data.description == null ||
        data.description.trim() === ""
          ? null
          : data.description.trim();
    }

    if ("coverPath" in data) {
      if (
        data.coverPath !== null &&
        typeof data.coverPath !== "string"
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Capa inválida."
        );
      }

      update.cover_path =
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

      update.publication_status =
        data.publicationStatus;
    }

    if ("language" in data) {
      if (
        typeof data.language !== "string" ||
        data.language.trim() === ""
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Idioma inválido."
        );
      }

      update.language =
        data.language.trim();
    }

    if ("genreIds" in data) {
      const genreError =
        validateGenreIds(
          data.genreIds
        );

      if (genreError) {
        return genreError;
      }
    }

    // Atualiza os campos da tabela books.
    if (Object.keys(update).length > 0) {
      const {
        data: updatedBook,
        error
      } = await supabase
        .from("books")
        .update(update)
        .eq("id", id)
        .eq(
          "author_id",
          auth.user.id
        )
        .select("id")
        .maybeSingle();

      if (error) {
        return normalizeSupabaseError(
          error,
          "Não foi possível atualizar o livro."
        );
      }

      if (!updatedBook) {
        return createError(
          "NOT_FOUND",
          "Livro não encontrado."
        );
      }
    }

    // Atualiza os gêneros pela RPC segura.
    if ("genreIds" in data) {
      const {
        error
      } = await supabase.rpc(
        "set_book_genres",
        {
          p_book_id: id,
          p_genre_ids:
            data.genreIds
        }
      );

      if (error) {
        return normalizeSupabaseError(
          error,
          "Não foi possível atualizar os gêneros do livro."
        );
      }
    }

    return fetchBookById(id);
  },

  // Publica um livro.
  async publishBook(id) {
    if (!isValidUuid(id)) {
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
      .from("books")
      .update({
        status: "published"
      })
      .eq("id", id)
      .eq(
        "author_id",
        auth.user.id
      )
      .select("id")
      .maybeSingle();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível publicar o livro."
      );
    }

    if (!data) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    return fetchBookById(id);
  },

  // Exclui um livro.
  async deleteBook(id) {
    if (!isValidUuid(id)) {
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
      .from("books")
      .delete()
      .eq("id", id)
      .eq(
        "author_id",
        auth.user.id
      )
      .select("id")
      .maybeSingle();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível excluir o livro."
      );
    }

    if (!data) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    return {
      data: {
        id: data.id
      },
      error: null
    };
  }
};