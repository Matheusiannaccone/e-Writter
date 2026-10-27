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


  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
  const menus = {
    guest: ['Início', 'Entrar', 'Criar conta'],
    authenticated: ['Início', 'Biblioteca', 'Ateliê', 'Perfil', 'Meus Livros', 'Sair']
  };
  const targets = { 'Início': 'index.html', 'Biblioteca': 'biblioteca.html', 'Ateliê': 'book-editor.html', 'Perfil': 'perfil.html', 'Meus Livros': 'meuslivros.html', 'Entrar': 'login.html', 'Criar conta': 'cadastro.html' };
  for (const state of ['guest', 'authenticated']) {
    if (state === 'authenticated') {
      await page.setViewportSize({width: 1280, height: 844});
      await page.goto(base + '/login.html?datasource=mock');
      await page.locator('#email').fill('teste1@gmail.com');
      await page.locator('#password').fill('090909');
      await page.locator('#login-button').click();
      await page.waitForURL('**/biblioteca.html?datasource=mock');
    }
    for (const width of [320, 390, 768, 1024, 1280]) {
      await page.setViewportSize({width, height: 844});
      let baseline;
      for (const file of pages) {
        await page.goto(base + '/' + file + '?datasource=mock&bookId=11111111-1111-1111-1111-111111111111&chapterId=def');
        if (state === 'guest' && file === 'perfil.html') await page.waitForURL('**/login.html?*');
        await page.waitForFunction(state => document.querySelector('.session-nav')?.dataset.sessionState === state, state);
        if (state === 'authenticated' && file === 'book-editor.html') await page.waitForFunction(() => document.querySelector('#book-picker').value === '11111111-1111-1111-1111-111111111111');
        if (state === 'authenticated' && file === 'chapter-editor.html') await page.waitForFunction(() => document.querySelector('#chapter-book-select').value === '11111111-1111-1111-1111-111111111111');
        const header = page.locator('[data-site-header]');
        assert.equal(await header.count(), 1);
        const style = await header.evaluate(header => {
          const brand = header.querySelector('.site-brand'), inner = header.querySelector('.site-header__inner');
          const css = getComputedStyle(header), b = getComputedStyle(brand), i = getComputedStyle(inner);
          return {font: css.font, background: css.backgroundColor, brand: b.font, mark: getComputedStyle(brand.firstElementChild).width, padding: i.paddingBlock, minHeight: i.minHeight, left: inner.getBoundingClientRect().left};
        });
        if (!baseline) baseline = style;
        assert.deepEqual(style, baseline, file + ' em ' + width);
        if (width < 768) {
          assert.equal(await header.locator('.site-nav').isVisible(), false);
          await header.locator('.site-nav-toggle').click();
          assert.equal(await header.locator('.site-nav-toggle').getAttribute('aria-expanded'), 'true');
          await header.locator('.site-nav-toggle').press('Escape');
          assert.equal(await header.locator('.site-nav').isVisible(), false);
          await header.locator('.site-nav-toggle').click();
        }
        assert.deepEqual(await header.locator('.site-nav__link:visible').allTextContents(), menus[state], file + ': ' + state);
        assert.equal(await header.getByRole('link', {name: 'Leitura', exact: true}).count(), 0);
        assert.equal(await header.getByRole('link', {name: 'Escrever', exact: true}).count(), 0);
        assert.equal(await header.locator('.session-nav').count(), 1);
        assert.equal(await header.evaluate(node => node.scrollWidth > innerWidth), false, file + ' overflow em ' + width);
        for (const label of menus[state].filter(label => label !== 'Sair')) {
          const link = header.getByRole('link', {name: label, exact: true});
          const target = new URL(await link.getAttribute('href'));
          assert.equal(target.pathname, '/' + targets[label]);
          assert.equal(target.searchParams.get('datasource'), 'mock');
          if (new URL(page.url()).searchParams.has('bookId')) assert.equal(target.searchParams.get('bookId'), '11111111-1111-1111-1111-111111111111', file + ': ' + label);
          const current = target.pathname === new URL(page.url()).pathname;
          assert.equal(await link.getAttribute('aria-current'), current ? 'page' : null);
        }
        if (width < 768) {
          await header.getByRole('link', {name: 'Início', exact: true}).click();
          await page.waitForURL('**/index.html?*');
          await page.waitForFunction(state => document.querySelector('.session-nav')?.dataset.sessionState === state, state);
          assert.equal(await page.locator('.site-nav').isVisible(), false);
        }
      }
      console.log('PASS ' + state + ': ' + pages.length + ' páginas em ' + width + 'px; menu, destinos, parâmetros, destaque e acessibilidade');
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
 } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
