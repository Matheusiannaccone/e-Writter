/**
 * Simula autenticação e recuperação usando identidade persistida no navegador.
 * Contas e perfis ficam em identityStorage/localStorage; a sessão é isolada por aba
 * em sessionStorage. O contador de revisão impede que login pendente reabra uma sessão encerrada.
 */
import { readIdentity, writeIdentity, identityUser, createVerifier, verifyPassword, identityFailure } from './identityStorage.js';
import { isValidEmail } from '../../../validation/email.js';

let currentUser = null;
let currentSession;
let sessionRevision = 0;
let cleanupPending = false;
const SESSION_KEY = 'e-writter-mock-user';
const SESSION_SECONDS = 3600;

/**
 * Invalida operações pendentes antes de tentar limpar a sessão da aba.
 * Falha de remoção mantém cleanupPending e emite SESSION_ERROR para bloquear a interface.
 * @returns {void} Em sucesso emite SIGNED_OUT.
 * @throws {Error} Se não for possível remover a sessão do armazenamento.
 */
function endSession() {
  sessionRevision++;
  currentUser = null;
  currentSession = null;
  cleanupPending = true;
  try { sessionStorage.removeItem(SESSION_KEY); }
  catch { notifyAuthStateChange('SESSION_ERROR', null); throw new Error('Não foi possível encerrar a sessão no armazenamento da aba. Tente sair novamente.'); }
  cleanupPending = false;
  notifyAuthStateChange('SIGNED_OUT', null);
}

function assertRevision(revision) {
  if (revision !== sessionRevision) throw Object.assign(new Error('A sessão mudou durante a operação. Entre novamente.'), { code: 'UNAUTHENTICATED' });
}
const authListeners = [];
const fail = (code, message) => ({ data: null, error: { code, message } });
const conflict = message => { throw Object.assign(new Error(message), { code: 'CONFLICT' }); };

/**
 * Reconcilia a sessão em memória com sessionStorage e com o snapshot de identidade.
 * Sessão inválida, expirada ou sem conta/perfil é encerrada sem apagar a identidade persistida.
 * @param {object} state - Snapshot validado de contas e perfis.
 * @returns {object|null} Sessão atual com usuário atualizado ou null.
 */
function sessionFor(state) {
  if (cleanupPending) endSession();
  // Um documento restaurado pelo bfcache pode manter a sessão antiga em memória.
  const raw = sessionStorage.getItem(SESSION_KEY);
  let saved;
  try { saved = JSON.parse(raw || 'null'); }
  catch { endSession(); return null; }
  if (raw !== null && (!saved || typeof saved.id !== 'string' ||
      (saved.expires_at !== undefined && (!Number.isFinite(saved.expires_at) || saved.expires_at <= 0)))) {
    endSession(); return null;
  }
  if (!saved) {
    if (currentSession) endSession();
    currentSession = null; currentUser = null; return null;
  }
  if (!currentSession || currentSession.user.id !== saved.id) {
    currentSession = { user: { id: saved.id }, expires_at: saved.expires_at };
  }
  if (saved.expires_at !== undefined && saved.expires_at * 1000 <= Date.now()) {
    endSession(); return null;
  }
  currentUser = currentSession ? identityUser(state, currentSession.user.id) : null;
  if (currentSession && (!currentUser || (currentSession.expires_at !== undefined && currentSession.expires_at * 1000 <= Date.now()))) {
    endSession(); return null;
  }
  if (!currentUser) { currentSession = null; return null; }
  currentSession.user = currentUser;
  return currentSession;
}

function startSession(user, revision) {
  assertRevision(revision);
  const expires_at = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, expires_at })); }
  catch { throw new Error('Os dados da conta estão disponíveis, mas não foi possível iniciar a sessão. Verifique o armazenamento da aba e entre novamente.'); }
  cleanupPending = false;
  currentUser = user;
  currentSession = { user, expires_at };
  notifyAuthStateChange('SIGNED_IN', currentSession);
  return currentSession;
}

function notifyAuthStateChange(event, session) {
  for (const callback of [...authListeners]) {
    try { Promise.resolve(callback(event, session)).catch(() => {}); }
    catch { /* Um consumidor não pode interromper a sessão ou os demais. */ }
  }
}

