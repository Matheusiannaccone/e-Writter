const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const flush = () => new Promise(setImmediate);
const ok = data => ({ data, error: null });
const fail = code => ({ data: null, error: { code } });
const idA = '11111111-1111-4111-8111-111111111111';
const idB = '22222222-2222-4222-8222-222222222222';
const favorite = (bookId = idA, book = {}) => ({ bookId, createdAt: '2026-10-25', book: { id: bookId, title: 'História', status: 'published', author: { displayName: 'Autora' }, genres: [{ name: 'Fantasia' }], ...book } });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Executa página, card, feedback e navegação reais com DOM mínimo e services sem rede.
class Element {
  constructor(tag = 'div') {
    Object.assign(this, { tag, children: [], attributes: {}, handlers: {}, dataset: {}, hidden: false, disabled: false, textContent: '' });
    this.classList = { add() {} };
  }
  append(...items) { for (const item of items) { item.parent = this; this.children.push(item); } }
  replaceChildren(...items) { this.children.forEach(child => { child.parent = null; }); this.children = []; this.append(...items); }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(type, handler) { (this.handlers[type] ??= []).push(handler); }
  async fire(type) { await Promise.all((this.handlers[type] || []).map(handler => handler({ preventDefault() {} }))); }
  querySelectorAll(tag) { return this.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...child.querySelectorAll(tag)]); }
  contains(element) { return this === element || this.children.some(child => child.contains(element)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
  focus() { this.doc.activeElement = this; }
}
async function harness(overrides = {}, source = 'mock') {
  const elements = new Map();
  const document = { activeElement: null, querySelector: id => elements.get(id), querySelectorAll: () => links, createElement: tag => make(tag) };
  function make(tag) { const el = new Element(tag); el.doc = document; return el; }
  for (const id of ['empty', 'list', 'count', 'message', 'retry', 'session']) elements.set(`#favorites-${id}`, make('div'));
  const links = [make('a'), make('a')];
  links[0].setAttribute('href', './login.html'); links[1].setAttribute('href', './index.html');
  let auth;
  const calls = { list: 0, remove: [], favoriteButton: 0 };
  const context = vm.createContext({
    document, window: { location: new URL(`http://localhost/biblioteca.html?datasource=${source}`) },
    URL, URLSearchParams, setTimeout,
    listFavorites: async () => { calls.list++; return ok([favorite()]); },
    removeFavorite: async id => { calls.remove.push(id); return ok({ bookId: id }); },
    onAuthStateChange: callback => { auth = callback; },
    getBookCoverUrl: async () => ok({ url: null }),
    createFavoriteButton: () => { calls.favoriteButton++; return make('button'); },
    ...overrides
  });
  const run = file => vm.runInContext(read(file).replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '').replace(/^export /gm, ''), context);
  run('js/components/navigation-context.js');
  run('js/components/feedback.js');
  run('js/components/book-card.js');
  run('js/pages/favoritesPage.js');
  await flush();
  const $ = id => elements.get(`#favorites-${id}`);
  return { $, calls, links, context, document, auth: (...args) => auth(...args), cards: () => $('list').children, button: index => $('list').children[index].querySelectorAll('button')[0] };
}

test('lista usa card real, metadados e bookId do registro, sem consultas por card', async () => {
  const h = await harness({ listFavorites: async () => ok([favorite(idA, { id: idB })]) });
  assert.equal(h.cards().length, 1);
  const card = h.cards()[0];
  const link = card.querySelectorAll('a')[0];
  const url = new URL(link.href);
  assert.equal(url.pathname, '/detalhes-obra.html');
  assert.equal(url.searchParams.get('id'), idA);
  assert.equal(url.searchParams.get('datasource'), 'mock');
  const texts = card.querySelectorAll('span').map(el => el.textContent);
  for (const expected of ['História', 'Autora', 'Fantasia', 'Sem capa']) assert.ok(texts.includes(expected));
  assert.equal(h.calls.favoriteButton, 0);
  assert.equal(h.button(0).handlers.click.length, 1);
  assert.equal(h.$('count').textContent, '1 livro favorito.');
});

test('estado de carregamento termina apenas após resposta', async () => {
  const pending = deferred();
  const h = await harness({ listFavorites: () => pending.promise });
  assert.equal(h.$('list').attributes['aria-busy'], 'true');
  assert.equal(h.$('empty').hidden, true);
  assert.match(h.$('count').textContent, /Carregando/);
  pending.resolve(ok([])); await flush();
  assert.equal(h.$('list').attributes['aria-busy'], 'false');
  assert.equal(h.$('empty').hidden, false);
});

test('lista vazia é diferente de erro e sessão ausente', async () => {
  const h = await harness({ listFavorites: async () => ok([]) });
  assert.equal(h.$('empty').hidden, false);
  assert.equal(h.$('list').hidden, true);
  assert.equal(h.$('retry').hidden, true);
  assert.equal(h.$('session').hidden, true);
  assert.match(h.$('count').textContent, /^0 livros/);
});

