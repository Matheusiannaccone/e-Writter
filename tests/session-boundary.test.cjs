/**
 * Barreira de sessão com identidade, eventos de janela e agendamento controlados.
 * As verificações cobrem troca silenciosa de usuário, gerações antigas, histórico e dispose.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { installSessionBoundary } = require('./helpers/session-boundary.cjs');
function harness() {
  const clears = [], scheduled = [], reported = []; let loads = 0, checks = 0;
  let user = { data: { id: 'a' }, error: null };
  const context = vm.createContext({ window: {}, setTimeout: fn => scheduled.push(fn), getCurrentUser: async () => { checks++; return user; }, clearPage: reason => clears.push(reason), reloadPage: () => loads++, report: reason => reported.push(reason) });
  installSessionBoundary(context);
  vm.runInContext('onSessionVerificationFailure(report)', context);
  const boundary = vm.runInContext('createSessionBoundary({clear:clearPage,reload:reloadPage})', context);
  return { boundary, context, clears, reported, checks: () => checks, loads: () => loads, setUser: value => { user = value; }, runScheduled() { scheduled.splice(0).forEach(fn => fn()); } };
}
test('mudança de usuário sem evento invalida dados e recarrega na nova identidade', async () => {
  const h = harness(), token = h.boundary.capture(); assert.equal(await h.boundary.accept(token), true);
  h.setUser({ data: { id: 'b' }, error: null }); assert.equal(await h.boundary.accept(token), false);
  assert.deepEqual(h.clears, ['checking']); h.runScheduled(); assert.equal(h.loads(), 1);
  assert.equal(await h.boundary.accept(h.boundary.capture()), true);
});
test('callbacks de Auth limpam imediatamente e adiam consultas fora do callback do SDK', () => {
  const h = harness(); h.context.__auth('INITIAL_SESSION', { user: { id: 'a' } }); assert.equal(h.clears.length, 0);
  h.context.__auth('SIGNED_IN', { user: { id: 'a' } }); assert.equal(h.checks(), 0); assert.deepEqual(h.clears, ['checking']);
  h.context.__auth('SIGNED_OUT'); h.runScheduled(); assert.equal(h.loads(), 0); assert.equal(h.reported.at(-1), 'guest');
});
test('rede difere de visitante e respostas de geração anterior não alteram o estado atual', async () => {
  const h = harness(); h.setUser({ data: null, error: { code: 'NETWORK_ERROR' } });
  assert.equal(await h.boundary.accept(h.boundary.capture()), false); assert.equal(h.clears.at(-1), 'error');
  const obsolete = h.boundary.capture(); h.context.__auth('SIGNED_IN', { user: { id: 'b' } });
  const before = h.clears.length;
  assert.equal(await h.boundary.accept(obsolete, { error: { code: 'UNAUTHENTICATED' } }), false); assert.equal(h.clears.length, before);
});
test('pageshow revalida, pagehide elimina dados e dispose encerra assinaturas', async () => {
  const h = harness(), token = h.boundary.capture();
  h.context.__fireWindow('pagehide', {}); assert.equal(h.boundary.current(token), false);
  h.context.__fireWindow('pageshow', { persisted: false }); h.runScheduled(); assert.equal(h.loads(), 0);
  h.context.__fireWindow('pageshow', { persisted: true }); h.runScheduled(); assert.equal(h.loads(), 1);
  h.boundary.dispose(); const before = h.clears.length; h.context.__auth('SIGNED_OUT');
  h.context.__fireWindow('pageshow', { persisted: true }); h.runScheduled(); assert.equal(h.clears.length, before);
  assert.equal(await h.boundary.accept(h.boundary.capture()), false);
});
