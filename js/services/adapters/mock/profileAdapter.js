// services/adapters/mock/profileAdapter.js
// Este arquivo contém funções de mock para simular operações de perfil.
// As funções lançam erros indicando que não foram implementadas.

// Busca um perfil Mock pelo ID.
export async function getProfile(userId) {
  throw new Error("Not implemented");
}

// Busca o perfil Mock do usuário autenticado.
export async function getMyProfile() {
  throw new Error("Not implemented");
}

// Busca um perfil Mock pelo username.
export async function getProfileByUsername(username) {
  throw new Error("Not implemented");
}

// Atualiza o perfil Mock do usuário autenticado.
export async function updateMyProfile(data) {
  throw new Error("Not implemented");
}