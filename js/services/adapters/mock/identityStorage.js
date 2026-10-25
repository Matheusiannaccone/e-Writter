import { mockUsers, mockProfiles } from './mockData.js';

const KEY = 'e-writter-mock-identity-v1';
const ITERATIONS = 210000;
const failure = message => Object.assign(new Error(message), { code: 'UNKNOWN_ERROR' });
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const unhex = text => Uint8Array.from(text.match(/../g), byte => parseInt(byte, 16));

export function identityFailure(error) {
  return { data: null, error: { code: typeof error.code === 'string' ? error.code : 'UNKNOWN_ERROR', message: error.message || 'Não foi possível acessar os dados de demonstração.' } };
}

function validate(state) {
  if (state.version !== 1 || !Array.isArray(state.accounts) || !Array.isArray(state.profiles)) throw failure('Armazenamento de demonstração inválido ou incompatível.');
  const ids = new Set(), emails = new Set(), names = new Set();
  for (const account of state.accounts) {
    if (typeof account.id !== 'string' || !account.id || typeof account.email !== 'string' || !account.email || ids.has(account.id) || emails.has(account.email.toLowerCase())) throw failure('Contas de demonstração inconsistentes.');
    ids.add(account.id); emails.add(account.email.toLowerCase());
    const v = account.verifier;
    if (v && (v.algorithm !== 'PBKDF2' || v.iterations !== ITERATIONS || !/^[a-f0-9]{32}$/.test(v.salt) || !/^[a-f0-9]{64}$/.test(v.digest))) throw failure('Verificador de demonstração inválido.');
    if (!v && !mockUsers.some(user => user.id === account.id && user.email.toLowerCase() === account.email.toLowerCase())) throw failure('Conta de demonstração sem verificador.');
  }
  const profileIds = new Set();
  for (const profile of state.profiles) {
    if (!ids.has(profile.id) || profileIds.has(profile.id) || !/^[a-z0-9._]{3,30}$/.test(profile.username) || names.has(profile.username) || typeof profile.displayName !== 'string' || !profile.displayName.trim() || profile.displayName.length > 60 || (profile.bio != null && (typeof profile.bio !== 'string' || profile.bio.length > 500))) throw failure('Perfis de demonstração inconsistentes.');
    profileIds.add(profile.id); names.add(profile.username);
  }
  if (profileIds.size !== ids.size) throw failure('Conta de demonstração sem perfil.');
  return state;
}

// Projeção explícita: nunca serializar os fixtures ou objetos com password.
function snapshot(state) {
  return {
    version: 1,
    accounts: state.accounts.map(({ id, email, verifier }) => ({ id, email, verifier: verifier ? { algorithm: 'PBKDF2', iterations: ITERATIONS, salt: verifier.salt, digest: verifier.digest } : null })),
    profiles: state.profiles.map(({ id, username, displayName, bio, avatarPath, createdAt, updatedAt }) => ({ id, username, displayName, bio: bio ?? null, avatarPath: avatarPath ?? null, createdAt, updatedAt }))
  };
}

export function readIdentity() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); }
  catch { throw failure('Não foi possível ler os dados de demonstração. Verifique o armazenamento do navegador.'); }
  const state = { version: 1, accounts: mockUsers.map(({ id, email }) => ({ id, email: email.toLowerCase(), verifier: null })), profiles: mockProfiles.map(profile => ({ ...profile })) };
  if (saved !== null) {
    validate(saved);
    for (const account of saved.accounts) {
      const index = state.accounts.findIndex(item => item.id === account.id);
      if (index < 0) state.accounts.push(account); else state.accounts[index] = account;
    }
    for (const profile of saved.profiles) {
      const index = state.profiles.findIndex(item => item.id === profile.id);
      if (index < 0) state.profiles.push(profile); else state.profiles[index] = profile;
    }
  }
  return validate(snapshot(state));
}

export async function writeIdentity(change) {
  const commit = () => {
    const state = readIdentity();
    const result = change(state);
    validate(state);
    try { localStorage.setItem(KEY, JSON.stringify(snapshot(state))); }
    catch { throw failure('Não foi possível salvar os dados de demonstração. Nenhuma alteração foi confirmada.'); }
    return result;
  };
  // Serializa gravações entre abas quando Web Locks está disponível.
  if (globalThis.navigator?.locks) return navigator.locks.request(KEY, commit);
  return commit();
}

export function identityUser(state, id) {
  const account = state.accounts.find(item => item.id === id);
  const profile = state.profiles.find(item => item.id === id);
  return account && profile ? { id, email: account.email, username: profile.username, displayName: profile.displayName } : null;
}

async function digest(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256)));
}

export async function createVerifier(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { algorithm: 'PBKDF2', iterations: ITERATIONS, salt: hex(salt), digest: await digest(password, salt) };
}

export async function verifyPassword(account, password) {
  if (!account.verifier) return mockUsers.some(user => user.id === account.id && user.password === password);
  const actual = await digest(password, unhex(account.verifier.salt));
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual.charCodeAt(index) ^ account.verifier.digest.charCodeAt(index);
  return difference === 0;
}
