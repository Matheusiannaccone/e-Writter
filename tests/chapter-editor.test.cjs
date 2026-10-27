const { installSessionBoundary } = require('./helpers/session-boundary.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const flush = () => new Promise(setImmediate);
const ok = (data) => ({ data, error: null });
const failure = (code = 'NETWORK_ERROR') => ({ data: null, error: { code, message: 'Falha de teste' } });
const books = [{ id: 'book-a', title: 'A' }, { id: 'book-b', title: 'B' }];
const chapter = { id: 'chapter-a', bookId: 'book-a', title: 'Original', content: 'Texto original', position: 1, status: 'draft' };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// DOM mínimo para testar os handlers reais com services controlados, sem rede.
class Element {
  constructor(tag = 'div') {
    Object.assign(this, { tag, value: '', textContent: '', disabled: false, hidden: false, dataset: {}, children: [], attributes: {}, handlers: {} });
  }
  addEventListener(type, handler) { this.handlers[type] = handler; }
  fire(type) { return this.handlers[type]?.({ preventDefault() {} }); }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return key === 'href' ? this.href : this.attributes[key]; }
  removeAttribute(key) { delete this.attributes[key]; }
  replaceChildren(...items) { this.children = items; if (this.tag === 'select') this.value = items[0]?.value ?? ''; }
  append(...items) { this.children.push(...items); }
  add(item) { this.append(item); }
  querySelectorAll(selector) {
    return this.children.flatMap((child) => [...(selector === child.tag ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) {
    this.slots ??= new Map();
    if (!this.slots.has(selector)) this.slots.set(selector, new Element());
    return this.slots.get(selector);
  }
  focus() { this.focused = true; }
}
function harness(overrides = {}, url = 'http://localhost/chapter-editor.html?bookId=book-a&datasource=mock') {
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, new Element(id.includes('select') || id === '#book-picker' ? 'select' : 'div'));
    return elements.get(id);
  };
  $('#chapter-form').reset = () => { $('#chapter-title').value = ''; $('#chapter-content').value = ''; };
  const location = new URL(url);
  location.assign = (value) => { location.assigned = value; };
  const context = vm.createContext({
    document: {
      querySelector: $, getElementById: (id) => $(`#${id}`),
      querySelectorAll: (selector) => selector === '[data-editor-link]' ? [$('#chapter-back-link'), $('#header-editor-link')] : [],
      createElement: (tag) => new Element(tag)
    },
    window: { location, history: { replaceState: (_, __, value) => { location.href = new URL(value, location).href; } } },
    location, URL, URLSearchParams, console: { error() {} },
    Option: function (text, value) { const option = new Element('option'); option.textContent = text; option.value = value; return option; },
    getMyBooks: async () => ok(books), getChaptersByBook: async () => ok([chapter]),
    getGenres: async () => ok([]), bookBlockers: () => [], chapterBlockers: () => [],
    createChapter: async () => ok(chapter), updateChapter: async () => ok(chapter), ...overrides
  });
  installSessionBoundary(context);
  vm.runInContext(read('js/components/editor-navigation.js').replace(/^export /gm, ''), context);
  vm.runInContext(read('js/components/navigation-context.js').replace(/^export /gm, ''), context);
  function run(file) {
    // Substitui apenas imports; o corpo da página é executado integralmente.
    vm.runInContext(read(file).replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '').replace(/^export /gm, ''), context);
  }
  return { $, context, location, run, fill() { $('#chapter-title').value = '  Novo título  '; $('#chapter-content').value = 'Texto novo'; } };
}
async function editor(overrides, url) {
  const h = harness(overrides, url);
  h.run('js/pages/chapterEditorPage.js');
  await flush();
  return h;
}

