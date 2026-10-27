/**
 * Consulta e atualiza perfis no snapshot de identidade compartilhado com autenticação.
 * Valida campos editáveis e unicidade de username; erros são retornados em { data, error }.
 */
import { mockAuthAdapter } from "./authAdapter.js";
import { readIdentity, writeIdentity, identityFailure } from './identityStorage.js';

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

// Contas e perfis compartilham o mesmo snapshot; catálogo/favoritos não participam.
export const mockProfileAdapter = {
  async getProfile(userId) {
    if (typeof userId !== 'string' || !userId.trim()) return createError('VALIDATION_ERROR', 'ID de usuário inválido.');
    try {
      const profile = readIdentity().profiles.find(item => item.id === userId);
      return profile ? { data: { ...profile }, error: null } : createError('NOT_FOUND', 'Perfil não encontrado.');
    } catch (error) { return identityFailure(error); }
  },

  async getMyProfile() {
    const user = await mockAuthAdapter.getCurrentUser();
    if (user.error) return user;
    return this.getProfile(user.data.id);
  },

  async getProfileByUsername(username) {
    if (typeof username !== 'string' || !/^[a-z0-9._]{3,30}$/.test(username.trim().toLowerCase())) return createError('VALIDATION_ERROR', 'Nome de usuário inválido.');
    try {
      const profile = readIdentity().profiles.find(item => item.username === username.trim().toLowerCase());
      return profile ? { data: { ...profile }, error: null } : createError('NOT_FOUND', 'Perfil não encontrado.');
    } catch (error) { return identityFailure(error); }
  },

  async updateMyProfile(data) {
    const user = await mockAuthAdapter.getCurrentUser();
    if (user.error) return user;
    const normalized = normalizeProfileUpdate(data);
    if (normalized.error) return normalized;
    try {
      const profile = await writeIdentity(state => {
        const current = state.profiles.find(item => item.id === user.data.id);
        if (!current) throw Object.assign(new Error('Perfil não encontrado.'), { code: 'NOT_FOUND' });
        if (normalized.data.username && state.profiles.some(item => item.id !== user.data.id && item.username === normalized.data.username)) throw Object.assign(new Error('Este nome de usuário já está em uso.'), { code: 'CONFLICT' });
        Object.assign(current, normalized.data, { updatedAt: new Date().toISOString() });
        return { ...current };
      });
      return { data: profile, error: null };
    } catch (error) { return identityFailure(error); }
  }
};
