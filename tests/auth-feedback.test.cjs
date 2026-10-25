const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const flush = () => new Promise(setImmediate);
const ok = data => ({ data, error: null });
const fail = code => ({ data: null, error: { code, message: `Falha ${code}` } });
const profile = { displayName: 'Leitora', username: 'leitora', bio: '' };
function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}

// DOM mínimo: executa helpers e handlers reais, sem rede ou biblioteca adicional.
class Element {
  constructor(doc, tag = 'div') {
    Object.assign(this, { doc, tag, children: [], attrs: {}, handlers: {}, dataset: {}, value: '', textContent: '', disabled: false, hidden: false });
    this.classList = { add() {} };
  }
  setAttribute(key, value) { this.attrs[key] = value; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  removeAttribute(key) { delete this.attrs[key]; }
  append(...items) { this.children.push(...items); }
  set innerHTML(value) { this.markup = value; this.children = []; }
  get innerHTML() { return this.markup || ''; }
  querySelector(selector) { return this.children.find(child => `.${child.className}` === selector); }
  querySelectorAll() { return this.fields || []; }
  closest() { return this.wrapper; }
  addEventListener(type, handler) { (this.handlers[type] ??= []).push(handler); }
  async fire(type) { for (const handler of this.handlers[type] || []) await handler({ preventDefault() {} }); }
  focus() { this.doc.activeElement = this; }
  reset() { this.fields.forEach(field => { field.value = ''; }); }
  get validity() {
    return { valid: !(this.required && !this.value) && !(this.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value)) && !(this.minLength && this.value.length < this.minLength) };
  }
  get validationMessage() { return 'Confira o formato e o tamanho deste campo.'; }
}
function environment(extra = {}) {
  const elements = new Map();
  const document = { activeElement: null, querySelector: id => elements.get(id), querySelectorAll: () => [], createElement: tag => new Element(document, tag), createTextNode: value => ({ textContent: value }) };
  const location = new URL('http://localhost/login.html?datasource=mock');
  location.assign = value => { location.assigned = value; };
  location.replace = value => { location.replaced = value; };
  const context = vm.createContext({ document, window: { location }, location, URL, URLSearchParams, console: { error() {} }, ...extra });
  function element(id, tag) { const el = new Element(document, tag); el.id = id; elements.set(`#${id}`, el); return el; }
  function field(id, name, value = '', options = {}) {
    const el = element(id, 'input');
    Object.assign(el, { name, value, ...options });
    el.wrapper = new Element(document);
    return el;
  }
  const run = file => vm.runInContext(read(file).replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '').replace(/^export /gm, ''), context);
  run('js/components/feedback.js');
  run('js/components/navigation-context.js');
  return { context, document, location, element, field, run, $: id => elements.get(`#${id}`) };
}
function authPage(kind, extra = {}) {
  const h = environment(extra);
  const configs = {
    login: ['login-form', 'login-button', 'login-message', 'loginPage'],
    signup: ['signup-form', 'signup-button', 'signup-message', 'cadastroPage'],
    recovery: ['reset-form', 'reset-button', 'reset-message', 'recuperarSenhaPage'],
    password: ['new-password-form', 'save-button', 'new-password-message', 'redefinirSenhaPage']
  };
  const [formId, buttonId, messageId, module] = configs[kind];
  h.form = h.element(formId, 'form'); h.button = h.element(buttonId, 'button'); h.message = h.element(messageId);
  let fields = [];
  if (kind !== 'password') fields.push(h.field('email', 'email', 'leitor@example.test', { required: true, type: 'email' }));
  if (kind === 'signup') fields.unshift(h.field('display-name', 'displayName', 'Leitora', { required: true }), h.field('username', 'username', 'leitora', { required: true }));
  if (kind !== 'recovery') fields.push(h.field('password', 'password', 'senha123', { required: true, minLength: kind === 'login' ? 0 : 6 }));
  if (kind === 'signup' || kind === 'password') fields.push(h.field('confirmation', kind === 'signup' ? 'passwordConfirm' : 'confirmPassword', 'senha123', { required: true, minLength: 6 }));
  h.form.fields = fields;
  h.form.elements = Object.fromEntries(fields.map(field => [field.name, field]));
  if (kind === 'password') h.element('recovery-retry', 'button');
  h.run(`js/pages/${module}.js`);
  return h;
}
function profilePage(extra = {}) {
  const h = environment({ getCurrentUser: async () => ok({ email: 'leitora@example.test' }), getMyProfile: async () => ok(profile), updateMyProfile: async data => ok(data), ...extra });
  ['profile-name', 'profile-email', 'profile-detail-email', 'profile-message', 'profile-save-button', 'profile-cancel-button', 'profile-retry'].forEach(id => h.element(id));
  h.form = h.element('profile-form', 'form');
  h.form.fields = ['displayName', 'username', 'bio'].map((name, i) => h.field(['profile-display-name-input', 'profile-username-input', 'profile-bio-input'][i], name, '', { required: i !== 2 }));
  h.run('js/pages/profilePage.js');
  return h;
}