test('HTML contém os IDs únicos exigidos, assets locais e um único formulário', () => {
  const html = read('chapter-editor.html');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of read('js/pages/chapterEditorPage.js').matchAll(/document.querySelector\("#([^"]+)"\)/g)) assert.ok(ids.includes(match[1]), match[1]);
  assert.equal((html.match(/<form\b/g) || []).length, 1);
  assert.equal((html.match(/<\/form>/g) || []).length, 1);
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^"?]+)"/g)) assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
  assert.doesNotMatch(read('js/pages/chapterEditorPage.js'), /services\/adapters|supabase/i);
  const bookHtml = read('book-editor.html');
  for (const match of read('js/pages/book-editor.js').matchAll(/\$\('#([^']+)'\)/g)) {
    assert.ok(bookHtml.includes(`id="${match[1]}"`), match[1]);
  }
});

test('sessão ausente impede escrita e não consulta capítulos', async () => {
  let calls = 0;
  const h = await editor({ getMyBooks: async () => failure('UNAUTHENTICATED'), getChaptersByBook: async () => { calls++; } });
  assert.equal(calls, 0);
  assert.equal(h.$('#chapter-save-button').disabled, true);
  assert.equal(h.$('#chapter-book-select').disabled, true);
  assert.match(h.$('#chapter-list-state').textContent, /Entre na sua conta/);
});

test('obra alheia na URL não é selecionada nem consultada', async () => {
  let calls = 0;
  const h = await editor({ getMyBooks: async () => ok([books[0]]), getChaptersByBook: async () => { calls++; } }, 'http://localhost/chapter-editor.html?bookId=other');
  assert.equal(calls, 0);
  assert.equal(h.$('#chapter-book-select').value, '');
  assert.equal(h.$('#chapter-list-state').dataset.type, 'error');
});

test('lista vazia permite criar; nenhuma obra mantém formulário bloqueado', async () => {
  const h = await editor({ getChaptersByBook: async () => ok([]) });
  assert.equal(h.$('#chapter-list-state').dataset.type, 'empty');
  assert.equal(h.$('#chapter-save-button').disabled, false);
  const empty = await editor({ getMyBooks: async () => ok([]) });
  assert.equal(empty.$('#chapter-list-state').dataset.type, 'empty');
  assert.equal(empty.$('#chapter-save-button').disabled, true);
});

test('falhas retornadas, exceções e respostas inválidas bloqueiam a lista', async () => {
  for (const getChaptersByBook of [async () => failure(), async () => { throw Error('offline'); }, async () => ({})]) {
    const h = await editor({ getChaptersByBook });
    assert.equal(h.$('#chapter-list-state').dataset.type, 'error');
    assert.equal(h.$('#chapter-save-button').disabled, true);
    assert.equal(h.$('#chapter-list').attributes['aria-busy'], 'false');
    assert.equal(h.$('#chapter-book-select').disabled, false);
  }
});

test('respostas e erros atrasados não substituem a obra atual', async () => {
  for (const rejectOld of [false, true]) {
    const old = deferred();
    const h = await editor({ getChaptersByBook: (id) => id === 'book-a' ? old.promise : Promise.resolve(ok([{ ...chapter, title: 'Obra B' }])) });
    h.$('#chapter-book-select').value = 'book-b';
    h.$('#chapter-book-select').fire('change');
    await flush();
    if (rejectOld) old.reject(Error('offline')); else old.resolve(ok([chapter]));
    await flush();
    assert.equal(h.$('#chapter-list').children[0].children[0].children[0].textContent, 'Obra B');
    assert.equal(h.$('#chapter-save-button').disabled, false);
    assert.equal(h.location.searchParams.get('datasource'), 'mock');
    assert.equal(new URL(h.$('#chapter-back-link').href).searchParams.get('bookId'), 'book-b');
  }
});

test('salvamento bloqueia edição e duplicação; create recebe somente campos do contrato', async () => {
  const save = deferred();
  const calls = [];
  const h = await editor({ createChapter: (...args) => { calls.push(args); return save.promise; } });
  h.fill();
  const saving = h.$('#chapter-form').fire('submit');
  const edit = h.$('#chapter-list').querySelectorAll('button')[0];
  assert.equal(edit.disabled, true);
  edit.fire('click');
  h.$('#chapter-form').fire('submit');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'book-a');
  assert.equal(JSON.stringify(calls[0][1]), JSON.stringify({ title: 'Novo título', content: 'Texto novo' }));
  assert.equal(h.$('#chapter-book-select').disabled, true);
  assert.equal(h.$('#chapter-title').value, '  Novo título  ');
  save.resolve(ok(chapter));
  await saving;
  assert.equal(h.$('#chapter-save-button').disabled, false);
  assert.equal(h.$('#chapter-form-message').dataset.type, 'success');
});

