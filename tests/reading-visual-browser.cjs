// Navegador real contra servidor local; nenhum tráfego ao Supabase é permitido.
// Requer Playwright resolvível por Node e Chrome instalado (ou PLAYWRIGHT_CHROME_EXECUTABLE).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/') pathname = '/index.html';
  if (!path.extname(pathname)) pathname += '.html';
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(error ? 'Not found' : data);
  });
});
(async () => {
 let browser;
 try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROME_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE } : { channel: 'chrome' }) });
  const context = await browser.newContext();
  const unexpected = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base + '/')) return route.continue();
    // dataSource importa o cliente mesmo no Mock. Isolar somente o SDK externo.
    if (url.startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/')) return route.fulfill({ contentType: 'text/javascript', body: 'export const createClient = () => ({});' });
    if (url.startsWith('https://fonts.googleapis.com/')) return route.fulfill({ contentType: 'text/css', body: '' });
    unexpected.push(url); return route.abort();
  });

  const bookId = '11111111-1111-1111-1111-111111111111';
  const chapterId = '33333333-3333-3333-3333-333333333333';
  const book = {id: bookId, authorId: 'mock-user-1', title: 'As histórias que atravessam o tempo', description: 'Uma viagem entre memórias e descobertas.\n\nCada encontro abre um caminho para o inesperado, entre cartas antigas e histórias que ainda esperam para ser contadas.', status: 'published', publicationStatus: 'ongoing', language: 'pt-BR', genres: [{name: 'Fantasia'}]};
  const chapter = {id: chapterId, bookId, title: 'O começo de uma longa jornada', position: 1, status: 'published', content: 'O sol atravessava a janela quando ela abriu a primeira carta.\n\nHavia ali uma história inteira, esperando por uma nova leitura.'};
  const second = {...chapter, id: '66666666-6666-6666-6666-666666666666', position: 3, title: 'O encontro que mudou os caminhos e revelou um mundo além das montanhas'};
  const draft = {...chapter, id: '44444444-4444-4444-4444-444444444444', position: 2, status: 'draft', title: 'Rascunho oculto'};
  let scenario = 'one';
  await context.route('**/js/services/bookService.js', route => route.fulfill({contentType: 'text/javascript', body:
    'export async function getBookById() {' + (scenario === 'loading' ? 'await new Promise(resolve => window.__releaseBook = resolve);' : '') + 'return ' + JSON.stringify(scenario === 'error' ? {data: null, error: {code: 'NETWORK_ERROR'}} : {data: book, error: null}) + ';}'
  }));
  await context.route('**/js/services/chapterService.js', route => {
    const list = scenario === 'empty' ? [] : scenario === 'many' ? [second, draft, chapter] : [chapter, draft];
    return route.fulfill({contentType: 'text/javascript', body:
      'export async function getChaptersByBook() { return ' + JSON.stringify({data: list, error: null}) + '; }' +
      'export async function getChapterById(id) { return {data: ' + (scenario === 'draft' ? JSON.stringify(draft) : '(id === ' + JSON.stringify(second.id) + ' ? ' + JSON.stringify(second) + ' : ' + JSON.stringify(chapter) + ')') + ', error: null}; }'
    });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const artifacts = path.join(root, 'tmp', 'reading-review');
  fs.mkdirSync(artifacts, {recursive: true});
  async function go(file, id) { await page.goto(base + '/' + file + '?id=' + id + '&datasource=mock'); }
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({width, height: 900});
    for (scenario of ['one', 'many']) {
      await go('detalhes-obra.html', bookId);
      await page.locator('#obra-content').waitFor({state: 'visible'});
      const cards = page.locator('#chapter-list .chapter-card');
      assert.equal(await cards.count(), scenario === 'one' ? 1 : 2);
      assert.deepEqual(await cards.locator('.chapter-number').allTextContents(), scenario === 'one' ? ['01'] : ['01', '03']);
      assert.equal(await cards.first().locator('.chapter-details strong').textContent(), chapter.title);
      assert.equal(await page.locator('#chapter-list').getByText('Publicado', {exact: true}).count(), 0);
      assert.equal(await page.getByText('Rascunho oculto', {exact: true}).count(), 0);
      assert.match(await page.locator('#chapter-count-label').textContent(), scenario === 'one' ? /^1 publicado$/ : /^2 publicados$/);
      const href = new URL(await cards.first().getAttribute('href'));
      assert.equal(href.pathname, '/chapter.html'); assert.equal(href.searchParams.get('id'), chapterId); assert.equal(href.searchParams.get('datasource'), 'mock');
      assert.equal(await page.locator('#obra-description').textContent(), book.description);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width !== 320 && scenario === 'many') {
        await page.locator('.synopsis-section').scrollIntoViewIfNeeded();
        await page.screenshot({path: path.join(artifacts, 'details-' + width + '.png'), fullPage: true});
      }
      await cards.first().click();
      await page.locator('#chapter').waitFor({state: 'visible'});
      for (const selector of ['#navigation-shortcut', '#return-to-chapter']) {
        assert.equal(await page.locator(selector).isVisible(), true);
        const style = await page.locator(selector).evaluate(node => ({height: node.getBoundingClientRect().height, border: getComputedStyle(node).borderTopStyle, padding: parseFloat(getComputedStyle(node).paddingLeft)}));
        assert.ok(style.height >= 44); assert.equal(style.border, 'solid'); assert.ok(style.padding > 0);
        await page.locator(selector).focus();
        assert.equal(await page.locator(selector).evaluate(node => getComputedStyle(node).outlineStyle), 'solid');
        await page.locator(selector).hover();
      }
      assert.equal(await page.locator('#chapter-navigation').isVisible(), scenario === 'many');
      assert.equal(await page.locator('#previous-chapter').isVisible(), false);
      assert.equal(await page.locator('#next-chapter').isVisible(), scenario === 'many');
      if (scenario === 'many') assert.equal(new URL(await page.locator('#next-chapter').getAttribute('href')).searchParams.get('id'), second.id);
      if (scenario === 'many') {
        await page.locator('#next-chapter').click();
        await page.getByRole('heading', {name: second.title, exact: true}).waitFor();
        assert.equal(await page.locator('#next-chapter').isVisible(), false);
        assert.equal(new URL(await page.locator('#previous-chapter').getAttribute('href')).searchParams.get('id'), chapterId);
        await page.locator('#previous-chapter').click();
        await page.getByRole('heading', {name: chapter.title, exact: true}).waitFor();
      }
      assert.deepEqual(await page.locator('#chapter-content p').allTextContents(), chapter.content.split('\n\n'));
      await page.locator('#return-to-chapter').click();
      assert.equal(new URL(page.url()).hash, '#chapter-title');
      const back = new URL(await page.locator('#navigation-shortcut').getAttribute('href'));
      assert.equal(back.pathname, '/detalhes-obra.html'); assert.equal(back.searchParams.get('id'), bookId); assert.equal(back.searchParams.get('datasource'), 'mock');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width !== 320 && scenario === 'one') await page.screenshot({path: path.join(artifacts, 'reader-' + width + '.png'), fullPage: true});
      await page.locator('#navigation-shortcut').click();
      await page.locator('#obra-content').waitFor({state: 'visible'});
    }
    console.log('PASS ' + width + 'px: capítulos publicados, ordem, sinopse, links, um/vários capítulos, botões e foco');
  }
  scenario = 'empty'; await go('detalhes-obra.html', bookId);
  await page.locator('.chapters-empty').waitFor({state: 'visible'});
  assert.equal(await page.locator('#start-reading').getAttribute('aria-disabled'), 'true');
  assert.equal(await page.locator('#start-reading').getAttribute('href'), null);
  assert.equal(await page.locator('#chapter-count-label').textContent(), '0 publicados');
  for (const file of ['detalhes-obra.html', 'chapter.html']) {
    scenario = 'loading'; await go(file, file === 'chapter.html' ? chapterId : bookId);
    await page.waitForFunction(() => typeof window.__releaseBook === 'function');
    assert.equal(await page.locator(file === 'chapter.html' ? '#reader-state' : '#obra-status').isVisible(), true);
    await page.evaluate(() => window.__releaseBook());
    await page.locator(file === 'chapter.html' ? '#chapter' : '#obra-content').waitFor({state: 'visible'});
    scenario = 'error'; await go(file, file === 'chapter.html' ? chapterId : bookId);
    await page.getByRole('button', {name: 'Tentar novamente', exact: true}).waitFor({state: 'visible'});
    assert.equal(await page.locator(file === 'chapter.html' ? '#chapter' : '#obra-content').isVisible(), false);
    if (file === 'chapter.html') assert.equal(await page.locator('#navigation-shortcut').isVisible(), false);
    scenario = 'one';
    await page.getByRole('button', {name: 'Tentar novamente', exact: true}).click();
    // O módulo simulado mantém a resposta de erro até recarregar; o estado continua seguro.
  }
  scenario = 'draft'; await go('chapter.html', draft.id);
  await page.getByRole('heading', {name: 'Capítulo indisponível'}).waitFor();
  assert.equal(await page.locator('#chapter').isVisible(), false);
  assert.equal(await page.locator('#return-to-chapter').isVisible(), false);
  console.log('PASS vazio, carregamento, erro com retry e rascunho indisponível');
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
 } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
