// services/profileService.js

import { getDataSource } from "../dataSource.js";

import * as mockProfileAdapter from "../adapters/mock/profileAdapter.js";
import * as supabaseProfileAdapter from "../adapters/supabase/profileAdapter.js";

// Retorna o adapter de perfil conforme a fonte de dados atual.
function getProfileAdapter() {
  const dataSource = getDataSource();

  if (dataSource === "mock") {
    return mockProfileAdapter;
  }

  return supabaseProfileAdapter;
}

// Busca um perfil pelo ID do usuário.
export async function getProfile(userId) {
  const adapter = getProfileAdapter();
  return adapter.getProfile(userId);
}

// Busca o perfil do usuário autenticado.
export async function getMyProfile() {
  const adapter = getProfileAdapter();
  return adapter.getMyProfile();
}

// Busca um perfil pelo nome de usuário.
export async function getProfileByUsername(username) {
  const adapter = getProfileAdapter();
  return adapter.getProfileByUsername(username);
}

// Atualiza os dados do perfil do usuário autenticado.
export async function updateMyProfile(data) {
  const adapter = getProfileAdapter();
  return adapter.updateMyProfile(data);
}