test('update usa ID do capítulo e mantém texto quando service recusa a edição', async () => {
  const calls = [];
  const h = await editor({ updateChapter: async (...args) => { calls.push(args); return failure('VALIDATION_ERROR'); } });
  h.$('#chapter-list').querySelectorAll('button')[0].fire('click');
  h.fill();
  await h.$('#chapter-form').fire('submit');
  assert.equal(calls[0][0], chapter.id);
  assert.deepEqual(Object.keys(calls[0][1]), ['title', 'content']);
  assert.equal(h.$('#chapter-content').value, 'Texto novo');
  assert.equal(h.$('#chapter-save-button').disabled, false);
});

test('sessão expirada no save limpa texto privado e impede novas gravações', async () => {
  const h = await editor({ createChapter: async () => failure('UNAUTHENTICATED') });
  h.fill();
  await h.$('#chapter-form').fire('submit');
  assert.equal(h.$('#chapter-content').value, '');
  assert.equal(h.$('#chapter-save-button').disabled, true);
  assert.equal(h.$('#chapter-book-select').disabled, true);
});

test('save confirmado com refresh falho informa persistência sem permitir duplicação', async () => {
  let reads = 0;
  const h = await editor({ getChaptersByBook: async () => ++reads === 1 ? ok([chapter]) : failure() });
  h.fill();
  await h.$('#chapter-form').fire('submit');
  assert.match(h.$('#chapter-form-message').textContent, /Capítulo salvo, mas a lista/);
  assert.equal(h.$('#chapter-save-button').disabled, true);
  assert.equal(h.$('#chapter-list-state').dataset.type, 'error');
});

test('limite, título e conteúdo vazios não enviam gravações', async () => {
  let calls = 0;
  const h = await editor({ createChapter: async () => { calls++; return ok(chapter); } });
  await h.$('#chapter-form').fire('submit');
  h.$('#chapter-title').value = 'Título';
  await h.$('#chapter-form').fire('submit');
  h.$('#chapter-content').value = 'x'.repeat(15001);
  await h.$('#chapter-form').fire('submit');
  assert.equal(calls, 0);
});

test('update bem-sucedido recarrega lista, contador e modo de novo rascunho', async () => {
  let saved = false;
  const h = await editor({
    updateChapter: async () => { saved = true; return ok(chapter); },
    getChaptersByBook: async () => ok([{ ...chapter, title: saved ? 'Atualizado' : chapter.title }])
  });
  h.$('#chapter-list').querySelectorAll('button')[0].fire('click');
  h.fill();
  await h.$('#chapter-form').fire('submit');
  assert.equal(h.$('#chapter-list').children[0].children[0].children[0].textContent, 'Atualizado');
  assert.equal(h.$('#chapter-character-count').textContent, '0 / 15.000');
  assert.equal(h.$('#chapter-cancel-button').hidden, true);
  assert.equal(h.$('#chapter-form-mode').textContent, 'NOVO RASCUNHO');
});

test('exceção ao salvar mantém rascunho e libera nova tentativa', async () => {
  const h = await editor({ createChapter: async () => { throw Error('offline'); } });
  h.fill();
  await h.$('#chapter-form').fire('submit');
  assert.equal(h.$('#chapter-content').value, 'Texto novo');
  assert.equal(h.$('#chapter-form-message').dataset.type, 'error');
  assert.equal(h.$('#chapter-save-button').disabled, false);
});