test('feedback textual, região estável e associação de erro preservam descrições existentes', () => {
  const h = environment(); const message = h.element('message');
  const field = h.field('name', 'name'); const form = h.element('form'); form.fields = [field];
  h.context.form = form; h.context.message = message; h.context.field = field;
  vm.runInContext('prepareFormValidation(form, message);', h.context);
  field.setAttribute('aria-describedby', 'help');
  vm.runInContext("setFieldError(field, 'Informe o nome.');", h.context);
  assert.equal(field.getAttribute('aria-invalid'), 'true');
  assert.equal(field.getAttribute('aria-describedby'), 'help name-error');
  assert.equal(field.wrapper.children[0].getAttribute('role'), null);
  for (const type of ['loading', 'error', 'success', 'warning', 'empty']) {
    vm.runInContext(`showFeedback(message, 'Mensagem', '${type}');`, h.context);
    assert.match(message.textContent, /: Mensagem$/);
    assert.equal(message.getAttribute('role'), 'status');
    assert.equal(message.getAttribute('aria-live'), 'polite');
  }
  vm.runInContext("clearFeedback(message); setFieldError(field, '');", h.context);
  assert.equal(message.hidden, false);
  assert.equal(message.textContent, '');
  assert.equal(field.getAttribute('aria-describedby'), 'help');
  assert.equal(field.getAttribute('aria-invalid'), null);
});

test('login valida formato, foca campo e limpa erro corrigido antes de chamar service', async () => {
  let calls = 0;
  const h = authPage('login', { signIn: async () => { calls++; return fail('NETWORK_ERROR'); } });
  h.form.elements.email.value = 'inválido';
  await h.form.fire('submit');
  assert.equal(calls, 0); assert.equal(h.document.activeElement, h.form.elements.email);
  h.form.elements.email.value = 'valido@example.test'; await h.form.elements.email.fire('input');
  assert.equal(h.form.elements.email.getAttribute('aria-invalid'), null);
  await h.form.fire('submit');
  assert.equal(calls, 1); assert.equal(h.message.dataset.type, 'error'); assert.equal(h.button.disabled, false);
});

test('login bloqueia duplicação, informa processamento e conclui com navegação sem sucesso fugaz', async () => {
  const pending = deferred(); let calls = 0;
  const h = authPage('login', { signIn: () => { calls++; return pending.promise; } });
  const saving = h.form.fire('submit'); await h.form.fire('submit');
  assert.equal(calls, 1); assert.equal(h.button.disabled, true); assert.equal(h.message.dataset.type, 'loading');
  pending.resolve(ok({})); await saving;
  assert.match(h.location.assigned, /biblioteca.html\?datasource=mock/);
  assert.notEqual(h.message.dataset.type, 'success');
});

