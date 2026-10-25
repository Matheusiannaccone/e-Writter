import { readIdentity, writeIdentity, identityUser, createVerifier, verifyPassword, identityFailure } from './identityStorage.js';
import { isValidEmail } from '../../../validation/email.js';

let currentUser = null;
let currentSession;
const authListeners = [];
const fail = (code, message) => ({ data: null, error: { code, message } });
const conflict = message => { throw Object.assign(new Error(message), { code: 'CONFLICT' }); };

function sessionFor(state) {
  // As contas são hidratadas antes de consultar a identidade da sessão.
  if (currentSession === undefined) {
    const saved = JSON.parse(sessionStorage.getItem('e-writter-mock-user') || 'null');
    currentSession = saved?.id ? { user: { id: saved.id } } : null;
  }
  currentUser = currentSession ? identityUser(state, currentSession.user.id) : null;
  if (!currentUser) { currentSession = null; return null; }
  currentSession.user = currentUser;
  return currentSession;
}

function startSession(user) {
  try { sessionStorage.setItem('e-writter-mock-user', JSON.stringify({ id: user.id })); }
  catch { throw new Error('Os dados da conta estão disponíveis, mas não foi possível iniciar a sessão. Verifique o armazenamento da aba e entre novamente.'); }
  currentUser = user;
  currentSession = { user };
  notifyAuthStateChange('SIGNED_IN', currentSession);
  return currentSession;
}

function notifyAuthStateChange(event, session) {
  authListeners.forEach(callback => callback(event, session));
}

export const mockAuthAdapter = {
  async signUp({ email, password, username, displayName }) {
    if (!isValidEmail(email) || typeof password !== 'string' || password.length < 6 || typeof username !== 'string' || !/^[a-z0-9._]{3,30}$/.test(username) || typeof displayName !== 'string' || !displayName.trim() || displayName !== displayName.trim() || displayName.length > 60) {
      return fail('VALIDATION_ERROR', 'Confira e-mail, senha (mínimo de 6 caracteres), nome e usuário.');
    }
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
      const session = startSession(user);
      return { data: { user, session }, error: null };
    } catch (error) { return identityFailure(error); }
  },

  async resetPasswordForEmail({ email }) {
    if (!isValidEmail(email)) return fail('VALIDATION_ERROR', 'Informe um e-mail válido.');
    return { data: { message: 'Solicitação de recuperação simulada. Nenhum e-mail foi enviado. Use uma conta de teste autenticada para demonstrar a redefinição.' }, error: null };
  },

  async getPasswordRecoverySession() {
    try {
      const session = sessionFor(readIdentity());
      if (!session || (session.expires_at && session.expires_at * 1000 <= Date.now())) return fail('INVALID_RECOVERY_LINK', 'Link inválido ou expirado. No ambiente de demonstração, entre com uma conta de teste antes de abrir esta página.');
      return { data: session, error: null };
    } catch (error) { return identityFailure(error); }
  },

  async updatePassword({ password }) {
    if (typeof password !== 'string' || password.length < 6) return fail('VALIDATION_ERROR', 'A senha deve conter pelo menos 6 caracteres.');
    const recovery = await this.getPasswordRecoverySession();
    if (recovery.error) return recovery;
    try {
      const id = recovery.data.user.id;
      const verifier = await createVerifier(password);
      await writeIdentity(state => {
        const account = state.accounts.find(item => item.id === id);
        if (!account) throw new Error('Conta de demonstração indisponível.');
        account.verifier = verifier;
      });
      return { data: { id, email: recovery.data.user.email, message: 'Senha atualizada na demonstração. Você já pode entrar com a nova senha.' }, error: null };
    } catch (error) { return identityFailure(error); }
  },

  async signIn({ email, password }) {
    if (!isValidEmail(email) || typeof password !== 'string') return fail('UNAUTHENTICATED', 'E-mail ou senha inválidos.');
    try {
      const state = readIdentity();
      const account = state.accounts.find(item => item.email.toLowerCase() === email.trim().toLowerCase());
      if (!account || !await verifyPassword(account, password)) return fail('UNAUTHENTICATED', 'E-mail ou senha inválidos.');
      return { data: startSession(identityUser(state, account.id)), error: null };
    } catch (error) { return identityFailure(error); }
  },

  async signOut() {
    currentUser = null;
    currentSession = null;
    try { sessionStorage.removeItem("e-writter-mock-user"); } catch {}

    notifyAuthStateChange("SIGNED_OUT", null);

    return {
        data: null,
        error: null
    };
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