test('services de capítulos encaminham argumentos sem mudar o contrato', async () => {
  const calls = [];
  const adapter = Object.fromEntries(['getChaptersByBook', 'createChapter', 'updateChapter'].map((name) => [name, async (...args) => { calls.push([name, ...args]); return ok(chapter); }]));
  const context = vm.createContext({ getChapterAdapter: () => adapter });
  vm.runInContext(read('js/services/chapterService.js').replace(/^import[^;]+;/gm, '').replace(/export /g, ''), context);
  await vm.runInContext('getChaptersByBook("book-a")', context);
  await vm.runInContext('createChapter("book-a", {title: "Título", content: "Texto"})', context);
  await vm.runInContext('updateChapter("chapter-a", {title: "Título", content: "Texto"})', context);
  assert.equal(calls[0][1], 'book-a');
  assert.equal(calls[1][1], 'book-a');
  assert.equal(calls[2][1], 'chapter-a');
  for (const call of calls.slice(1)) assert.deepEqual(Object.keys(call[2]), ['title', 'content']);
});

test('ateliê navega somente com obra persistida, sem alterações ou operação em curso', () => {
  const h = harness({ getGenres: () => new Promise(() => {}) }, 'http://localhost/book-editor.html?datasource=supabase');
  h.run('js/pages/book-editor.js');
  const button = h.$('#open-chapter-editor');
  h.$('#book-picker').value = 'book-a';
  button.fire('click');
  assert.equal(h.location.assigned, undefined);
  vm.runInContext('books = [{id: "book-a"}]; pendingEdits = true;', h.context);
  button.fire('click');
  assert.equal(h.location.assigned, undefined);
  vm.runInContext('pendingEdits = false; busy = true;', h.context);
  button.fire('click');
  assert.equal(h.location.assigned, undefined);
  vm.runInContext('busy = false; sessionAllowed = true;', h.context);
  button.fire('click');
  const target = new URL(h.location.assigned);
  assert.equal(target.pathname, '/chapter-editor.html');
  assert.equal(target.searchParams.get('bookId'), 'book-a');
  assert.equal(target.searchParams.get('datasource'), 'supabase');
});

test('A01: seleciona bookId somente depois de getMyBooks confirmar a obra', async () => {
  const pendingBooks = deferred();
  const reads = [];
  const h = await editor({ getMyBooks: () => pendingBooks.promise, getChaptersByBook: async (id) => { reads.push(id); return ok([]); } });
  assert.equal(h.$('#chapter-book-select').value, '');
  assert.equal(h.$('#chapter-book-select').disabled, true);
  assert.deepEqual(reads, []);
  pendingBooks.resolve(ok(books));
  await flush();
  assert.equal(h.$('#chapter-book-select').value, 'book-a');
  assert.deepEqual(reads, ['book-a']);
});

test('A01: sem bookId mantém seletor vazio, inclusive com uma única obra', async () => {
  for (const ownBooks of [[books[0]], books]) {
    let reads = 0;
    const h = await editor({ getMyBooks: async () => ok(ownBooks), getChaptersByBook: async () => { reads++; return ok([]); } }, 'http://localhost:3000/chapter-editor?datasource=mock');
    assert.equal(h.$('#chapter-book-select').value, '');
    assert.equal(h.$('#chapter-book-select').disabled, false);
    assert.equal(h.$('#chapter-save-button').disabled, true);
    assert.equal(reads, 0);
  }
});

