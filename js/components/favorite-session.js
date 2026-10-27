import { reportSessionVerificationFailure } from './session-status.js';
import { getCurrentUser, onAuthStateChange } from '../services/authService.js';

// Um listener por módulo; o WeakMap não retém cards removidos nem cards nunca montados.
const controls = new WeakMap();
let revision = 0;
let listening = false;
function mounted() {
  return [...document.querySelectorAll('[data-favorite-control]')].map(element => controls.get(element)).filter(Boolean);
}
function resetControls(reason) {
  revision++;
  mounted().forEach(control => control.invalidate(reason));
}
function refreshControls() { mounted().forEach(control => control.reload()); }
function listen() {
  if (listening) return;
  listening = true;
  onAuthStateChange((event) => {
    if (!['SIGNED_OUT', 'SESSION_ERROR', 'SIGNED_IN', 'USER_UPDATED', 'INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(event)) return;
    resetControls(event === 'SESSION_ERROR' ? 'error' : event === 'SIGNED_OUT' ? 'guest' : 'checking');
    if (event !== 'SIGNED_OUT' && event !== 'SESSION_ERROR') {
      const token = revision;
      setTimeout(() => { if (token === revision) refreshControls(); }, 0);
    }
  });
  window.addEventListener('pagehide', () => resetControls('checking'));
  window.addEventListener('pageshow', event => { if (event.persisted) { resetControls('checking'); refreshControls(); } });
}
export function createFavoriteSession(element, { clear, reload }) {
  listen();
  let generation = 0;
  let userId = null;
  const capture = () => ({ revision, generation });
  const current = token => token.revision === revision && token.generation === generation;
  function invalidate(reason) { generation++; userId = null; clear(reason); }
  async function accept(token, result) {
    if (!current(token)) return false;
    if (result?.error?.code === 'UNAUTHENTICATED') { invalidate('guest'); reportSessionVerificationFailure('guest'); return false; }
    let auth;
    try { auth = await getCurrentUser(); }
    catch { if (current(token)) invalidate('error'); return false; }
    if (!current(token)) return false;
    if (auth?.error || !auth?.data) {
      const reason = auth?.error && auth.error.code !== 'UNAUTHENTICATED' ? 'error' : 'guest';
      invalidate(reason); reportSessionVerificationFailure(reason); return false;
    }
    if (userId && userId !== auth.data.id) { invalidate('checking'); setTimeout(reload, 0); return false; }
    userId = auth.data.id;
    return true;
  }
  const control = { capture, current, accept, invalidate, reload, next() { generation++; return capture(); } };
  element.setAttribute('data-favorite-control', '');
  controls.set(element, control);
  return control;
}