test('cadastro distingue sessão ativa e confirmação de e-mail e revalida confirmação dependente', async () => {
  for (const session of [null, { user: {} }]) {
    const h = authPage('signup', { signUp: async () => ok({ session }) });
    h.form.elements.passwordConfirm.value = 'diferente'; await h.form.fire('submit');
    assert.equal(h.document.activeElement, h.form.elements.passwordConfirm);
    h.form.elements.password.value = 'diferente'; await h.form.elements.password.fire('input');
    assert.equal(h.form.elements.passwordConfirm.getAttribute('aria-invalid'), null);
    await h.form.fire('submit');
    assert.equal(h.message.dataset.type, 'success');
    assert.match(h.message.textContent, session ? /sessão está ativa/ : /confirmar a conta/);
  }
});

test('recuperação comunica envio, sucesso neutro, erro retornado e exceção', async () => {
  for (const result of [ok({}), fail('NETWORK_ERROR'), new Error('offline')]) {
    const pending = deferred();
    const h = authPage('recovery', { resetPasswordForEmail: async () => { await pending.promise; if (result instanceof Error) throw result; return result; } });
    const sending = h.form.fire('submit'); assert.equal(h.message.dataset.type, 'loading');
    pending.resolve(); await sending;
    assert.equal(h.button.disabled, false);
    assert.equal(h.message.dataset.type, result.error === null ? 'success' : 'error');
    if (result.error === null) assert.match(h.message.textContent, /Se houver uma conta/);
  }
});

test('Perfil bloqueia carga, save e cancelamento concorrentes e restaura controles no sucesso', async () => {
  const load = deferred(), save = deferred(); let calls = 0;
  const h = profilePage({ getMyProfile: () => load.promise, updateMyProfile: () => { calls++; return save.promise; } });
  assert.equal(h.$('profile-save-button').disabled, true); assert.ok(h.form.fields.every(field => field.disabled));
  await h.form.fire('submit'); assert.equal(calls, 0);
  load.resolve(ok(profile)); await flush();
  assert.ok(h.form.fields.every(field => !field.disabled));
  h.form.fields[0].value = 'Novo nome'; const saving = h.form.fire('submit');
  await h.$('profile-cancel-button').fire('click'); await h.form.fire('submit');
  assert.equal(calls, 1); assert.equal(h.form.fields[0].value, 'Novo nome');
  assert.equal(h.$('profile-cancel-button').disabled, true); assert.ok(h.form.fields.every(field => field.disabled));
  assert.equal(h.$('profile-message').dataset.type, 'loading');
  save.resolve(ok({ ...profile, displayName: 'Novo nome' })); await saving;
  assert.equal(h.$('profile-message').dataset.type, 'success'); assert.equal(h.$('profile-cancel-button').disabled, false);
});

test('Perfil diferencia rede, sessão ausente, registro ausente e exceções; retry recupera carga', async () => {
  for (const code of ['NETWORK_ERROR', 'UNAUTHENTICATED', 'NOT_FOUND', 'THROWN']) {
    let attempts = 0;
    const h = profilePage({
      getCurrentUser: async () => code === 'UNAUTHENTICATED' || code === 'NETWORK_ERROR' && attempts === 0 ? fail(code) : ok({ email: 'teste@example.test' }),
      getMyProfile: async () => { if (attempts++ === 0) { if (code === 'THROWN') throw Error('offline'); return fail(code); } return ok(profile); }
    });
    await flush();
    if (code === 'UNAUTHENTICATED') { assert.match(h.location.replaced, /login.html/); continue; }
    assert.equal(h.location.replaced, undefined);
    assert.equal(h.$('profile-name').textContent, 'Perfil indisponível');
    assert.doesNotMatch(h.$('profile-email').textContent, /Verificando|Carregando/);
    assert.ok(h.form.fields.every(field => field.disabled));
    await h.$('profile-retry').fire('click');
    assert.equal(h.$('profile-name').textContent, profile.displayName);
    assert.ok(h.form.fields.every(field => !field.disabled));
  }
});

