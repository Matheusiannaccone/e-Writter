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
  removeAttribute(key) { delete this.attributes[key]; }
  replaceChildren(...items) { this.children = items; if (this.tag === 'select') this.value = items[0]?.value ?? ''; }
  append(...items) { this.children.push(...items); }
  add(item) { this.append(item); }
  querySelectorAll(selector) {
    return this.children.flatMap((child) => [...(selector === child.tag ? [child] : []), ...child.querySelectorAll(selector)]);
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
    document: { querySelector: $, querySelectorAll: () => [], createElement: (tag) => new Element(tag) },
    window: { location, history: { replaceState: (_, __, value) => { location.href = new URL(value, location).href; } } },
    location, URL, URLSearchParams, console: { error() {} },
    Option: function (text, value) { const option = new Element('option'); option.textContent = text; option.value = value; return option; },
    getMyBooks: async () => ok(books), getChaptersByBook: async () => ok([chapter]),
    createChapter: async () => ok(chapter), updateChapter: async () => ok(chapter), ...overrides
  });
  function run(file) {
    // Substitui apenas imports; o corpo da página é executado integralmente.
    vm.runInContext(read(file).replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, ''), context);
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
    assert.equal(new URL(h.$('#chapter-back-link').href).searchParams.get('book'), 'book-b');
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

test('sessão expirada no save preserva texto e impede novas gravações', async () => {
  const h = await editor({ createChapter: async () => failure('UNAUTHENTICATED') });
  h.fill();
  await h.$('#chapter-form').fire('submit');
  assert.equal(h.$('#chapter-content').value, 'Texto novo');
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
  vm.runInContext('busy = false;', h.context);
  button.fire('click');
  const target = new URL(h.location.assigned);
  assert.equal(target.pathname, '/chapter-editor.html');
  assert.equal(target.searchParams.get('bookId'), 'book-a');
  assert.equal(target.searchParams.get('datasource'), 'supabase');
});
