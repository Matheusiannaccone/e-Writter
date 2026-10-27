const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const flush = () => new Promise(setImmediate);
function harness(overrides = {}) {
  class Element {
    constructor() { this.children = []; this.attrs = {}; this.handlers = {}; this.textContent = ''; }
    append(...nodes) { this.children.push(...nodes); }
    setAttribute(k, v) { this.attrs[k] = v; }
    addEventListener(e, fn) { this.handlers[e] = fn; }
  }
  const mounted = [], listeners = [], events = {};
  let user = { data: { id: 'a' }, error: null }, checks = 0;
  const context = vm.createContext({ URL, URLSearchParams, setTimeout,
    document: { createElement: () => new Element(), querySelectorAll: () => mounted },
    window: { location: new URL('http://localhost/?datasource=mock'), addEventListener: (event, fn) => { events[event] = fn; } },
    getCurrentUser: async () => user,
    onAuthStateChange: fn => listeners.push(fn),
    isFavorite: async () => { checks++; return { data: true, error: null }; },
    addFavorite: async () => ({ data: {}, error: null }), removeFavorite: async () => ({ data: {}, error: null }), ...overrides
  });
  for (const file of ['session-status', 'navigation-context', 'favorite-session', 'favorite-button']) vm.runInContext(fs.readFileSync(`js/components/${file}.js`, 'utf8').replace(/^import .*;\s*/gm, '').replace(/^export /gm, ''), context);
  const create = () => vm.runInContext('createFavoriteButton({id:"book-a",title:"Obra"})', context);
  return { create, mounted, listeners, events, context, checks: () => checks, signOut() { user = { data: null, error: { code: 'UNAUTHENTICATED' } }; listeners.forEach(fn => fn('SIGNED_OUT')); } };
}
test('favorito descarta consulta e mutação antigas após logout', async () => {
  for (const action of ['read', 'write']) {
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const h = harness(action === 'read' ? { isFavorite: () => pending } : { removeFavorite: () => pending });
    const control = h.create(); h.mounted.push(control); await flush();
    let operation;
    if (action === 'write') operation = control.children[0].handlers.click();
    await flush(); h.signOut(); finish({ data: action === 'read' ? true : {}, error: null }); await operation; await flush();
    assert.equal(control.children[0].attrs['aria-pressed'], 'false');
    assert.match(control.children[1].textContent, /Entre/);
  }
});
test('cards removidos e nunca montados não acumulam listeners de autenticação', async () => {
  const h = harness(); const visible = h.create(); h.mounted.push(visible);
  for (let i = 0; i < 50; i++) h.create(); await flush();
  assert.equal(h.listeners.length, 1);
  h.mounted.length = 0; const before = h.checks();
  h.listeners[0]('SIGNED_IN'); await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(h.checks(), before);
});
