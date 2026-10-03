// Adapter Mock responsável pelas operações de gêneros.

import { mockGenres } from "./mockData.js";

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

export const mockGenreAdapter = {
  // Retorna todos os gêneros em ordem alfabética.
  async getGenres() {
    const genres = [...mockGenres].sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "pt-BR"
        )
    );

    return {
      data: genres,
      error: null
    };
  },

  // Busca um gênero pelo ID.
  async getGenreById(id) {
    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return createError(
        "VALIDATION_ERROR",
        "ID de gênero inválido."
      );
    }

    const genre = mockGenres.find(
      (item) => item.id === id
    );

    if (!genre) {
      return createError(
        "NOT_FOUND",
        "Gênero não encontrado."
      );
    }

    return {
      data: { ...genre },
      error: null
    };
  },

  // Busca um gênero pelo slug.
  async getGenreBySlug(slug) {
    if (typeof slug !== "string") {
      return createError(
        "VALIDATION_ERROR",
        "Slug de gênero inválido."
      );
    }

    const normalizedSlug =
      slug.trim().toLowerCase();

    if (normalizedSlug === "") {
      return createError(
        "VALIDATION_ERROR",
        "Slug de gênero inválido."
      );
    }

    const genre = mockGenres.find(
      (item) =>
        item.slug === normalizedSlug
    );

    if (!genre) {
      return createError(
        "NOT_FOUND",
        "Gênero não encontrado."
      );
    }

    return {
      data: { ...genre },
      error: null
    };
  }
};