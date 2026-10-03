// Adapter Mock responsável pelas operações de imagens.

import { mockAuthAdapter } from "./authAdapter.js";
import {
  mockProfiles,
  mockBooks
} from "./mockData.js";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const AVATAR_MAX_SIZE =
  2 * 1024 * 1024;

const COVER_MAX_SIZE =
  5 * 1024 * 1024;

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

// Busca o usuário autenticado no Mock.
async function getAuthenticatedUser() {
  const result =
    await mockAuthAdapter.getCurrentUser();

  if (
    result.error ||
    !result.data
  ) {
    return null;
  }

  return result.data;
}

// Valida o arquivo enviado.
function validateImageFile(
  file,
  maxSize
) {
  if (
    !file ||
    typeof file !== "object"
  ) {
    return createError(
      "VALIDATION_ERROR",
      "Arquivo de imagem inválido."
    );
  }

  if (
    typeof file.type !== "string" ||
    !ALLOWED_IMAGE_TYPES.includes(
      file.type
    )
  ) {
    return createError(
      "VALIDATION_ERROR",
      "Formato de imagem não permitido."
    );
  }

  if (
    typeof file.size !== "number" ||
    file.size <= 0
  ) {
    return createError(
      "VALIDATION_ERROR",
      "Arquivo de imagem inválido."
    );
  }

  if (file.size > maxSize) {
    return createError(
      "VALIDATION_ERROR",
      "Arquivo excede o tamanho máximo permitido."
    );
  }

  return {
    data: true,
    error: null
  };
}

export const mockImageAdapter = {
  // Envia ou substitui o avatar do usuário autenticado.
  async uploadAvatar(file) {
    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const validation =
      validateImageFile(
        file,
        AVATAR_MAX_SIZE
      );

    if (validation.error) {
      return validation;
    }

    const profile =
      mockProfiles.find(
        (item) =>
          item.id === user.id
      );

    if (!profile) {
      return createError(
        "NOT_FOUND",
        "Perfil não encontrado."
      );
    }

    const path =
      `avatars/${user.id}/avatar.webp`;

    profile.avatarPath =
      path;

    profile.updatedAt =
      new Date().toISOString();

    return {
      data: {
        path
      },
      error: null
    };
  },

  // Remove o avatar do usuário autenticado.
  async removeAvatar() {
    const user =
      await getAuthenticatedUser();

    if (!user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const profile =
      mockProfiles.find(
        (item) =>
          item.id === user.id
      );

    if (!profile) {
      return createError(
        "NOT_FOUND",
        "Perfil não encontrado."
      );
    }

    profile.avatarPath =
      null;

    profile.updatedAt =
      new Date().toISOString();

    return {
      data: {
        path: null
      },
      error: null
    };
  },

  // Envia ou substitui a capa de um livro.
  async uploadBookCover(
    bookId,
    file
  ) {
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

    const validation =
      validateImageFile(
        file,
        COVER_MAX_SIZE
      );

    if (validation.error) {
      return validation;
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

    if (
      book.authorId !== user.id
    ) {
      return createError(
        "FORBIDDEN",
        "Você não possui permissão para alterar a capa deste livro."
      );
    }

    const path =
      `covers/${bookId}/cover.webp`;

    book.coverPath =
      path;

    book.updatedAt =
      new Date().toISOString();

    return {
      data: {
        path
      },
      error: null
    };
  },

  // Remove a capa de um livro.
  async removeBookCover(bookId) {
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

    if (
      book.authorId !== user.id
    ) {
      return createError(
        "FORBIDDEN",
        "Você não possui permissão para alterar a capa deste livro."
      );
    }

    book.coverPath =
      null;

    book.updatedAt =
      new Date().toISOString();

    return {
      data: {
        path: null
      },
      error: null
    };
  }
};