test('falha retornada, exceção e payload inválido permitem tentar novamente sem estado vazio', async () => {
  for (const response of [() => fail('NETWORK_ERROR'), () => { throw Error('offline'); }, () => ({}), () => ok(null)]) {
    const h = await harness({ listFavorites: async () => response() });
    assert.equal(h.$('empty').hidden, true);
    assert.equal(h.$('list').hidden, true);
    assert.equal(h.$('message').dataset.type, 'error');
    assert.equal(h.$('retry').hidden, false);
    assert.equal(h.$('list').attributes['aria-busy'], 'false');
  }
  let attempts = 0;
  const h = await harness({ listFavorites: async () => ++attempts === 1 ? fail('NETWORK_ERROR') : ok([favorite()]) });
  await h.$('retry').fire('click');
  assert.equal(h.cards().length, 1);
  assert.equal(h.$('message').hidden, true);
  assert.equal(attempts, 2);
});

test('sessão ausente mostra entrada sem consultar por card', async () => {
  const h = await harness({ listFavorites: async () => fail('UNAUTHENTICATED') }, 'supabase');
  assert.equal(h.$('session').hidden, false);
  assert.equal(h.$('empty').hidden, true);
  assert.equal(h.$('retry').hidden, true);
  assert.equal(h.calls.favoriteButton, 0);
  assert.equal(new URL(h.links[0].href).searchParams.get('datasource'), 'supabase');
});

test('remoção atualiza lista e contagem, bloqueia clique duplicado e mantém foco', async () => {
  const pending = deferred(); const calls = [];
  const h = await harness({ listFavorites: async () => ok([favorite(), favorite(idB)]), removeFavorite: id => { calls.push(id); return pending.promise; } });
  h.button(0).focus();
  const removing = h.button(0).fire('click');
  await h.button(0).fire('click');
  assert.equal(calls.length, 1);
  assert.equal(h.button(0).disabled, true);
  pending.resolve(ok({ bookId: idA })); await removing;
  assert.equal(calls[0], idA);
  assert.equal(h.cards().length, 1);
  assert.equal(h.$('count').textContent, '1 livro favorito.');
  assert.equal(h.document.activeElement, h.button(0));
  assert.equal(h.$('message').dataset.type, 'success');
});

test('remoção do último favorito mostra vazio e foco na contagem sem recarregar', async () => {
  const h = await harness();
  h.button(0).focus(); await h.button(0).fire('click');
  assert.deepEqual(h.calls.remove, [idA]);
  assert.equal(h.calls.list, 1);
  assert.equal(h.cards().length, 0);
  assert.equal(h.$('empty').hidden, false);
  assert.equal(h.document.activeElement, h.$('count'));
});

test('erro na remoção mantém card e contagem; NOT_FOUND concilia coleção', async () => {
  for (const removeFavorite of [async () => fail('NETWORK_ERROR'), async () => { throw Error('offline'); }, async () => undefined]) {
    const h = await harness({ removeFavorite });
    await h.button(0).fire('click');
    assert.equal(h.cards().length, 1);
    assert.equal(h.$('count').textContent, '1 livro favorito.');
    assert.equal(h.$('message').dataset.type, 'error');
    assert.equal(h.button(0).disabled, false);
  }
  const h = await harness({ removeFavorite: async () => fail('NOT_FOUND') });
  await h.button(0).fire('click');
  assert.equal(h.cards().length, 0);
});

test('sessão encerrada durante remoção limpa dados privados', async () => {
  const h = await harness({ removeFavorite: async () => fail('UNAUTHENTICATED') });
  await h.button(0).fire('click');
  assert.equal(h.cards().length, 0);
  assert.equal(h.$('session').hidden, false);
  assert.equal(h.$('empty').hidden, true);
});

test('logout descarta listagem ou remoção atrasada', async () => {
  const pending = deferred();
  const h = await harness({ listFavorites: () => pending.promise });
  h.auth('SIGNED_OUT'); pending.resolve(ok([favorite()])); await flush();
  assert.equal(h.cards().length, 0);
  assert.equal(h.$('session').hidden, false);
  const removal = deferred();
  const other = await harness({ removeFavorite: () => removal.promise });
  const removing = other.button(0).fire('click');
  other.auth('SIGNED_OUT'); removal.resolve(ok({})); await removing;
  assert.equal(other.cards().length, 0);
  assert.equal(other.$('session').hidden, false);
  assert.equal(other.$('message').hidden, true);
});

test('book nulo continua removível; inválidos e duplicados não quebram outros cards', async () => {
  const h = await harness({ listFavorites: async () => ok([null, {}, { bookId: 'invalid' }, { bookId: idA, book: null }, favorite(idA), favorite(idB)]) });
  assert.equal(h.cards().length, 2);
  assert.equal(h.$('count').textContent, '2 livros favoritos.');
  assert.equal(h.$('message').dataset.type, 'warning');
  assert.ok(h.cards()[0].querySelectorAll('span').some(el => el.textContent === 'Obra indisponível'));
  await h.button(0).fire('click');
  assert.deepEqual(h.calls.remove, [idA]);
});