test('A01/D06: botão, seleção inicial e ambos os retornos preservam contexto em rotas .html e limpas', async () => {
  for (const extension of ['', '.html']) {
    for (const datasource of ['mock', 'supabase', null]) {
      const initial = new URL(`http://localhost:3000/livros/book-editor${extension}`);
      initial.searchParams.set('bookId', 'book-a');
      if (datasource) initial.searchParams.set('datasource', datasource);
      initial.searchParams.set('context', 'valor com espaços & acentos: ação');
      initial.searchParams.append('tag', 'um');
      initial.searchParams.append('tag', 'dois');
      const bookPage = harness({}, initial.href);
      bookPage.run('js/pages/book-editor.js');
      await flush();
      assert.equal(bookPage.$('#book-picker').value, 'book-a');
      assert.equal(bookPage.$('#open-chapter-editor').disabled, false);
      bookPage.$('#open-chapter-editor').fire('click');
      const target = new URL(bookPage.location.assigned);
      assert.equal(target.pathname, `/livros/chapter-editor${extension}`);
      assert.equal(target.searchParams.get('bookId'), 'book-a');
      assert.equal(target.searchParams.get('datasource'), datasource);
      assert.equal(target.searchParams.get('context'), initial.searchParams.get('context'));
      assert.deepEqual(target.searchParams.getAll('tag'), ['um', 'dois']);
      const chapterPage = await editor({}, target.href);
      assert.equal(chapterPage.$('#chapter-book-select').value, 'book-a');
      chapterPage.$('#chapter-book-select').value = 'book-b';
      chapterPage.$('#chapter-book-select').fire('change');
      await flush();
      for (const selector of ['#chapter-back-link', '#header-editor-link']) {
        const back = new URL(chapterPage.$(selector).href);
        assert.equal(back.pathname, `/livros/book-editor${extension}`);
        assert.deepEqual(back.searchParams.getAll('bookId'), ['book-b']);
        assert.equal(back.searchParams.has('book'), false);
        assert.equal(back.searchParams.get('datasource'), datasource);
        assert.equal(back.searchParams.get('context'), initial.searchParams.get('context'));
        assert.deepEqual(back.searchParams.getAll('tag'), ['um', 'dois']);
        const returnedPage = harness({}, back.href);
        returnedPage.run('js/pages/book-editor.js');
        await flush();
        assert.equal(returnedPage.$('#book-picker').value, 'book-b');
      }
    }
  }
});

test('D06: parâmetros únicos não duplicam nem mudam datasource após várias navegações', () => {
  const h = harness({}, 'http://localhost:3000/book-editor?book=old&bookId=book-a&bookId=wrong&datasource=supabase&datasource=mock&context=teste');
  for (const target of ['./chapter-editor.html', './book-editor.html', './chapter-editor.html']) {
    h.context.nextTarget = target;
    const url = vm.runInContext('editorUrl(nextTarget, "book-b")', h.context);
    assert.deepEqual(url.searchParams.getAll('datasource'), ['supabase']);
    assert.deepEqual(url.searchParams.getAll('bookId'), ['book-b']);
    assert.equal(url.searchParams.has('book'), false);
    assert.equal(url.searchParams.get('context'), 'teste');
    h.location.href = url.href;
  }
});

test('D06: limpar seleção remove IDs antigos e mantém parâmetros e fragmento da página', async () => {
  const h = await editor({}, 'http://localhost:3000/chapter-editor?bookId=book-a&book=old&datasource=mock&context=teste#conteudo');
  h.$('#chapter-book-select').value = '';
  h.$('#chapter-book-select').fire('change');
  await flush();
  assert.equal(h.location.searchParams.has('bookId'), false);
  assert.equal(h.location.searchParams.has('book'), false);
  assert.equal(h.location.searchParams.get('datasource'), 'mock');
  assert.equal(h.location.searchParams.get('context'), 'teste');
  assert.equal(h.location.hash, '#conteudo');
  assert.equal(h.$('#chapter-save-button').disabled, true);
});

test('D06: header compartilhado preserva query também nas rotas sem extensão', () => {
  for (const route of ['book-editor', 'chapter-editor', 'book-editor.html', 'chapter-editor.html']) {
    const h = harness({}, `http://localhost:3000/${route}?bookId=book-a&datasource=supabase&context=teste`);
    const link = h.$('#header-editor-link');
    link.href = 'http://localhost:3000/book-editor.html';
    const header = { querySelector: () => null, querySelectorAll: () => [link], innerHTML: '' };
    h.context.document.querySelector = (selector) => selector === '[data-site-header]' ? header : null;
    h.run('js/components/auth-navigation.js');
    h.run('js/components/site-layout.js');
    assert.match(header.innerHTML, /data-editor-link/);
    const target = new URL(link.href);
    assert.equal(target.pathname, route.endsWith('.html') ? '/book-editor.html' : '/book-editor');
    assert.equal(target.searchParams.get('datasource'), 'supabase');
    assert.equal(target.searchParams.get('bookId'), 'book-a');
    assert.equal(target.searchParams.get('context'), 'teste');
    assert.equal(link.attributes['aria-current'], route.startsWith('book-editor') ? 'page' : undefined);
  }
});