test('Perfil usa erro local com foco, permite corrigir, preserva dados em falha e limpa ao cancelar', async () => {
  const h = profilePage({ updateMyProfile: async () => fail('NETWORK_ERROR') }); await flush();
  h.form.fields[1].value = '!'; await h.form.fire('submit');
  assert.equal(h.document.activeElement, h.form.fields[1]); assert.equal(h.form.fields[1].getAttribute('aria-invalid'), 'true');
  h.form.fields[1].value = 'leitora'; await h.form.fields[1].fire('input');
  h.form.fields[0].value = 'Rascunho'; await h.form.fire('submit');
  assert.equal(h.$('profile-message').dataset.type, 'error'); assert.equal(h.form.fields[0].value, 'Rascunho');
  assert.ok(h.form.fields.every(field => !field.disabled));
  await h.$('profile-cancel-button').fire('click');
  assert.equal(h.form.fields[0].value, profile.displayName); assert.equal(h.$('profile-message').dataset.type, 'warning');
});

test('redefinição verifica sessão antes de editar e permite repetir falha temporária', async () => {
  const pending = deferred(); let attempts = 0;
  const h = authPage('password', { getPasswordRecoverySession: async () => ++attempts === 1 ? pending.promise : ok({ user: {} }) });
  assert.ok(h.form.fields.every(field => field.disabled));
  pending.resolve(fail('NETWORK_ERROR')); await flush();
  assert.equal(h.$('recovery-retry').hidden, false); assert.equal(h.button.disabled, true);
  await h.$('recovery-retry').fire('click');
  assert.equal(h.button.disabled, false); assert.equal(h.message.textContent, '');
});

test('redefinição bloqueia link inválido e senha inválida; sucesso bloqueia envio repetido', async () => {
  const bad = authPage('password', { getPasswordRecoverySession: async () => fail('INVALID_RECOVERY_LINK') }); await flush();
  assert.equal(bad.button.disabled, true); assert.equal(bad.message.dataset.type, 'error');
  const pending = deferred(); let calls = 0;
  const h = authPage('password', { getPasswordRecoverySession: async () => ok({}), updatePassword: () => { calls++; return pending.promise; } }); await flush();
  h.form.elements.password.value = '123'; await h.form.fire('submit'); assert.equal(calls, 0);
  h.form.elements.password.value = 'senha123'; const saving = h.form.fire('submit'); await h.form.fire('submit');
  assert.equal(calls, 1); assert.ok(h.form.fields.every(field => field.disabled));
  pending.resolve(ok({})); await saving;
  assert.equal(h.message.dataset.type, 'success'); assert.equal(h.button.disabled, true);
  await h.form.fire('submit'); assert.equal(calls, 1);
});

test('redefinição trata rejeição da senha, sessão expirada no save e erro de rede sem perder valor', async () => {
  for (const code of ['VALIDATION_ERROR', 'INVALID_RECOVERY_LINK', 'NETWORK_ERROR', 'THROWN']) {
    const h = authPage('password', { getPasswordRecoverySession: async () => ok({}), updatePassword: async () => { if (code === 'THROWN') throw Error('offline'); return fail(code); } });
    await flush(); await h.form.fire('submit');
    assert.equal(h.form.elements.password.value, 'senha123');
    assert.equal(h.button.disabled, code === 'INVALID_RECOVERY_LINK');
    if (code === 'VALIDATION_ERROR') { assert.equal(h.document.activeElement, h.form.elements.password); assert.equal(h.message.textContent, ''); }
    else assert.equal(h.message.dataset.type, 'error');
  }
});

test('imports reais de Auth e Perfil ligam com services/adapters locais sem executar SDK ou rede', () => {
  execFileSync(process.execPath, ['--experimental-vm-modules', '--no-warnings', '-e', `
    const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
    (async () => {
      const cache = new Map();
      function load(file) {
        if (cache.has(file)) return cache.get(file);
        const module = file.endsWith('supabaseClient.js')
          ? new vm.SyntheticModule(['supabase'], function() { this.setExport('supabase', {}); })
          : new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { identifier: file });
        cache.set(file, module); return module;
      }
      for (const name of ['loginPage','cadastroPage','recuperarSenhaPage','redefinirSenhaPage','profilePage']) {
        const module = load(path.resolve('js/pages/' + name + '.js'));
        await module.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier)));
      }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], { cwd: root, stdio: 'pipe' });
});
