// services/adapters/mock/profileAdapter.js
// Este arquivo contém funções de mock para simular operações de perfil.
// As funções lançam erros indicando que não foram implementadas.

import { mockAuthAdapter } from "./authAdapter.js";

// Perfis disponíveis no ambiente Mock.
const mockProfiles = [
  {
    id: "mock-user-1",
    username: "teste1",
    displayName: "Usuário Teste 1",
    bio: null,
    avatarPath: null,
    createdAt: "2026-08-31T12:00:00.000Z",
    updatedAt: "2026-08-31T12:00:00.000Z"
  }
];

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

// Valida e normaliza os dados enviados para atualização.
function normalizeProfileUpdate(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return createError(
      "VALIDATION_ERROR",
      "Dados de perfil inválidos."
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

    const username = data.username.trim().toLowerCase();

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

    update.displayName = displayName;
  }

  // Valida a bio e converte texto vazio para null.
  if (data.bio !== undefined) {
    if (data.bio !== null && typeof data.bio !== "string") {
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
      data.bio === null || data.bio.trim() === ""
        ? null
        : data.bio;
  }

  // Impede atualizações sem nenhum campo válido.
  if (Object.keys(update).length === 0) {
    return createError(
      "VALIDATION_ERROR",
      "Nenhum campo válido foi informado para atualização."
    );
  }

  return {
    data: update,
    error: null
  };
}

// Adapter Mock das operações de perfil.
export const mockProfileAdapter = {
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

    const profile = mockProfiles.find(
      (item) => item.id === userId
    );

    if (!profile) {
      return createError(
        "NOT_FOUND",
        "Perfil não encontrado."
      );
    }

    return {
      data: { ...profile },
      error: null
    };
  },

  // Busca o perfil do usuário autenticado.
  async getMyProfile() {
    const {
      data: user,
      error
    } = await mockAuthAdapter.getCurrentUser();

    if (error) {
      return {
        data: null,
        error
      };
    }

    const profile = mockProfiles.find(
      (item) => item.id === user.id
    );

    if (!profile) {
      return createError(
        "NOT_FOUND",
        "Perfil não encontrado."
      );
    }

    return {
      data: { ...profile },
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

    // Padroniza o valor antes da consulta.
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

    const profile = mockProfiles.find(
      (item) => item.username === normalizedUsername
    );

    if (!profile) {
      return createError(
        "NOT_FOUND",
        "Perfil não encontrado."
      );
    }

    return {
      data: { ...profile },
      error: null
    };
  },

  // Atualiza o perfil do usuário autenticado.
  async updateMyProfile(data) {
    const {
      data: user,
      error: authError
    } = await mockAuthAdapter.getCurrentUser();

    if (authError) {
      return {
        data: null,
        error: authError
      };
    }

    const profile = mockProfiles.find(
      (item) => item.id === user.id
    );

    if (!profile) {
      return createError(
        "NOT_FOUND",
        "Perfil não encontrado."
      );
    }

    // Valida os campos antes de alterar o perfil.
    const {
      data: update,
      error: validationError
    } = normalizeProfileUpdate(data);

    if (validationError) {
      return {
        data: null,
        error: validationError
      };
    }

    // Impede que dois perfis utilizem o mesmo username.
    if (update.username !== undefined) {
      const usernameExists = mockProfiles.some(
        (item) =>
          item.username === update.username &&
          item.id !== user.id
      );

      if (usernameExists) {
        return createError(
          "CONFLICT",
          "Este nome de usuário já está em uso."
        );
      }
    }

    // Aplica as alterações e atualiza a data de modificação.
    Object.assign(profile, update, {
      updatedAt: new Date().toISOString()
    });

    return {
      data: { ...profile },
      error: null
    };
  }
};