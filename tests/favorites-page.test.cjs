const { installSessionBoundary } = require('./helpers/session-boundary.cjs');
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
    this.classList = { add() {}, toggle() {} };
  }
  append(...items) { for (const item of items) { item.parent = this; this.children.push(item); } }
  appendChild(item) { this.append(item); }
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
async function harness(overrides = {}, source = 'mock', route = 'biblioteca.html') {
  const elements = new Map();
  const document = { activeElement: null, querySelector: id => elements.get(id), querySelectorAll: () => links, createElement: tag => make(tag) };
  function make(tag) { const el = new Element(tag); el.doc = document; return el; }
  for (const id of ['empty', 'list', 'count', 'message', 'retry', 'session']) elements.set(`#favorites-${id}`, make('div'));
  const links = [make('a'), make('a')];
  links[0].setAttribute('href', './login.html'); links[1].setAttribute('href', './index.html');
  let auth;
  const calls = { list: 0, remove: [], favoriteButton: 0 };
  const context = vm.createContext({
    document, window: { location: new URL(`http://localhost/${route}?datasource=${source}`) },
    URL, URLSearchParams, setTimeout,
    listFavorites: async () => { calls.list++; return ok([favorite()]); },
    removeFavorite: async id => { calls.remove.push(id); return ok({ bookId: id }); },
    onAuthStateChange: callback => { auth = callback; },
    getBookCoverUrl: async () => ok({ url: null }),
    createFavoriteButton: () => { calls.favoriteButton++; return make('button'); },
    ...overrides
  });
  const run = file => vm.runInContext(read(file).replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '').replace(/^export /gm, ''), context);
  installSessionBoundary(context);
  run('js/components/navigation-context.js');
  run('js/components/feedback.js');
  run('js/components/book-card.js');
  run('js/pages/favoritesPage.js');
  await flush();
  const $ = id => elements.get(`#favorites-${id}`);
  return { $, calls, links, context, document, auth: (...args) => auth(...args), cards: () => $('list').children, button: index => $('list').children[index].querySelectorAll('button')[0] };
}

