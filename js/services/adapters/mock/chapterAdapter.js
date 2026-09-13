// Adapter Mock responsável pelas operações de capítulos.

import {
  mockBooks,
  mockChapters
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

// Valida UUIDs usados pelos capítulos e livros.
function isValidUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

// Cria uma cópia normalizada do capítulo.
function normalizeChapter(chapter) {
  if (!chapter) {
    return null;
  }

  return {
    id: chapter.id,
    bookId: chapter.bookId,
    title: chapter.title,
    content: chapter.content,
    status: chapter.status,
    position: chapter.position,
    publishedAt: chapter.publishedAt,
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt
  };
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

// Verifica se o usuário é autor do livro.
function isBookAuthor(book, user) {
  return (
    book &&
    user &&
    book.authorId === user.id
  );
}

// Retorna o livro relacionado ao capítulo.
function getBookById(bookId) {
  return mockBooks.find(
    (book) => book.id === bookId
  );
}

// Verifica se um capítulo pode ser visualizado.
function canViewChapter(
  chapter,
  book,
  user
) {
  if (!chapter || !book) {
    return false;
  }

  if (isBookAuthor(book, user)) {
    return true;
  }

  return (
    chapter.status === "published" &&
    book.status === "published"
  );
}

// Gera um UUID para novos capítulos.
function generateUuid() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    .replace(/[xy]/g, (char) => {
      const random =
        Math.random() * 16 | 0;

      const value =
        char === "x"
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    });
}

// Retorna a próxima posição disponível.
function getNextPosition(bookId) {
  const positions =
    mockChapters
      .filter(
        (chapter) =>
          chapter.bookId === bookId
      )
      .map(
        (chapter) =>
          chapter.position
      );

  if (positions.length === 0) {
    return 1;
  }

  return Math.max(...positions) + 1;
}

export const mockChapterAdapter = {
  // Retorna os capítulos visíveis de um livro.
  async getChaptersByBook(bookId) {
    if (!isValidUuid(bookId)) {
      return createError(
        "VALIDATION_ERROR",
        "ID de livro inválido."
      );
    }

    const book =
      getBookById(bookId);

    if (!book) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    const user =
      await getAuthenticatedUser();

    const chapters =
      mockChapters
        .filter(
          (chapter) =>
            chapter.bookId === bookId
        )
        .filter(
          (chapter) =>
            canViewChapter(
              chapter,
              book,
              user
            )
        )
        .sort(
          (a, b) =>
            a.position - b.position
        )
        .map(normalizeChapter);

    if (
      chapters.length === 0 &&
      book.status !== "published" &&
      !isBookAuthor(book, user)
    ) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
    }

    return {
      data: chapters,
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

    const chapter =
      mockChapters.find(
        (item) => item.id === id
      );

    if (!chapter) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    const book =
      getBookById(
        chapter.bookId
      );

    const user =
      await getAuthenticatedUser();

    if (
      !canViewChapter(
        chapter,
        book,
        user
      )
    ) {
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

  // Cria um capítulo no final do livro.
  async createChapter(bookId, data) {
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
      getBookById(bookId);

    if (
      !book ||
      !isBookAuthor(book, user)
    ) {
      return createError(
        "NOT_FOUND",
        "Livro não encontrado."
      );
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

    const now =
      new Date().toISOString();

    const chapter = {
      id: generateUuid(),
      bookId,
      title:
        data.title == null ||
        data.title.trim() === ""
          ? null
          : data.title.trim(),
      content:
        data.content == null ||
        data.content === ""
          ? null
          : data.content,
      status: "draft",
      position:
        getNextPosition(bookId),
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    };

    mockChapters.push(chapter);

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

    const user =
        await getAuthenticatedUser();

    if (!user) {
        return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
        );
    }

    const chapter =
        mockChapters.find(
        (item) => item.id === id
        );

    if (!chapter) {
        return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
        );
    }

    const book =
        getBookById(
        chapter.bookId
        );

    if (!isBookAuthor(book, user)) {
        return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
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

    let newTitle =
        chapter.title;

    let newContent =
        chapter.content;

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

        newTitle =
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

        newContent =
        data.content == null ||
        data.content === ""
            ? null
            : data.content;
    }

    // Capítulos publicados precisam continuar válidos após edição.
    if (chapter.status === "published") {
        if (
        newTitle === null ||
        newTitle.trim() === ""
        ) {
        return createError(
            "VALIDATION_ERROR",
            "O capítulo precisa possuir um título para ser publicado."
        );
        }

        if (
        newContent === null ||
        newContent.length < 500 ||
        newContent.length > 15000
        ) {
        return createError(
            "VALIDATION_ERROR",
            "O conteúdo do capítulo deve possuir entre 500 e 15000 caracteres."
        );
        }
    }

    // Aplica as alterações somente após todas as validações.
    chapter.title =
        newTitle;

    chapter.content =
        newContent;

    chapter.updatedAt =
        new Date().toISOString();

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

    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const chapter =
      mockChapters.find(
        (item) => item.id === id
      );

    if (!chapter) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    const book =
      getBookById(
        chapter.bookId
      );

    if (!isBookAuthor(book, user)) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    if (
      chapter.title === null ||
      chapter.title.trim() === ""
    ) {
      return createError(
        "VALIDATION_ERROR",
        "O capítulo precisa possuir um título para ser publicado."
      );
    }

    if (
      chapter.content === null ||
      chapter.content.length < 500 ||
      chapter.content.length > 15000
    ) {
      return createError(
        "VALIDATION_ERROR",
        "O conteúdo do capítulo deve possuir entre 500 e 15000 caracteres."
      );
    }

    const now =
      new Date().toISOString();

    if (
      chapter.status !== "published"
    ) {
      chapter.status =
        "published";

      chapter.publishedAt =
        now;
    }

    chapter.updatedAt =
      now;

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

    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const chapter =
      mockChapters.find(
        (item) => item.id === id
      );

    if (!chapter) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    const book =
      getBookById(
        chapter.bookId
      );

    if (!isBookAuthor(book, user)) {
      return createError(
        "NOT_FOUND",
        "Capítulo não encontrado."
      );
    }

    const deletedIds =
      mockChapters
        .filter(
          (item) =>
            item.bookId ===
              chapter.bookId &&
            item.position >=
              chapter.position
        )
        .map(
          (item) => item.id
        );

    for (
      let index =
        mockChapters.length - 1;
      index >= 0;
      index--
    ) {
      const item =
        mockChapters[index];

      if (
        item.bookId ===
          chapter.bookId &&
        item.position >=
          chapter.position
      ) {
        mockChapters.splice(
          index,
          1
        );
      }
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