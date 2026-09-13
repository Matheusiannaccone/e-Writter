// Adapter Supabase responsável pelas operações de capítulos.

import { supabase } from "../../supabaseClient.js";

// Campos retornados nas consultas.
const CHAPTER_SELECT = `
  id,
  book_id,
  title,
  content,
  status,
  position,
  published_at,
  created_at,
  updated_at
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

// Valida UUIDs.
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

// Normaliza o capítulo retornado pelo Supabase.
function normalizeChapter(chapter) {
  if (!chapter) {
    return null;
  }

  return {
    id: chapter.id,
    bookId: chapter.book_id,
    title: chapter.title,
    content: chapter.content,
    status: chapter.status,
    position: chapter.position,
    publishedAt: chapter.published_at,
    createdAt: chapter.created_at,
    updatedAt: chapter.updated_at
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
      "published chapter requires a title"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "O capítulo precisa possuir um título para ser publicado."
    );
  }

  if (
    message.includes(
      "published chapter content must contain between 500 and 15000 characters"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "O conteúdo do capítulo deve possuir entre 500 e 15000 caracteres."
    );
  }

  if (
    message.includes(
      "chapter position cannot be changed"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "A posição do capítulo não pode ser alterada."
    );
  }

  if (
    message.includes(
      "chapter cannot be moved to another book"
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "O capítulo não pode ser movido para outro livro."
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

// Verifica se o livro existe e pertence ao usuário.
async function validateOwnedBook(
  bookId,
  userId
) {
  const {
    data,
    error
  } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("author_id", userId)
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

  return {
    book: data,
    error: null
  };
}

// Busca um capítulo visível pelo ID.
async function fetchChapterById(id) {
  const {
    data,
    error
  } = await supabase
    .from("chapters")
    .select(CHAPTER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return normalizeSupabaseError(
      error,
      "Não foi possível buscar o capítulo."
    );
  }

  if (!data) {
    return createError(
      "NOT_FOUND",
      "Capítulo não encontrado."
    );
  }

  return {
    data: normalizeChapter(data),
    error: null
  };
}

export const supabaseChapterAdapter = {
  // Retorna os capítulos visíveis de um livro.
  async getChaptersByBook(bookId) {
    if (!isValidUuid(bookId)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de livro inválido."
      );
    }

    const {
      data,
      error
    } = await supabase
      .from("chapters")
      .select(CHAPTER_SELECT)
      .eq("book_id", bookId)
      .order("position", {
        ascending: true
      });

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível buscar os capítulos."
      );
    }

    // Distingue livro inexistente/oculto de livro sem capítulos.
    if ((data ?? []).length === 0) {
      const {
        data: book,
        error: bookError
      } = await supabase
        .from("books")
        .select("id")
        .eq("id", bookId)
        .maybeSingle();

      if (bookError) {
        return normalizeSupabaseError(
          bookError,
          "Não foi possível verificar o livro."
        );
      }

      if (!book) {
        return createError(
          "NOT_FOUND",
          "Livro não encontrado."
        );
      }
    }

    return {
      data: (data ?? []).map(
        normalizeChapter
      ),
      error: null
    };
  },

  // Busca um capítulo visível pelo ID.
  async getChapterById(id) {
    if (!isValidUuid(id)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de capítulo inválido."
      );
    }

    return fetchChapterById(id);
  },

  // Cria um novo capítulo no final do livro.
  async createChapter(bookId, data) {
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

    const ownership =
      await validateOwnedBook(
        bookId,
        auth.user.id
      );

    if (ownership.error) {
      return ownership.error;
    }

    if (
      !data ||
      typeof data !== "object"
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Dados do capítulo inválidos."
      );
    }

    if (
      data.title !== undefined &&
      data.title !== null &&
      typeof data.title !== "string"
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Título inválido."
      );
    }

    if (
      data.content !== undefined &&
      data.content !== null &&
      typeof data.content !== "string"
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Conteúdo inválido."
      );
    }

    const title =
      data.title == null ||
      data.title.trim() === ""
        ? null
        : data.title.trim();

    const content =
      data.content == null ||
      data.content === ""
        ? null
        : data.content;

    const {
      data: chapter,
      error
    } = await supabase
      .from("chapters")
      .insert({
        book_id: bookId,
        title,
        content
      })
      .select(CHAPTER_SELECT)
      .single();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível criar o capítulo."
      );
    }

    return {
      data:
        normalizeChapter(chapter),
      error: null
    };
  },

  // Atualiza título e conteúdo de um capítulo.
  async updateChapter(id, data) {
    if (!isValidUuid(id)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de capítulo inválido."
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
      "content"
    ];

    const keys =
      Object.keys(data);

    if (
      keys.some(
        (key) =>
          !allowedFields.includes(key)
      )
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Campo não permitido na atualização."
      );
    }

    const update = {};

    if ("title" in data) {
      if (
        data.title !== null &&
        typeof data.title !== "string"
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Título inválido."
        );
      }

      update.title =
        data.title == null ||
        data.title.trim() === ""
          ? null
          : data.title.trim();
    }

    if ("content" in data) {
      if (
        data.content !== null &&
        typeof data.content !== "string"
      ) {
        return createError(
          "VALIDATION_ERROR",
          "Conteúdo inválido."
        );
      }

      update.content =
        data.content == null ||
        data.content === ""
          ? null
          : data.content;
    }

    const {
      data: chapter,
      error
    } = await supabase
      .from("chapters")
      .update(update)
      .eq("id", id)
      .select(CHAPTER_SELECT)
      .maybeSingle();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível atualizar o capítulo."
      );
    }

    if (!chapter) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    return {
      data:
        normalizeChapter(chapter),
      error: null
    };
  },

  // Publica um capítulo.
  async publishChapter(id) {
    if (!isValidUuid(id)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de capítulo inválido."
      );
    }

    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const {
      data: chapter,
      error
    } = await supabase
      .from("chapters")
      .update({
        status: "published"
      })
      .eq("id", id)
      .select(CHAPTER_SELECT)
      .maybeSingle();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível publicar o capítulo."
      );
    }

    if (!chapter) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    return {
      data:
        normalizeChapter(chapter),
      error: null
    };
  },

  // Exclui o capítulo selecionado e todos os posteriores.
  async deleteChapter(id) {
    if (!isValidUuid(id)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de capítulo inválido."
      );
    }

    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    // Busca o capítulo para descobrir livro e posição.
    const {
      data: target,
      error: targetError
    } = await supabase
      .from("chapters")
      .select(
        "id, book_id, position"
      )
      .eq("id", id)
      .maybeSingle();

    if (targetError) {
      return normalizeSupabaseError(
        targetError,
        "Não foi possível buscar o capítulo."
      );
    }

    if (!target) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    // Confirma que o livro pertence ao usuário.
    const ownership =
      await validateOwnedBook(
        target.book_id,
        auth.user.id
      );

    if (ownership.error) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    // Obtém os IDs que serão removidos pela trigger.
    const {
      data: chaptersToDelete,
      error: listError
    } = await supabase
      .from("chapters")
      .select("id, position")
      .eq(
        "book_id",
        target.book_id
      )
      .gte(
        "position",
        target.position
      )
      .order(
        "position",
        {
          ascending: true
        }
      );

    if (listError) {
      return normalizeSupabaseError(
        listError,
        "Não foi possível verificar os capítulos que serão excluídos."
      );
    }

    const deletedIds =
      (chaptersToDelete ?? []).map(
        (chapter) => chapter.id
      );

    // A trigger remove automaticamente os capítulos posteriores.
    const {
      data: deleted,
      error
    } = await supabase
      .from("chapters")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível excluir o capítulo."
      );
    }

    if (!deleted) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    return {
      data: {
        id,
        deletedIds
      },
      error: null
    };
  }
};