test('lista usa card real, metadados e bookId do registro, sem consultas por card', async () => {
  const h = await harness({ listFavorites: async () => ok([favorite(idA)]) });
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

test('B10: resposta mista ignora obras inválidas antes de deduplicar e conta apenas cards apresentados', async () => {
  const h = await harness({ listFavorites: async () => ok([
    null, {}, { bookId: 'invalid' },
    { bookId: idA, book: null }, { bookId: idA, book: undefined },
    favorite(idA, { id: undefined }), favorite(idA, { id: 'invalid' }),
    favorite(idA, { id: idB }), favorite(idA), favorite(idA), favorite(idB)
  ]) });
  assert.equal(h.cards().length, 2);
  assert.equal(h.$('count').textContent, '2 livros favoritos.');
  assert.equal(h.$('message').dataset.type, 'warning');
  assert.equal(h.$('empty').hidden, true);
  assert.equal(h.$('list').hidden, false);
  const ids = h.cards().map(card => new URL(card.querySelectorAll('a')[0].href).searchParams.get('id'));
  assert.deepEqual(ids, [idA, idB]);
  await h.button(0).fire('click');
  assert.deepEqual(h.calls.remove, [idA]);
  assert.equal(h.cards().length, 1);
  assert.equal(h.$('count').textContent, '1 livro favorito.');
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
        document: { querySelector: id => elements.get(id), querySelectorAll: () => [] }, window: { location }, URL, URLSearchParams,
        clearFeedback() {}, showFeedback() {}, setFieldError() {}, setProcessing() {},
        prepareFormValidation: () => ({ validate: () => true }),
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

// Executa os módulos de destino com services simulados, sem importar adapters.
async function destinationPage(file, url, overrides = {}) {
  const elements = new Map();
  const document = {
    querySelector(selector) {
      // Home não inicia imports dinâmicos; cardForBook é exercitado explicitamente.
      if (file === 'home-books.js') return null;
      if (!elements.has(selector)) { const el = new Element(); el.doc = document; elements.set(selector, el); }
      return elements.get(selector);
    },
    getElementById(id) { return this.querySelector(`#${id}`); },
    createElement(tag) { const el = new Element(tag); el.doc = document; return el; }
  };
  const calls = [];
  const context = vm.createContext({
    document, window: { location: new URL(url) }, URL, URLSearchParams,
    console: { warn() {}, error() {} },
    getBookById: async id => { calls.push(id); return ok({ id, title: `Obra ${id}`, status: 'published', genres: [] }); },
    getChaptersByBook: async () => ok([{ id: 'chapter-1', position: 1, title: 'Primeiro', status: 'published' }]),
    getProfile: async () => ok(null), getBookCoverUrl: async () => ok({ url: null }),
    isFavorite: async () => ok(true), addFavorite: async () => ok({}), removeFavorite: async () => ok({}),
    ...overrides
  });
  installSessionBoundary(context);
  for (const source of ['js/components/navigation-context.js', 'js/components/feedback.js', 'js/components/favorite-session.js', `js/pages/${file}`]) {
    vm.runInContext(read(source).replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '').replace(/^export /gm, ''), context);
  }
  await flush();
  return { context, calls, $: id => document.getElementById(id) };
}

test('B05: cards reais de duas obras abrem detalhes consultando o bookId correto em ambas as rotas', async () => {
  for (const route of ['biblioteca', 'biblioteca.html']) {
    const h = await harness({ listFavorites: async () => ok([favorite(idA), favorite(idB)]) }, 'mock', route);
    for (const [index, expected] of [idA, idB].entries()) {
      const url = new URL(h.cards()[index].querySelectorAll('a')[0].href);
      assert.equal(url.pathname, route.endsWith('.html') ? '/detalhes-obra.html' : '/detalhes-obra');
      assert.equal(url.searchParams.get('id'), expected);
      assert.equal(url.searchParams.get('datasource'), 'mock');
      const details = await destinationPage('detalhesObraPage.js', url.href);
      assert.deepEqual(details.calls, [expected]);
      assert.equal(details.$('obra-title').textContent, `Obra ${expected}`);
      assert.equal(details.$('obra-content').hidden, false);
    }
  }
});

test('A08: Biblioteca, Home, Detalhes e capítulos preservam mock sem passar pelo redirect .html', async () => {
  for (const suffix of ['', '.html']) {
    const h = await harness({}, 'mock', `biblioteca${suffix}`);
    const home = await destinationPage('home-books.js', `http://localhost/index${suffix}?datasource=mock`);
    const homeCard = await vm.runInContext(`cardForBook({id: '${idB}'}, { createBookCard: async (book, options) => options, getProfile: async () => ({data: null}) })`, home.context);
    const detailUrls = [h.cards()[0].querySelectorAll('a')[0].href, homeCard.href];
    for (const detailUrl of detailUrls) {
      const details = await destinationPage('detalhesObraPage.js', detailUrl);
      const chapterLinks = [details.$('start-reading').href, details.$('chapter-list').querySelectorAll('a')[0].href];
      for (const href of chapterLinks) {
        const chapterUrl = new URL(href);
        assert.equal(chapterUrl.pathname, `/chapter${suffix}`);
        assert.equal(chapterUrl.searchParams.get('id'), 'chapter-1');
        assert.equal(chapterUrl.searchParams.get('datasource'), 'mock');
      }
    }
    // Sem id inicial, o leitor não importa services nem executa chamadas de rede.
    const reader = await destinationPage('chapter-reader.js', `http://localhost/chapter${suffix}?datasource=mock`);
    vm.runInContext(`setNeighbor('next-chapter', 'next-title', {id: 'chapter-2', title: 'Segundo'})`, reader.context);
    const next = new URL(reader.$('next-chapter').href);
    assert.equal(next.pathname, `/chapter${suffix}`);
    assert.equal(next.searchParams.get('id'), 'chapter-2');
    assert.equal(next.searchParams.get('datasource'), 'mock');
    const back = new URL(vm.runInContext(`withDataSource('./biblioteca.html').href`, reader.context));
    assert.equal(back.pathname, `/biblioteca${suffix}`);
    assert.equal(back.searchParams.get('datasource'), 'mock');
  }
});

test('B09: capa ausente não consulta service; falha retornada mantém placeholder', async () => {
  let calls = 0;
  const h = await harness({ getBookCoverUrl: async () => { calls++; return fail('NETWORK_ERROR'); } });
  assert.equal(calls, 0);
  assert.equal(h.cards()[0].querySelectorAll('img').length, 0);
  assert.ok(h.cards()[0].querySelectorAll('span').some(el => el.textContent === 'Sem capa' && !el.hidden));
  const failing = await harness({ listFavorites: async () => ok([favorite(idA, { coverPath: 'simulada' })]), getBookCoverUrl: async () => fail('NETWORK_ERROR') });
  assert.equal(failing.cards().length, 1);
  assert.equal(failing.cards()[0].querySelectorAll('img').length, 0);
  assert.ok(failing.cards()[0].querySelectorAll('span').some(el => el.textContent === 'Sem capa' && !el.hidden));
});

test('B09: imagem carregada esconde placeholder e erro posterior restaura fallback', async () => {
  const h = await harness({ listFavorites: async () => ok([favorite(idA, { coverPath: 'simulada' })]), getBookCoverUrl: async () => ok({ url: 'https://example.invalid/not-fetched.jpg' }) });
  const image = h.cards()[0].querySelectorAll('img')[0];
  const placeholder = h.cards()[0].querySelectorAll('span').find(el => el.textContent === 'Sem capa');
  await image.fire('load');
  assert.equal(placeholder.hidden, true);
  await image.fire('error');
  assert.equal(placeholder.hidden, false);
  assert.equal(h.cards()[0].querySelectorAll('img').length, 0);
});

test('B10: book inválido não gera card nem link e não interrompe favoritos válidos', async () => {
  for (const book of [null, undefined, false, 42, 'inválido', [], {}, { title: 'Sem ID' }, { id: '' }, { id: 42 }, { id: 'invalid' }]) {
    const h = await harness({ listFavorites: async () => ok([{ bookId: idA, book }, favorite(idB)]) });
    assert.equal(h.cards().length, 1);
    assert.equal(h.$('count').textContent, '1 livro favorito.');
    assert.equal(new URL(h.cards()[0].querySelectorAll('a')[0].href).searchParams.get('id'), idB);
    await h.button(0).fire('click');
    assert.equal(h.cards().length, 0);
    assert.deepEqual(h.calls.remove, [idB]);
  }
});

test('B10: todos os registros inválidos mostram informação de indisponibilidade sem cards ou links', async () => {
  const h = await harness({ listFavorites: async () => ok([
    null, { bookId: idA, book: null }, { bookId: idB },
    favorite(idA, { id: null }), favorite(idB, { id: 'invalid' }),
    favorite(idA, { id: idB })
  ]) });
  assert.equal(h.cards().length, 0);
  assert.equal(h.$('list').querySelectorAll('a').length, 0);
  assert.equal(h.$('list').hidden, true);
  assert.equal(h.$('count').textContent, '0 livros favoritos.');
  assert.equal(h.$('empty').hidden, true);
  assert.equal(h.$('session').hidden, true);
  assert.equal(h.$('message').hidden, false);
  assert.equal(h.$('message').dataset.type, 'warning');
  assert.match(h.$('message').textContent, /Nenhuma obra disponível/);
  assert.equal(h.$('retry').hidden, true);
  assert.equal(h.$('list').attributes['aria-busy'], 'false');
});

test('recuperação de falha na remoção permite nova tentativa sem nova listagem', async () => {
  let attempts = 0;
  const h = await harness({ removeFavorite: async () => ++attempts === 1 ? fail('NETWORK_ERROR') : ok({}) });
  await h.button(0).fire('click');
  assert.equal(h.cards().length, 1);
  assert.equal(h.$('message').dataset.type, 'error');
  await h.button(0).fire('click');
  assert.equal(h.cards().length, 0);
  assert.equal(h.$('empty').hidden, false);
  assert.equal(h.$('message').dataset.type, 'success');
  assert.equal(h.calls.list, 1);
});

test('Home na raiz preserva fonte e IDs sem gerar .html em servidor de rotas limpas', async () => {
  const home = await destinationPage('home-books.js', 'http://localhost:3000/?datasource=mock');
  const url = new URL(vm.runInContext(`bookDetailsUrl('${idA}').href`, home.context));
  assert.equal(url.pathname, '/detalhes-obra');
  assert.equal(url.searchParams.get('id'), idA);
  assert.equal(url.searchParams.get('datasource'), 'mock');
  const library = new URL(vm.runInContext(`withDataSource('./biblioteca.html').href`, home.context));
  assert.equal(library.pathname, '/biblioteca');
  assert.equal(library.searchParams.get('datasource'), 'mock');
});

test('Meus Livros limpa cards e descarta listagem e capas após mudança de sessão', async () => {
  for (const delayed of ['list', 'card']) {
    const pending = deferred();
    const h = await destinationPage('myBooksPage.js', 'http://localhost/meuslivros.html?datasource=mock', {
      getMyBooks: () => delayed === 'list' ? pending.promise : ok([{id:idA,title:'Privado'}]),
      createBookCard: () => delayed === 'card' ? pending.promise : new Element('article')
    });
    h.context.__auth('SIGNED_OUT'); pending.resolve(delayed === 'list' ? ok([{id:idA,title:'Privado'}]) : new Element('article')); await flush();
    assert.equal(h.$('my-books-list').children.length, 0); assert.equal(h.$('my-books-list').hidden, true);
  }
});

test('Detalhes sincroniza estado pessoal e descarta favorito atrasado após logout', async () => {
  const pending = deferred();
  const h = await destinationPage('detalhesObraPage.js', `http://localhost/detalhes-obra.html?id=${idA}&datasource=mock`, { isFavorite: () => pending.promise });
  // O seletor do controlador compartilhado identifica somente controles presentes no DOM.
  h.context.document.querySelectorAll = () => [h.$('favorite-button')];
  h.context.__auth('SIGNED_OUT'); pending.resolve(ok(true)); await flush();
  assert.equal(h.$('favorite-button').attributes['aria-pressed'], 'false');
  assert.match(h.$('favorite-status').textContent, /Entre/);
  assert.equal(h.$('obra-content').hidden, false);
});
