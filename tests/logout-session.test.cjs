const { test } = require('node:test');
const assert = require('node:assert/strict');
const { identityPage, memoryStorage } = require('./helpers/mock-identity.cjs');
const credentials = { email: 'teste1@gmail.com', password: '090909' };

test('logout repetido encerra somente a sessão da aba e permanece após refresh', async () => {
  const p = identityPage();
  await p.auth.signIn(credentials);
  p.local.setItem('catalogo-sentinela', 'preservado');
  const before = JSON.stringify([...p.local.values]);
  const events = [];
  p.auth.onAuthStateChange((event, session) => events.push([event, session]));
  assert.equal((await p.auth.signOut()).error, null);
  assert.equal((await p.auth.signOut()).error, null);
  assert.equal((await p.auth.getSession()).data, null);
  assert.equal((await identityPage(p.local, p.session).auth.getSession()).data, null);
  assert.equal(JSON.stringify([...p.local.values]), before);
  assert.deepEqual(events, [['SIGNED_OUT', null], ['SIGNED_OUT', null]]);
});

test('falha de remoção retorna erro, bloqueia sessão e permite retry sem sucesso falso', async () => {
  const p = identityPage(); await p.auth.signIn(credentials);
  const remove = p.session.removeItem; let event;
  p.auth.onAuthStateChange(e => { event = e; });
  p.session.removeItem = () => { throw Error('blocked'); };
  assert.equal((await p.auth.signOut()).error.code, 'UNKNOWN_ERROR');
  assert.equal(event, 'SESSION_ERROR');
  assert.equal((await p.auth.getSession()).error.code, 'UNKNOWN_ERROR');
  p.session.removeItem = remove;
  assert.equal((await p.auth.signOut()).error, null);
  assert.equal((await identityPage(p.local, p.session).auth.getSession()).data, null);
});

test('login pendente e cadastro pendente não reabrem sessão encerrada', async () => {
  const p = identityPage();
  const account = { email: 'audit@example.test', password: 'senha123', username: 'audit', displayName: 'Audit' };
  const signup = p.auth.signUp(account); await p.auth.signOut();
  assert.equal((await signup).error.code, 'UNAUTHENTICATED');
  const login = p.auth.signIn(account); await p.auth.signOut();
  assert.equal((await login).error.code, 'UNAUTHENTICATED');
  assert.equal((await p.auth.getSession()).data, null);
});

test('listener com exceção ou rejeição não interrompe outros; unsubscribe funciona', async () => {
  const p = identityPage(); let count = 0;
  p.auth.onAuthStateChange(() => { throw Error('consumer'); });
  p.auth.onAuthStateChange(async () => { throw Error('async consumer'); });
  const subscription = p.auth.onAuthStateChange(() => { count++; });
  await p.auth.signIn(credentials); await p.auth.signOut();
  assert.equal(count, 2);
  subscription.data.subscription.unsubscribe(); await p.auth.signOut();
  assert.equal(count, 2);
});

test('sessão expirada, ID inexistente e JSON inválido são removidos sem apagar contas', async () => {
  for (const raw of ['{', JSON.stringify({ id: 'inexistente' }), JSON.stringify({ id: 'mock-user-1', expires_at: 1 }), JSON.stringify({ id: 'mock-user-1', expires_at: 'invalid' })]) {
    const storage = memoryStorage(); storage.setItem('e-writter-mock-user', raw);
    const p = identityPage(memoryStorage(), storage);
    assert.equal((await p.auth.getCurrentUser()).error.code, 'UNAUTHENTICATED');
    assert.equal(storage.getItem('e-writter-mock-user'), null);
    assert.equal((await p.auth.signIn(credentials)).error, null);
  }
  const p = identityPage(); await p.auth.signIn(credentials);
  (await p.auth.getSession()).data.expires_at = 1;
  assert.equal((await p.auth.getCurrentUser()).error.code, 'UNAUTHENTICATED');
});

test('sessão válida restaura com expiração e não autentica outra aba', async () => {
  const p = identityPage(); await p.auth.signIn(credentials);
  const restored = await identityPage(p.local, p.session).auth.getSession();
  assert.equal(restored.data.user.id, 'mock-user-1');
  assert.equal(restored.data.expires_at, (await p.auth.getSession()).data.expires_at);
  assert.equal((await identityPage(p.local).auth.getSession()).data, null);
});

test('documento restaurado reconsulta armazenamento e não reutiliza sessão em memória', async () => {
  const p = identityPage(); await p.auth.signIn(credentials);
  const otherDocument = identityPage(p.local, p.session);
  await otherDocument.auth.signOut();
  assert.equal((await p.auth.getCurrentUser()).error.code, 'UNAUTHENTICATED');
  await p.auth.signIn(credentials);
  p.session.setItem('e-writter-mock-user', JSON.stringify({ id: 'mock-user-1', expires_at: 1 }));
  assert.equal((await p.auth.getSession()).data, null);
});
