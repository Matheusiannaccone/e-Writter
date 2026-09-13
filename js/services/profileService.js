// services/profileService.js

import { getProfileAdapter } from "./dataSource.js";

// Busca um perfil pelo ID do usuário.
export async function getProfile(userId) {
  return getProfileAdapter().getProfile(userId);
}

// Busca o perfil do usuário autenticado.
export async function getMyProfile() {
  return getProfileAdapter().getMyProfile();
}

// Busca um perfil pelo nome de usuário.
export async function getProfileByUsername(username) {
  return getProfileAdapter().getProfileByUsername(username);
}

// Atualiza o perfil do usuário autenticado.
export async function updateMyProfile(data) {
  return getProfileAdapter().updateMyProfile(data);
}