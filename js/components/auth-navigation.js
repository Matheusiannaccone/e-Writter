import { getCurrentUser, onAuthStateChange, signOut } from '../services/authService.js';
import { withDataSource, preserveDataSource } from './navigation-context.js';

// A mesma navegação de conta atende o cabeçalho global e os cabeçalhos próprios.
export function initAuthNavigation(header) {
  const nav = header.querySelector('nav');
  if (!nav) return;
  const host = document.createElement('span');
  host.className = 'session-nav';
  host.setAttribute('aria-label', 'Conta');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.className = 'session-nav__status';
  const actions = document.createElement('span');
  actions.className = 'session-nav__actions';
  host.append(status, actions);
  nav.append(host);
  let generation = 0;
  let state = 'checking';
  let processing = false;
  let logoutFailed = false;

  function link(label, target) {
    const node = document.createElement('a');
    node.className = 'site-nav__link';
    node.textContent = label;
    node.href = withDataSource(target).href;
    actions.append(node);
  }
  function button(label, handler) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'session-nav__action site-nav__link';
    node.textContent = label;
    node.disabled = processing;
    node.addEventListener('click', handler);
    actions.append(node);
  }
  function render() {
    host.dataset.sessionState = state;
    actions.replaceChildren();
    header.querySelectorAll('[data-session-link]').forEach(node => { node.hidden = state !== 'authenticated'; });
    status.textContent = processing ? 'Saindo...' : state === 'checking' ? 'Verificando sessão...' : state === 'error'
      ? logoutFailed ? 'Não foi possível encerrar a sessão. Tente novamente.' : 'Não foi possível verificar a sessão.' : '';
    if (state === 'authenticated') {
      link('Perfil', './perfil.html');
      link('Meus Livros', './meuslivros.html');
      button(processing ? 'Saindo...' : 'Sair', logout);
    } else if (state === 'guest') {
      link('Entrar', './login.html'); link('Criar conta', './cadastro.html');
    } else if (state === 'error') {
      button(logoutFailed ? 'Tentar sair novamente' : 'Verificar novamente', logoutFailed ? logout : verify);
    }
  }
  async function verify() {
    const version = ++generation;
    state = 'checking'; render();
    try {
      const result = await getCurrentUser();
      if (version !== generation) return;
      state = result.error && result.error.code !== 'UNAUTHENTICATED' ? 'error' : result.data && !result.error ? 'authenticated' : 'guest';
    } catch { if (version !== generation) return; state = 'error'; }
    logoutFailed = false;
    render();
  }
  async function logout() {
    if (processing) return;
    processing = true; ++generation; render();
    try {
      const result = await signOut();
      logoutFailed = Boolean(result?.error);
      state = logoutFailed ? 'error' : 'guest';
    } catch { logoutFailed = true; state = 'error'; }
    finally { processing = false; render(); }
  }
  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'SESSION_ERROR') {
      ++generation; state = event === 'SIGNED_OUT' ? 'guest' : 'error';
      logoutFailed = event === 'SESSION_ERROR'; render();
    } else if (['SIGNED_IN', 'USER_UPDATED', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
      // Nenhuma consulta de Auth dentro do callback do SDK.
      ++generation;
      state = session?.user ? 'authenticated' : 'guest'; render();
    }
  });
  window.addEventListener('pagehide', () => { ++generation; state = 'checking'; render(); });
  window.addEventListener('pageshow', event => { if (event.persisted) verify(); });
  preserveDataSource(header.querySelectorAll('a[href]'));
  verify();
}
