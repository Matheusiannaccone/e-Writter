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

  // A atualização será implementada na próxima etapa.
  async updateMyProfile(data) {
    throw new Error("Not implemented");
  }
};