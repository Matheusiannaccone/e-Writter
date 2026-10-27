/**
 * Persistência da identidade Mock entre contextos que representam páginas e abas.
 * Reutiliza storages em memória para conferir cadastro, edição, verificadores, conflitos
 * e falhas de persistência sem alterar os fixtures originais do repositório.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { identityPage, memoryStorage } = require('./helpers/mock-identity.cjs');
const KEY = 'e-writter-mock-identity-v1';
const account = { email: 'nova@example.test', password: 'senha-local-123', username: 'nova', displayName: 'Nova Leitora' };
const signup = page => page.run(`signUp(${JSON.stringify(account)})`);
const signin = page => page.run(`signIn(${JSON.stringify(account)})`);

test('cadastro permanece após navegação/refresh; nova sessão exige login e aceita a conta criada', async () => {
  let page = identityPage();
  const created = await signup(page); assert.equal(created.error, null);
  const id = created.data.user.id;
  const { local, session } = page;
  for (let navigation = 0; navigation < 2; navigation++) {
    page = identityPage(local, session);
    assert.equal((await page.run('getCurrentUser()')).data.id, id);
    assert.equal((await page.run('getMyProfile()')).data.username, account.username);
  }
  page = identityPage(local, memoryStorage());
  assert.equal((await page.run('getCurrentUser()')).error.code, 'UNAUTHENTICATED');
  assert.equal((await signin(page)).data.user.id, id);
});

test('nome, username, bio e identidade são consistentes após save, refresh e novo login', async () => {
  let page = identityPage(); await signup(page);
  const result = await page.run("updateMyProfile({displayName:'Nome atualizado', username:'novo_usuario', bio:'Minha biografia'})");
  assert.equal(result.error, null);
  const updated = result.data.updatedAt;
  assert.equal((await page.run('getCurrentUser()')).data.username, 'novo_usuario');
  assert.equal((await page.run('getSession()')).data.user.displayName, 'Nome atualizado');
  page = identityPage(page.local, page.session);
  const restored = (await page.run('getMyProfile()')).data;
  assert.equal(restored.displayName, 'Nome atualizado'); assert.equal(restored.username, 'novo_usuario');
  assert.equal(restored.bio, 'Minha biografia'); assert.equal(restored.updatedAt, updated);
  page = identityPage(page.local, memoryStorage()); await signin(page);
  assert.equal((await page.run('getCurrentUser()')).data.username, 'novo_usuario');
});

test('fixtures continuam autenticando; edição do perfil fixture não persiste password', async () => {
  let page = identityPage();
  const login = await page.auth.signIn({ email: 'teste1@gmail.com', password: '090909' }); assert.equal(login.error, null);
  await page.profile.updateMyProfile({ displayName: 'Fixture editado', username: 'fixture_editado', bio: 'Bio' });
  page = identityPage(page.local, page.session);
  assert.equal((await page.profile.getMyProfile()).data.displayName, 'Fixture editado');
  assert.equal((await page.auth.getCurrentUser()).data.username, 'fixture_editado');
  const serialized = page.local.getItem(KEY);
  assert.ok(!serialized.includes('"090909"')); assert.ok(!serialized.includes('"password"'));
});

test('snapshot tem versão, IDs distintos, verificadores com salts distintos e nenhum segredo original', async () => {
  const page = identityPage(); await signup(page);
  await page.auth.signUp({ ...account, email: 'outra@example.test', username: 'outra' });
  const serialized = page.local.getItem(KEY), state = JSON.parse(serialized);
  assert.equal(state.version, 1); assert.equal(new Set(state.accounts.map(item => item.id)).size, state.accounts.length);
  const verifiers = state.accounts.filter(item => item.verifier).map(item => item.verifier);
  assert.equal(verifiers.length, 2); assert.notEqual(verifiers[0].salt, verifiers[1].salt);
  assert.notEqual(verifiers[0].digest, verifiers[1].digest);
  assert.equal(verifiers[0].algorithm, 'PBKDF2'); assert.equal(verifiers[0].digest.length, 64);
  assert.ok(!serialized.includes(account.password)); assert.ok(!serialized.includes('"password"'));
  assert.equal(JSON.stringify(JSON.parse(page.session.getItem('e-writter-mock-user'))), JSON.stringify({ id: (await page.auth.getCurrentUser()).data.id, expires_at: (await page.auth.getSession()).data.expires_at }));
});

test('duplicidades de e-mail/username e colisões com fixtures são recusadas após restauração', async () => {
  let page = identityPage(); await signup(page); page = identityPage(page.local, page.session);
  for (const data of [account, { ...account, email: 'NOVA@example.test', username: 'outronome' }, { ...account, email: 'outra@example.test' }, { ...account, email: 'teste1@gmail.com', username: 'outronome' }, { ...account, email: 'outra@example.test', username: 'teste1' }]) {
    assert.equal((await page.auth.signUp(data)).error.code, 'CONFLICT');
  }
  assert.equal((await page.profile.updateMyProfile({ username: 'teste1' })).error.code, 'CONFLICT');
  assert.equal((await page.profile.getMyProfile()).data.username, account.username);
});

test('cadastros concorrentes na mesma página revalidam unicidade depois da derivação', async () => {
  const page = identityPage();
  const results = await Promise.all([signup(page), signup(page)]);
  assert.equal(results.filter(result => !result.error).length, 1);
  assert.equal(results.filter(result => result.error?.code === 'CONFLICT').length, 1);
});

test('falha de escrita no cadastro não cria conta, sessão ou sucesso; retry funciona', async () => {
  const page = identityPage(); page.local.failWrite = true;
  const result = await signup(page); assert.equal(result.data, null); assert.equal(result.error.code, 'UNKNOWN_ERROR');
  assert.equal(page.local.getItem(KEY), null); assert.equal(page.session.getItem('e-writter-mock-user'), null);
  page.local.failWrite = false;
  assert.equal((await signin(page)).error.code, 'UNAUTHENTICATED');
  assert.equal((await signup(page)).error, null);
});

test('falha de escrita no perfil mantém dados anteriores em memória e após refresh', async () => {
  let page = identityPage(); await signup(page);
  const before = page.local.getItem(KEY); page.local.failWrite = true;
  const result = await page.profile.updateMyProfile({ displayName: 'Não confirmado', username: 'nao_confirmado', bio: 'Nova' });
  assert.equal(result.error.code, 'UNKNOWN_ERROR'); assert.equal(page.local.getItem(KEY), before);
  assert.equal((await page.profile.getMyProfile()).data.displayName, account.displayName);
  page.local.failWrite = false; page = identityPage(page.local, page.session);
  assert.equal((await page.profile.getMyProfile()).data.username, account.username);
});

test('gravações de identidade não alteram chaves do catálogo ou favoritos', async () => {
  const page = identityPage();
  const library = '{"books":[],"bookGenres":[],"chapters":[]}';
  page.local.setItem('e-writter-mock-library-v1', library);
  page.local.setItem('e-writter-mock-favorites-v1', '["sentinela"]');
  await signup(page); await page.profile.updateMyProfile({ bio: 'Persistida' });
  assert.equal(page.local.getItem('e-writter-mock-library-v1'), library);
  assert.equal(page.local.getItem('e-writter-mock-favorites-v1'), '["sentinela"]');
});

test('falha na sessão não anuncia autenticação; conta salva pode entrar após desbloquear a aba', async () => {
  const page = identityPage(); page.session.failWrite = true;
  const result = await signup(page); assert.equal(result.data, null); assert.match(result.error.message, /não foi possível iniciar a sessão/);
  assert.equal((await page.auth.getCurrentUser()).error.code, 'UNAUTHENTICATED');
  page.session.failWrite = false; assert.equal((await signin(page)).error, null);
});

test('leitura bloqueada, snapshot corrompido ou versão desconhecida geram erro sem sobrescrever dados', async () => {
  for (const raw of ['invalid json', '{"version":99,"accounts":[],"profiles":[]}']) {
    const local = memoryStorage(); local.setItem(KEY, raw); const page = identityPage(local);
    assert.equal((await page.profile.getProfile('mock-user-1')).error.code, 'UNKNOWN_ERROR');
    assert.equal((await signup(page)).error.code, 'UNKNOWN_ERROR'); assert.equal(local.getItem(KEY), raw);
  }
  const page = identityPage(); page.local.failRead = true;
  assert.equal((await page.auth.getCurrentUser()).error.code, 'UNKNOWN_ERROR');
});

test('senha alterada vira verificador persistido, inclusive para fixture; falha não substitui senha anterior', async () => {
  let page = identityPage(); await page.auth.signIn({ email: 'teste1@gmail.com', password: '090909' });
  page.local.failWrite = true; assert.equal((await page.auth.updatePassword({ password: 'nao-confirmada' })).error.code, 'UNKNOWN_ERROR');
  page.local.failWrite = false; assert.equal((await page.auth.updatePassword({ password: 'nova-confirmada' })).error, null);
  page = identityPage(page.local, memoryStorage());
  assert.equal((await page.auth.signIn({ email: 'teste1@gmail.com', password: '090909' })).error.code, 'UNAUTHENTICATED');
  assert.equal((await page.auth.signIn({ email: 'teste1@gmail.com', password: 'nova-confirmada' })).error, null);
  assert.ok(!page.local.getItem(KEY).includes('nova-confirmada'));
});

test('recuperação aceita fronteiras HTML, rejeita sintaxe inválida e mantém resposta neutra', async () => {
  const page = identityPage();
  let response;
  for (const email of ['teste1@gmail.com', 'ausente@example.test', 'a@b', 'nome+tag@sub.example.test', ' a@b ']) {
    const result = await page.auth.resetPasswordForEmail({ email }); assert.equal(result.error, null);
    const json = JSON.stringify(result); if (response) assert.equal(json, response); response = json;
    assert.match(result.data.message, /simulada.*Nenhum e-mail/);
  }
  for (const email of ['', 'invalido', 'a@@b', '@b', 'a@', 'a b@c', 'a@-b', 'a@b-', 'a@b..c', 'a@b.c\nd', 'a@' + 'b'.repeat(64)]) {
    assert.equal((await page.auth.resetPasswordForEmail({ email })).error.code, 'VALIDATION_ERROR', email);
  }
});
