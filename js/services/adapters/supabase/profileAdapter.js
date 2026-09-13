// services/adapters/supabase/profileAdapter.js
// Este arquivo contém funções para operações de perfil usando Supabase.
// As funções lançam erros indicando que não foram implementadas.

import { supabase } from "../../supabaseClient.js";

// Converte os nomes das colunas do banco para o formato usado no front.
function normalizeProfile(profile) {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    avatarPath: profile.avatar_path,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at
  };
}

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

export const supabaseProfileAdapter = {
  // Busca um perfil pelo ID do usuário.
  async getProfile(userId) {
    if (
      typeof userId !== "string" ||
      userId.trim() === ""
    ) {
      return createError(
        "VALIDATION_ERROR",
        "ID de usuário inválido."
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return createError(
        "UNKNOWN",
        "Não foi possível buscar o perfil."
      );
    }

    if (!data) {
      return createError(
        "NOT_FOUND",
        "Perfil não encontrado."
      );
    }

    return {
      data: normalizeProfile(data),
      error: null
    };
  },

  // Busca o perfil do usuário autenticado.
  async getMyProfile() {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createError(
        "UNAUTHENTICATED",
        "Nenhum usuário autenticado."
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return createError(
        "UNKNOWN",
        "Não foi possível buscar o perfil."
      );
    }

    if (!data) {
      return createError(
        "NOT_FOUND",
        "Perfil não encontrado."
      );
    }

    return {
      data: normalizeProfile(data),
      error: null
    };
  },

  // Busca um perfil pelo username.
  async getProfileByUsername(username) {
    if (typeof username !== "string") {
      return createError(
        "VALIDATION_ERROR",
        "Nome de usuário inválido."
      );
    }

    const normalizedUsername =
      username.trim().toLowerCase();

    if (
      normalizedUsername.length < 3 ||
      normalizedUsername.length > 30 ||
      !/^[a-z0-9._]+$/.test(normalizedUsername)
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Nome de usuário inválido."
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (error) {
      return createError(
        "UNKNOWN",
        "Não foi possível buscar o perfil."
      );
    }

    if (!data) {
      return createError(
        "NOT_FOUND",
        "Perfil não encontrado."
      );
    }

    return {
      data: normalizeProfile(data),
      error: null
    };
  },

// Atualiza o perfil do usuário autenticado.
async updateMyProfile(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return createError(
      "VALIDATION_ERROR",
      "Dados de perfil inválidos."
    );
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createError(
      "UNAUTHENTICATED",
      "Nenhum usuário autenticado."
    );
  }

  const update = {};

  // Normaliza e valida o username.
  if (data.username !== undefined) {
    if (typeof data.username !== "string") {
      return createError(
        "VALIDATION_ERROR",
        "Nome de usuário inválido."
      );
    }

    const username = data.username
      .trim()
      .toLowerCase();

    if (
      username.length < 3 ||
      username.length > 30 ||
      !/^[a-z0-9._]+$/.test(username)
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Nome de usuário inválido."
      );
    }

    update.username = username;
  }

  // Normaliza e valida o nome de exibição.
  if (data.displayName !== undefined) {
    if (typeof data.displayName !== "string") {
      return createError(
        "VALIDATION_ERROR",
        "Nome de exibição inválido."
      );
    }

    const displayName = data.displayName.trim();

    if (
      displayName.length < 1 ||
      displayName.length > 60
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Nome de exibição inválido."
      );
    }

    update.display_name = displayName;
  }

  // Valida a bio e converte texto vazio para null.
  if (data.bio !== undefined) {
    if (
      data.bio !== null &&
      typeof data.bio !== "string"
    ) {
      return createError(
        "VALIDATION_ERROR",
        "Biografia inválida."
      );
    }

    if (
      typeof data.bio === "string" &&
      data.bio.length > 500
    ) {
      return createError(
        "VALIDATION_ERROR",
        "A biografia deve conter no máximo 500 caracteres."
      );
    }

    update.bio =
      data.bio === null ||
      data.bio.trim() === ""
        ? null
        : data.bio;
  }

  // Impede atualização sem campos válidos.
  if (Object.keys(update).length === 0) {
    return createError(
      "VALIDATION_ERROR",
      "Nenhum campo válido foi informado para atualização."
    );
  }

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    // Código PostgreSQL de violação de UNIQUE.
    if (error.code === "23505") {
      return createError(
        "CONFLICT",
        "Este nome de usuário já está em uso."
      );
    }

    return createError(
      "UNKNOWN",
      "Não foi possível atualizar o perfil."
    );
  }

  if (!updatedProfile) {
    return createError(
      "NOT_FOUND",
      "Perfil não encontrado."
    );
  }

  return {
    data: normalizeProfile(updatedProfile),
    error: null
  };
}
};