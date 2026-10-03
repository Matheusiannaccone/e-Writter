// Adapter Supabase responsável pelas operações de imagens.

import { supabase } from "../../supabaseClient.js";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const AVATAR_MAX_SIZE =
  2 * 1024 * 1024;

const COVER_MAX_SIZE =
  5 * 1024 * 1024;

const AVATAR_MAX_WIDTH = 512;
const AVATAR_MAX_HEIGHT = 512;

const COVER_MAX_WIDTH = 1600;
const COVER_MAX_HEIGHT = 2400;

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
  const message =
    error?.message?.toLowerCase() ?? "";

  return (
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    message.includes("network request failed")
  );
}

// Normaliza erros do Supabase.
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
    message.includes("row-level security") ||
    message.includes("violates row-level security")
  ) {
    return createError(
      "FORBIDDEN",
      "Você não possui permissão para realizar esta operação."
    );
  }

  if (
    message.includes("payload too large") ||
    message.includes("file size")
  ) {
    return createError(
      "VALIDATION_ERROR",
      "Arquivo excede o tamanho máximo permitido."
    );
  }

  if (
    message.includes("mime type") ||
    message.includes("invalid mime")
  ) {
    return createError(
      "VALIDATION_ERROR",
      "Formato de imagem não permitido."
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

// Valida o arquivo antes da conversão.
function validateImageFile(
  file,
  maxSize
) {
  if (!(file instanceof Blob)) {
    return createError(
      "VALIDATION_ERROR",
      "Arquivo de imagem inválido."
    );
  }

  if (
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

// Carrega uma imagem para processamento.
function loadImage(file) {
  return new Promise(
    (resolve, reject) => {
      const objectUrl =
        URL.createObjectURL(file);

      const image =
        new Image();

      image.onload = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "Não foi possível processar a imagem."
          )
        );
      };

      image.src = objectUrl;
    }
  );
}

// Redimensiona e converte a imagem para WebP.
async function convertToWebp(
  file,
  maxWidth,
  maxHeight
) {
  let image;

  try {
    image =
      await loadImage(file);
  } catch {
    return createError(
      "VALIDATION_ERROR",
      "Arquivo de imagem inválido."
    );
  }

  const scale = Math.min(
    maxWidth / image.width,
    maxHeight / image.height,
    1
  );

  const width =
    Math.round(
      image.width * scale
    );

  const height =
    Math.round(
      image.height * scale
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    return createError(
      "UNKNOWN",
      "Não foi possível processar a imagem."
    );
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  const blob =
    await new Promise(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/webp",
          0.85
        );
      }
    );

  if (!blob) {
    return createError(
      "UNKNOWN",
      "Não foi possível converter a imagem."
    );
  }

  return {
    data: blob,
    error: null
  };
}

// Atualiza o avatar_path do perfil.
async function updateAvatarPath(
  userId,
  path
) {
  const {
    error
  } = await supabase
    .from("profiles")
    .update({
      avatar_path: path
    })
    .eq("id", userId);

  if (error) {
    return normalizeSupabaseError(
      error,
      "Não foi possível atualizar o avatar do perfil."
    );
  }

  return {
    data: true,
    error: null
  };
}

// Atualiza o cover_path do livro.
async function updateBookCoverPath(
  bookId,
  path
) {
  const {
    data,
    error
  } = await supabase
    .from("books")
    .update({
      cover_path: path
    })
    .eq("id", bookId)
    .select("id")
    .maybeSingle();

  if (error) {
    return normalizeSupabaseError(
      error,
      "Não foi possível atualizar a capa do livro."
    );
  }

  if (!data) {
    return createError(
      "NOT_FOUND",
      "Livro não encontrado."
    );
  }

  return {
    data: true,
    error: null
  };
}

export const supabaseImageAdapter = {
  // Envia ou substitui o avatar do usuário autenticado.
  async uploadAvatar(file) {
    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const validation =
      validateImageFile(
        file,
        AVATAR_MAX_SIZE
      );

    if (validation.error) {
      return validation;
    }

    const conversion =
      await convertToWebp(
        file,
        AVATAR_MAX_WIDTH,
        AVATAR_MAX_HEIGHT
      );

    if (conversion.error) {
      return conversion;
    }

    if (
      conversion.data.size >
      AVATAR_MAX_SIZE
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Imagem convertida excede o tamanho máximo permitido."
      );
    }

    const storagePath =
      `${auth.user.id}/avatar.webp`;

    const logicalPath =
      `avatars/${storagePath}`;

    const {
      error
    } = await supabase.storage
      .from("avatars")
      .upload(
        storagePath,
        conversion.data,
        {
          contentType:
            "image/webp",
          upsert: true
        }
      );

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível enviar o avatar."
      );
    }

    const pathUpdate =
      await updateAvatarPath(
        auth.user.id,
        logicalPath
      );

    if (pathUpdate.error) {
      return pathUpdate;
    }

    return {
      data: {
        path: logicalPath
      },
      error: null
    };
  },

  // Remove o avatar do usuário autenticado.
  async removeAvatar() {
    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const storagePath =
      `${auth.user.id}/avatar.webp`;

    const {
      error
    } = await supabase.storage
      .from("avatars")
      .remove([
        storagePath
      ]);

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível remover o avatar."
      );
    }

    const pathUpdate =
      await updateAvatarPath(
        auth.user.id,
        null
      );

    if (pathUpdate.error) {
      return pathUpdate;
    }

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

    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const validation =
      validateImageFile(
        file,
        COVER_MAX_SIZE
      );

    if (validation.error) {
      return validation;
    }

    const conversion =
      await convertToWebp(
        file,
        COVER_MAX_WIDTH,
        COVER_MAX_HEIGHT
      );

    if (conversion.error) {
      return conversion;
    }

    if (
      conversion.data.size >
      COVER_MAX_SIZE
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Imagem convertida excede o tamanho máximo permitido."
      );
    }

    const storagePath =
      `${bookId}/cover.webp`;

    const logicalPath =
      `covers/${storagePath}`;

    const {
      error
    } = await supabase.storage
      .from("covers")
      .upload(
        storagePath,
        conversion.data,
        {
          contentType:
            "image/webp",
          upsert: true
        }
      );

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível enviar a capa."
      );
    }

    const pathUpdate =
      await updateBookCoverPath(
        bookId,
        logicalPath
      );

    if (pathUpdate.error) {
      return pathUpdate;
    }

    return {
      data: {
        path: logicalPath
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

    const auth =
      await getAuthenticatedUser();

    if (auth.error) {
      return auth.error;
    }

    const storagePath =
      `${bookId}/cover.webp`;

    const {
      error
    } = await supabase.storage
      .from("covers")
      .remove([
        storagePath
      ]);

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível remover a capa."
      );
    }

    const pathUpdate =
      await updateBookCoverPath(
        bookId,
        null
      );

    if (pathUpdate.error) {
      return pathUpdate;
    }

    return {
      data: {
        path: null
      },
      error: null
    };
  }
};