test('links antigos com book continuam selecionando somente obras do usuário no ateliê', async () => {
  for (const [requested, expected] of [['book-a', 'book-a'], ['other', '']]) {
    const h = harness({}, `http://localhost:3000/book-editor?book=${requested}&datasource=mock`);
    h.run('js/pages/book-editor.js');
    await flush();
    assert.equal(h.$('#book-picker').value, expected);
  }
});

test('D06: regra real de getDataSource permanece igual após navegar', () => {
  const source = read('js/services/dataSource.js')
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/^export /gm, '');
  const activeSource = (url) => vm.runInNewContext(`${source}\ngetDataSource();`, { window: { location: new URL(url) }, URLSearchParams });
  for (const query of ['', '?datasource=mock', '?datasource=supabase', '?datasource=supabase&datasource=mock']) {
    const h = harness({}, `http://localhost:3000/book-editor${query}`);
    const before = activeSource(h.location.href);
    for (const target of ['./chapter-editor.html', './book-editor.html']) {
      h.context.nextTarget = target;
      h.location.href = vm.runInContext('editorUrl(nextTarget, "book-a").href', h.context);
      assert.equal(activeSource(h.location.href), before);
    }
  }
});

test('logout durante carga de capítulos descarta resultado privado e limpa seleção', async () => {
  const pending = deferred(); const h = await editor({ getChaptersByBook: () => pending.promise });
  h.context.__auth('SIGNED_OUT'); pending.resolve(ok([chapter])); await flush();
  assert.equal(h.$('#chapter-list').children.length, 0);
  assert.equal(h.$('#chapter-content').value, ''); assert.equal(h.$('#chapter-save-button').disabled, true);
});

test('logout durante save de capítulo impede sucesso tardio e reativação no finally', async () => {
  const pending = deferred(); const h = await editor({ createChapter: () => pending.promise }); h.fill();
  const saving = h.$('#chapter-form').fire('submit'); h.context.__auth('SIGNED_OUT'); pending.resolve(ok(chapter)); await saving;
  assert.equal(h.$('#chapter-content').value, ''); assert.equal(h.$('#chapter-book-select').children.length, 0);
  assert.equal(h.$('#chapter-save-button').disabled, true); assert.doesNotMatch(h.$('#chapter-form-message').textContent, /sucesso/);
});

test('ateliê bloqueia acesso direto sem sessão e descarta obras após logout', async () => {
  const absent = harness({ getCurrentUser: async () => failure('UNAUTHENTICATED') });
  absent.run('js/pages/book-editor.js'); await flush(); assert.equal(absent.$('#editor-content').hidden, true);
  const pending = deferred(); const h = harness({ getMyBooks: () => pending.promise });
  h.run('js/pages/book-editor.js'); await flush(); h.context.__auth('SIGNED_OUT'); pending.resolve(ok(books)); await flush();
  assert.equal(h.$('#book-picker').children.length, 0); assert.equal(h.$('#editor-content').hidden, true);
  assert.equal(h.$('#save-book').disabled, true);
});

test('ateliê descarta save e publicação anteriores ao logout', async () => {
  for (const action of ['save', 'publication']) {
    const pending = deferred(); const h = harness({ updateBook: () => pending.promise, unpublishBook: () => pending.promise });
    h.run('js/pages/book-editor.js'); await flush();
    vm.runInContext('books = [{id: "book-a",title: "Privado",status: "published"}]; sessionAllowed = true; picker.value = "book-a";', h.context);
    h.context.window.confirm = () => true;
    let operation;
    if (action === 'save') { vm.runInContext('validate = () => true;', h.context); operation = h.$('#book-form').fire('submit'); }
    else operation = vm.runInContext('changePublication("book")', h.context);
    h.context.__auth('SIGNED_OUT'); pending.resolve(ok(books[0])); await operation;
    assert.equal(h.$('#editor-content').hidden, true); assert.equal(h.$('#save-book').disabled, true);
    assert.equal(h.$('#book-title').value, ''); assert.equal(h.$('#book-picker').children.length, 0);
  }
});