test('falha no service de capas e imagem quebrada preservam lista e placeholder', async () => {
  const h = await harness({ listFavorites: async () => ok([favorite(idA, { coverPath: 'missing.jpg' })]), getBookCoverUrl: async () => { throw Error('offline'); } });
  assert.equal(h.cards().length, 1);
  assert.equal(h.cards()[0].querySelectorAll('img').length, 0);
  const other = await harness({ listFavorites: async () => ok([favorite(idA, { coverPath: 'missing.jpg' })]), getBookCoverUrl: async () => ok({ url: 'https://example.invalid/cover.jpg' }) });
  const image = other.cards()[0].querySelectorAll('img')[0];
  await image.fire('error');
  assert.equal(other.cards()[0].querySelectorAll('img').length, 0);
  assert.equal(other.cards()[0].querySelectorAll('span')[1].hidden, false);
});

test('ambos datasources persistem nos links e cards; botão padrão segue reutilizável', async () => {
  for (const source of ['mock', 'supabase']) {
    const h = await harness({}, source);
    for (const link of [...h.links, h.cards()[0].querySelectorAll('a')[0]]) assert.equal(new URL(link.href).searchParams.get('datasource'), source);
    await vm.runInContext(`createBookCard({id: '${idA}', title: 'Padrão', status: 'published'}, {href: './detalhes-obra.html'})`, h.context);
    assert.equal(h.calls.favoriteButton, 1);
  }
});

test('HTML contém IDs únicos, assets locais e layout compartilhado sem caminhos antigos', () => {
  const html = read('biblioteca.html');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of read('js/pages/favoritesPage.js').matchAll(/document.querySelector\("#([^"]+)"\)/g)) assert.ok(ids.includes(match[1]), match[1]);
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^"?]+)"/g)) assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
  assert.match(html, /data-site-header/);
  assert.match(html, /site-layout.js/);
  assert.doesNotMatch(html, /\.\.\/|styles.css|responsive.css|user-pages.css/);
  assert.doesNotMatch(read('js/pages/favoritesPage.js'), /mockData|services\/adapters|supabase\./i);
  for (const file of ['perfil.html', 'meuslivros.html', 'js/components/site-layout.js']) {
    assert.match(read(file), /biblioteca.html/);
    assert.doesNotMatch(read(file), /livrosfavoritos.html|livros-favoritos.html/);
  }
});

test('login redireciona para Biblioteca com datasource e falha mantém formulário', async () => {
  for (const source of ['mock', 'supabase']) {
    for (const success of [true, false]) {
      const elements = new Map();
      for (const id of ['login-form', 'email', 'password', 'login-button', 'login-message']) elements.set(`#${id}`, new Element());
      elements.get('#email').value = 'leitor@example.test';
      elements.get('#password').value = 'senha-teste';
      let assigned;
      const location = new URL(`http://localhost/login.html?datasource=${source}`);
      location.assign = value => { assigned = value; };
      const context = vm.createContext({
        document: { querySelector: id => elements.get(id) }, window: { location }, URL, URLSearchParams,
        clearFeedback() {}, showFeedback() {}, setFieldError() {}, setProcessing() {},
        signIn: async () => success ? ok({}) : fail('NETWORK_ERROR')
      });
      for (const file of ['js/components/navigation-context.js', 'js/pages/loginPage.js']) {
        vm.runInContext(read(file).replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '').replace(/^export /gm, ''), context);
      }
      await elements.get('#login-form').fire('submit');
      if (success) {
        assert.equal(new URL(assigned).pathname, '/biblioteca.html');
        assert.equal(new URL(assigned).searchParams.get('datasource'), source);
      } else assert.equal(assigned, undefined);
    }
  }
});

test('evento inicial não duplica consulta; novo login consulta coleção da sessão atual', async () => {
  let attempts = 0;
  const h = await harness({ listFavorites: async () => ++attempts === 1 ? fail('UNAUTHENTICATED') : ok([favorite(idB)]) });
  h.auth('INITIAL_SESSION'); await flush();
  assert.equal(attempts, 1);
  h.auth('SIGNED_IN');
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(attempts, 2);
  assert.equal(h.$('session').hidden, true);
  assert.equal(new URL(h.cards()[0].querySelectorAll('a')[0].href).searchParams.get('id'), idB);
});

test('logout durante resolução de capa impede publicação tardia do card', async () => {
  const cover = deferred();
  const h = await harness({ listFavorites: async () => ok([favorite(idA, { coverPath: 'cover.jpg' })]), getBookCoverUrl: () => cover.promise });
  h.auth('SIGNED_OUT');
  cover.resolve(ok({ url: null })); await flush();
  assert.equal(h.cards().length, 0);
  assert.equal(h.$('session').hidden, false);
});
