/**
 * Fachada de perfis públicos e da edição da conta autenticada.
 * Mantém o contrato em camelCase; conversão de colunas e validação pertencem aos adapters.
 */
import { getProfileAdapter } from "./dataSource.js";

/**
 * Busca um perfil público pelo identificador da conta.
 * @param {string} userId - UUID no Supabase ou identificador da conta no Mock.
 * @returns {Promise<{data: object|null, error: object|null}>} Perfil público ou erro.
 */
export async function getProfile(userId) {
  return getProfileAdapter().getProfile(userId);
}

/**
 * Busca o perfil vinculado à sessão atual.
 * @returns {Promise<{data: object|null, error: object|null}>} Perfil próprio ou erro.
 */
export async function getMyProfile() {
  return getProfileAdapter().getMyProfile();
}

/**
 * Busca o perfil por username normalizado pelo adapter.
 * @param {string} username - Nome de usuário.
 * @returns {Promise<{data: object|null, error: object|null}>} Perfil público ou erro.
 */
export async function getProfileByUsername(username) {
  return getProfileAdapter().getProfileByUsername(username);
}

/**
 * Atualiza somente os campos de perfil aceitos pelo adapter para a conta atual.
 * @param {{username?: string, displayName?: string, bio?: string|null}} data - Campos editáveis.
 * @returns {Promise<{data: object|null, error: object|null}>} Perfil persistido ou erro, incluindo conflito de username.
 */
export async function updateMyProfile(data) {
  return getProfileAdapter().updateMyProfile(data);
}