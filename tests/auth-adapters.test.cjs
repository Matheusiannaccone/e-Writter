/**
 * Contratos de Auth/recuperação nos adapters e no service, com SDK simulado e identidade local.
 * Os cenários validam sessão, normalização de erros e respostas neutras sem acessar rede.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { identityPage } = require('./helpers/mock-identity.cjs');
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
  const users = [{ email: 'teste1@gmail.com', password: '090909' }];
  const a = identityPage().auth;
  const known = await a.resetPasswordForEmail({ email: users[0].email });
  const unknown = await a.resetPasswordForEmail({ email: 'ausente@example.test' });
  assert.equal(JSON.stringify(known), JSON.stringify(unknown));
  assert.equal((await a.updatePassword({ password: 'nova123' })).error.code, 'INVALID_RECOVERY_LINK');
  await a.signIn({ email: users[0].email, password: '090909' });
  assert.equal((await a.updatePassword({ password: '123' })).error.code, 'VALIDATION_ERROR');
  assert.equal((await a.updatePassword({ password: 'nova123' })).error, null);
  assert.equal((await a.signIn({ email: users[0].email, password: '090909' })).error.code, 'UNAUTHENTICATED');
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
  const a = identityPage().auth;
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

test('cadastro Supabase distingue constraint de username, e-mail e falhas desconhecidas', async () => {
  const cases = [
    [{ code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' }, 'CONFLICT', /nome de usuário/, false],
    [{ code: '23505', constraint: 'profiles_username_key' }, 'CONFLICT', /username/, false],
    [{ code: '23505', message: 'duplicate profiles_pkey' }, 'UNKNOWN_ERROR', /inesperado/, false],
    [{ code: 'unexpected_failure', status: 500, message: 'Database error saving new user' }, 'CONFLICT', /username/, true],
    [{ code: 'email_exists' }, 'CONFLICT', /e-mail/, false],
    [{ code: 'user_already_exists' }, 'CONFLICT', /e-mail/, false],
    [{ message: 'User already registered' }, 'CONFLICT', /e-mail/, false],
    [{ code: 'invalid_credentials' }, 'UNAUTHENTICATED', /senha inválidos/, false],
    [{ code: 'future_error', status: 500, message: 'unknown' }, 'UNKNOWN_ERROR', /serviço/, false]
  ];
  for (const [error, code, message, lookup] of cases) {
    let lookups = 0, signups = 0;
    const a = adapter('js/services/adapters/supabase/authAdapter.js', { supabase: {
      auth: { signUp: async payload => { signups++; assert.equal(payload.options.data.username, 'leitora'); return { error }; } },
      from: table => { lookups++; assert.equal(table, 'profiles'); return {
        select: column => { assert.equal(column, 'username'); return { eq: (key, value) => {
          assert.equal(key, 'username'); assert.equal(value, 'leitora');
          return { maybeSingle: async () => ok({ username: 'leitora' }) };
        } }; }
      }; }
    } }, 'supabaseAuthAdapter');
    const result = await a.signUp({ email: 'a@example.test', username: 'leitora', displayName: 'Leitora', password: 'senha123' });
    assert.equal(result.error.code, code); assert.match(result.error.message, message);
    assert.equal(lookups, Number(lookup)); assert.equal(signups, 1);
  }
});

test('erro genérico do trigger só vira conflito com confirmação; consulta vazia, falha ou exceção preserva erro', async () => {
  for (const lookup of [ok(null), { data: null, error: { code: '42501' } }, new Error('offline'), ok({ username: 'outra' })]) {
    const a = adapter('js/services/adapters/supabase/authAdapter.js', { supabase: {
      auth: { signUp: async () => ({ error: { code: 'unexpected_failure', message: 'Database error saving new user' } }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => { if (lookup instanceof Error) throw lookup; return lookup; } }) }) })
    } }, 'supabaseAuthAdapter');
    assert.equal((await a.signUp({ username: 'leitora' })).error.code, 'UNKNOWN_ERROR');
  }
});

test('recuperação normaliza códigos, HTTP 429 e exceções sem reenviar', async () => {
  for (const [error, code, message] of [
    [{ code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' }, 'RATE_LIMIT', /limite de envio de e-mails/],
    [{ code: 'over_request_rate_limit' }, 'RATE_LIMIT', /Muitas solicitações/],
    [{ status: 429, message: 'Too many requests' }, 'RATE_LIMIT', /Aguarde/],
    [{ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, 'NETWORK_ERROR', /conectar/],
    [new TypeError('Failed to fetch'), 'NETWORK_ERROR', /conectar/],
    [{ code: 'email_address_invalid' }, 'VALIDATION_ERROR', /e-mail válido/],
    [{ code: 'email_address_not_authorized' }, 'EMAIL_NOT_AUTHORIZED', /não permite enviar/],
    [{ code: 'email_provider_disabled' }, 'AUTH_UNAVAILABLE', /indisponível/],
    [{ code: 'unexpected_failure', status: 500 }, 'UNKNOWN_ERROR', /mais tarde/],
    [new Error('unknown'), 'UNKNOWN_ERROR', /inesperado/]
  ]) {
    let calls = 0;
    const a = adapter('js/services/adapters/supabase/authAdapter.js', {
      window: { location: new URL('http://localhost/recuperar-senha.html?datasource=supabase') },
      supabase: { auth: { resetPasswordForEmail: async () => { calls++; if (error instanceof Error) throw error; return { error }; } } }
    }, 'supabaseAuthAdapter');
    const result = await a.resetPasswordForEmail({ email: 'a@example.test' });
    assert.equal(result.error.code, code); assert.match(result.error.message, message); assert.equal(calls, 1);
  }
});
