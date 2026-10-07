// Adapter Mock responsável pelas operações de imagens.

import { mockAuthAdapter } from "./authAdapter.js";
import {
  mockProfiles,
  mockBooks,
  saveMockLibrary
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

// Arquivos de capa do mock ficam no navegador, separados dos metadados.
function openCoverDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB indisponível"));
    const request = indexedDB.open("e-writter-mock-covers", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("covers");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function coverOperation(mode, action) {
  const database = await openCoverDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction("covers", mode);
      const request = action(transaction.objectStore("covers"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
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

    try {
      await coverOperation("readwrite", (store) => store.put(file, bookId));
    } catch {
      return createError("UNKNOWN", "Não foi possível guardar a capa neste navegador.");
    }

    book.coverPath =
      path;

    book.updatedAt =
      new Date().toISOString();
    saveMockLibrary();

    return {
      data: {
        path
      },
      error: null
    };
  },

  // Retorna uma URL temporária de exibição para a capa simulada.
  async getBookCoverUrl(path) {
    const match = /^covers\/([0-9a-f-]{36})\/cover\.webp$/i.exec(path ?? "");
    if (!match) return createError("VALIDATION_ERROR", "Caminho de capa inválido.");
    try {
      const file = await coverOperation("readonly", (store) => store.get(match[1]));
      if (!file) return createError("NOT_FOUND", "Capa não encontrada neste navegador.");
      return { data: { url: URL.createObjectURL(file) }, error: null };
    } catch {
      return createError("UNKNOWN", "Não foi possível carregar a capa neste navegador.");
    }
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

    try {
      await coverOperation("readwrite", (store) => store.delete(bookId));
    } catch {
      return createError("UNKNOWN", "Não foi possível remover a capa neste navegador.");
    }

    book.coverPath =
      null;

    book.updatedAt =
      new Date().toISOString();
    saveMockLibrary();

    return {
      data: {
        path: null
      },
      error: null
    };
  }
};