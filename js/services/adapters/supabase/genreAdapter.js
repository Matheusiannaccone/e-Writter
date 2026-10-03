// Adapter Supabase responsável pelas operações de gêneros.

import { supabase } from "../../supabaseClient.js";

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

// Identifica falhas de conexão com o servidor.
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

  return createError(
    "UNKNOWN",
    defaultMessage
  );
}

export const supabaseGenreAdapter = {
  // Retorna todos os gêneros em ordem alfabética.
  async getGenres() {
    const { data, error } = await supabase
      .from("genres")
      .select("id, name, slug")
      .order("name", {
        ascending: true
      });

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível buscar os gêneros."
      );
    }

    return {
      data: data ?? [],
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

    const { data, error } = await supabase
      .from("genres")
      .select("id, name, slug")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível buscar o gênero."
      );
    }

    if (!data) {
      return createError(
        "NOT_FOUND",
        "Gênero não encontrado."
      );
    }

    return {
      data,
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

    const { data, error } = await supabase
      .from("genres")
      .select("id, name, slug")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (error) {
      return normalizeSupabaseError(
        error,
        "Não foi possível buscar o gênero."
      );
    }

    if (!data) {
      return createError(
        "NOT_FOUND",
        "Gênero não encontrado."
      );
    }

    return {
      data,
      error: null
    };
  }
};