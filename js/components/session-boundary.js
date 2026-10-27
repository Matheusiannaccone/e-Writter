import { reportSessionVerificationFailure } from './session-status.js';
import { getCurrentUser, onAuthStateChange } from '../services/authService.js';

// Protege somente o ciclo de vida da interface. Autorização permanece nos adapters/RLS.
export function createSessionBoundary({ clear, reload, verify = getCurrentUser }) {
  let generation = 0;
  let userId = null;
  let disposed = false;
  const current = token => !disposed && token === generation;
  function invalidate(reason = 'guest') {
    generation++;
    userId = null;
    clear(reason);
    if (reason !== 'checking') reportSessionVerificationFailure(reason);
  }
  async function accept(token, result, expectedUserId) {
    if (!current(token)) return false;
    if (['UNAUTHENTICATED', 'INVALID_RECOVERY_LINK'].includes(result?.error?.code)) {
      invalidate('guest'); return false;
    }
    let auth;
    try { auth = await verify(); }
    catch { if (current(token)) invalidate('error'); return false; }
    if (!current(token)) return false;
    if (auth?.error || !auth?.data) {
      invalidate(auth?.error && !['UNAUTHENTICATED', 'INVALID_RECOVERY_LINK'].includes(auth.error.code) ? 'error' : 'guest');
      return false;
    }
    const id = auth.data.user?.id ?? auth.data.id;
    if ((expectedUserId && id !== expectedUserId) || (userId && id !== userId)) {
      invalidate('checking'); scheduleReload(); return false;
    }
    userId = id;
    return true;
  }
  function scheduleReload() {
    const token = generation;
    setTimeout(() => { if (current(token)) reload(); }, 0);
  }
  const subscription = onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'SESSION_ERROR') invalidate(event === 'SIGNED_OUT' ? 'guest' : 'error');
    else if (['SIGNED_IN', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(event) ||
      (event === 'TOKEN_REFRESHED' && userId && session?.user?.id !== userId)) {
      invalidate('checking'); scheduleReload();
    }
  });
  const hide = () => invalidate('checking');
  const show = event => { if (event.persisted) { invalidate('checking'); scheduleReload(); } };
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', show);
  return {
    capture: () => generation, current, accept, invalidate,
    dispose() {
      disposed = true; generation++;
      subscription?.data?.subscription?.unsubscribe();
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
    }
  };
}