export const mockAuthAdapter = {
  async signUp({ email, password, username, displayName }) {
    if (!isValidEmail(email) || typeof password !== 'string' || password.length < 6 || typeof username !== 'string' || !/^[a-z0-9._]{3,30}$/.test(username) || typeof displayName !== 'string' || !displayName.trim() || displayName !== displayName.trim() || displayName.length > 60) {
      return fail('VALIDATION_ERROR', 'Confira e-mail, senha (mínimo de 6 caracteres), nome e usuário.');
    }
    const revision = sessionRevision;
    try {
      const verifier = await createVerifier(password);
      const normalizedEmail = email.trim().toLowerCase();
      const user = await writeIdentity(state => {
        if (state.accounts.some(item => item.email.toLowerCase() === normalizedEmail)) conflict('Este e-mail já está em uso.');
        if (state.profiles.some(item => item.username === username)) conflict('Este nome de usuário já está em uso.');
        let id;
        do { id = 'mock-user-' + crypto.randomUUID(); } while (state.accounts.some(item => item.id === id));
        const now = new Date().toISOString();
        state.accounts.push({ id, email: normalizedEmail, verifier });
        state.profiles.push({ id, username, displayName, bio: null, avatarPath: null, createdAt: now, updatedAt: now });
        return identityUser(state, id);
      });
      const session = startSession(user, revision);
      return { data: { user, session }, error: null };
    } catch (error) { return identityFailure(error); }
  },

  // Resposta neutra: a demonstração não envia e-mail nem confirma se a conta existe.
  async resetPasswordForEmail({ email }) {
    if (!isValidEmail(email)) return fail('VALIDATION_ERROR', 'Informe um e-mail válido.');
    return { data: { message: 'Solicitação de recuperação simulada. Nenhum e-mail foi enviado. Use uma conta de teste autenticada para demonstrar a redefinição.' }, error: null };
  },

  // No Mock, uma sessão autenticada comum habilita a demonstração da redefinição.
  async getPasswordRecoverySession() {
    try {
      const session = sessionFor(readIdentity());
      if (!session || (session.expires_at && session.expires_at * 1000 <= Date.now())) return fail('INVALID_RECOVERY_LINK', 'Link inválido ou expirado. No ambiente de demonstração, entre com uma conta de teste antes de abrir esta página.');
      return { data: session, error: null };
    } catch (error) { return identityFailure(error); }
  },

  async updatePassword({ password }) {
    if (typeof password !== 'string' || password.length < 6) return fail('VALIDATION_ERROR', 'A senha deve conter pelo menos 6 caracteres.');
    const revision = sessionRevision;
    const recovery = await this.getPasswordRecoverySession();
    if (recovery.error) return recovery;
    try {
      const id = recovery.data.user.id;
      const verifier = await createVerifier(password);
      await writeIdentity(state => {
        assertRevision(revision);
        const account = state.accounts.find(item => item.id === id);
        if (!account) throw new Error('Conta de demonstração indisponível.');
        account.verifier = verifier;
      });
      return { data: { id, email: recovery.data.user.email, message: 'Senha atualizada na demonstração. Você já pode entrar com a nova senha.' }, error: null };
    } catch (error) { return identityFailure(error); }
  },

  async signIn({ email, password }) {
    if (!isValidEmail(email) || typeof password !== 'string') return fail('UNAUTHENTICATED', 'E-mail ou senha inválidos.');
    const revision = sessionRevision;
    try {
      const state = readIdentity();
      const account = state.accounts.find(item => item.email.toLowerCase() === email.trim().toLowerCase());
      if (!account || !await verifyPassword(account, password)) return fail('UNAUTHENTICATED', 'E-mail ou senha inválidos.');
      return { data: startSession(identityUser(readIdentity(), account.id), revision), error: null };
    } catch (error) { return identityFailure(error); }
  },

  async signOut() {
    try { endSession(); return { data: null, error: null }; }
    catch (error) { return identityFailure(error); }
  },

  async getSession() {
    try { return { data: sessionFor(readIdentity()), error: null }; }
    catch (error) { return identityFailure(error); }
  },

  async getCurrentUser() {
    const result = await this.getSession();
    if (result.error) return result;
    if (!result.data) return fail('UNAUTHENTICATED', 'Nenhuma sessão autenticada encontrada.');
    return { data: result.data.user, error: null };
  },

  onAuthStateChange(callback) {
    authListeners.push(callback);

    return {
        data: {
            subscription: {
                unsubscribe() {
                  const index = authListeners.indexOf(callback);

                  if (index !== -1) {
                    authListeners.splice(index, 1);
                  }
                }
            }
        }
    }
  }
};
