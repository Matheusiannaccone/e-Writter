const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const flush = () => new Promise(setImmediate);
const ok = data => ({ data, error: null });
const fail = code => ({ data: null, error: { code, message: `Falha ${code}` } });
function adapter(file, globals, name) {
  const context = vm.createContext({ URL, URLSearchParams, Date, ...globals });
  vm.runInContext(read(file).replace(/^import .*;\s*/gm, '').replace(/^export /gm, ''), context);
  return vm.runInContext(name, context);
}
test('Mock recupera sem enumerar contas e só altera senha de sessão autenticada válida', async () => {
  const users = [{ id: '1', email: 'teste@example.test', password: 'antiga123' }];
  const a = adapter('js/services/adapters/mock/authAdapter.js', { mockUsers: users, mockProfiles: [], sessionStorage: { getItem() {}, setItem() {} } }, 'mockAuthAdapter');
  const known = await a.resetPasswordForEmail({ email: users[0].email });
  const unknown = await a.resetPasswordForEmail({ email: 'ausente@example.test' });
  assert.equal(JSON.stringify(known), JSON.stringify(unknown));
  assert.equal((await a.updatePassword({ password: 'nova123' })).error.code, 'INVALID_RECOVERY_LINK');
  await a.signIn({ email: users[0].email, password: 'antiga123' });
  assert.equal((await a.updatePassword({ password: '123' })).error.code, 'VALIDATION_ERROR');
  assert.equal((await a.updatePassword({ password: 'nova123' })).error, null);
  assert.equal((await a.signIn({ email: users[0].email, password: 'antiga123' })).error.code, 'UNAUTHENTICATED');
  assert.equal((await a.signIn({ email: users[0].email, password: 'nova123' })).error, null);
  (await a.getSession()).data.expires_at = 1;
  assert.equal((await a.updatePassword({ password: 'outra123' })).error.code, 'INVALID_RECOVERY_LINK');
});

test('Supabase usa sessão + updateUser e normaliza expiração, senha e rede com cliente simulado', async () => {
  for (const scenario of ['ok', 'missing', 'expired', 'url-error', 'weak_password', 'same_password', 'session_expired', 'NETWORK_ERROR']) {
    let writes = 0;
    const session = scenario === 'missing' ? null : { user: {}, expires_at: scenario === 'expired' ? 1 : Date.now() / 1000 + 3600 };
    const location = new URL('http://localhost/redefinir-senha.html?datasource=supabase' + (scenario === 'url-error' ? '#error=access_denied&error_code=otp_expired' : ''));
    const a = adapter('js/services/adapters/supabase/authAdapter.js', { window: { location }, supabase: { auth: {
      getSession: async () => scenario === 'NETWORK_ERROR' ? { data: {}, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } } : ok({ session }),
      updateUser: async payload => { writes++; assert.equal(payload.password, 'nova123'); return ['weak_password', 'same_password', 'session_expired'].includes(scenario) ? { error: { code: scenario } } : ok({ user: { id: '1' } }); }
    } } }, 'supabaseAuthAdapter');
    assert.equal((await a.updatePassword({ password: '123' })).error.code, 'VALIDATION_ERROR');
    const result = await a.updatePassword({ password: 'nova123' });
    if (scenario === 'ok') { assert.equal(result.error, null); assert.equal(writes, 1); }
    else if (['weak_password', 'same_password'].includes(scenario)) assert.equal(result.error.code, 'VALIDATION_ERROR');
    else if (scenario === 'session_expired') { assert.equal(writes, 1); assert.equal(result.error.code, 'INVALID_RECOVERY_LINK'); }
    else { assert.equal(writes, 0); assert.equal(result.error.code, scenario === 'NETWORK_ERROR' ? scenario : 'INVALID_RECOVERY_LINK'); }
  }
});

test('recuperação Supabase preserva datasource no redirect e getCurrentUser mantém erro de rede', async () => {
  let redirect;
  const a = adapter('js/services/adapters/supabase/authAdapter.js', {
    window: { location: new URL('http://localhost/recuperar-senha.html?datasource=supabase') },
    supabase: { auth: {
      resetPasswordForEmail: async (email, options) => { assert.equal(email, 'teste@example.test'); redirect = options.redirectTo; return ok({}); },
      getUser: async () => ({ data: { user: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } })
    } }
  }, 'supabaseAuthAdapter');
  assert.equal((await a.resetPasswordForEmail({ email: 'teste@example.test' })).error, null);
  assert.equal(redirect, 'http://localhost/redefinir-senha.html?datasource=supabase');
  assert.equal((await a.getCurrentUser()).error.code, 'NETWORK_ERROR');
});

test('cadastro Mock retorna usuário e sessão no mesmo contrato de signUp Supabase', async () => {
  const a = adapter('js/services/adapters/mock/authAdapter.js', { mockUsers: [], mockProfiles: [], sessionStorage: { getItem() {}, setItem() {} } }, 'mockAuthAdapter');
  const result = await a.signUp({ email: 'nova@example.test', password: 'senha123', username: 'nova', displayName: 'Nova' });
  assert.equal(result.error, null);
  assert.equal(result.data.user.id, result.data.session.user.id);
});

test('service encaminha recuperação e senha somente ao adapter selecionado', async () => {
  const calls = [];
  const selected = Object.fromEntries(['getPasswordRecoverySession', 'resetPasswordForEmail', 'updatePassword'].map(name => [name, async (...args) => { calls.push([name, ...args]); return ok({}); }]));
  const context = vm.createContext({ getAuthAdapter: () => selected });
  vm.runInContext(read('js/services/authService.js').replace(/^import .*;\s*/gm, '').replace(/^export /gm, ''), context);
  await vm.runInContext("getPasswordRecoverySession();", context);
  await vm.runInContext("resetPasswordForEmail({email: 'teste@example.test'});", context);
  await vm.runInContext("updatePassword({password: 'nova123'});", context);
  assert.equal(JSON.stringify(calls), JSON.stringify([
    ['getPasswordRecoverySession'], ['resetPasswordForEmail', { email: 'teste@example.test' }], ['updatePassword', { password: 'nova123' }]
  ]));
});
