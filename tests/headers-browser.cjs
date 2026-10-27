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
  const pages = ['index.html', 'biblioteca.html', 'detalhes-obra.html', 'chapter.html', 'book-editor.html', 'chapter-editor.html', 'perfil.html', 'meuslivros.html'];
  // Autenticar somente no adapter Mock local.
  await page.goto(base + '/login.html?datasource=mock');
  await page.locator('#email').fill('teste1@gmail.com');
  await page.locator('#password').fill('090909');
  await page.locator('#login-button').click();
  await page.waitForURL('**/biblioteca.html?datasource=mock');
  for (const width of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({width, height: 844});
    let baseline;
    for (const file of pages) {
      await page.goto(base + '/' + file + '?datasource=mock&bookId=abc&chapterId=def');
      await page.waitForFunction(() => document.querySelector('.session-nav')?.dataset.sessionState === 'authenticated');
      const style = await page.locator('.site-header').evaluate(header => {
        const brand = header.querySelector('.site-brand'), inner = header.querySelector('.site-header__inner');
        const css = getComputedStyle(header), b = getComputedStyle(brand), i = getComputedStyle(inner);
        return {font: css.font, background: css.backgroundColor, brand: b.font, mark: getComputedStyle(brand.firstElementChild).width, padding: i.paddingBlock, minHeight: i.minHeight, left: inner.getBoundingClientRect().left};
      });
      if (!baseline) baseline = style;
      assert.deepEqual(style, baseline, file + ' em ' + width);
      if (width < 768) {
        assert.equal(await page.locator('.site-nav').isVisible(), false);
        await page.locator('.site-nav-toggle').click();
        assert.equal(await page.locator('.site-nav').isVisible(), true);
        await page.locator('.site-nav-toggle').press('Escape');
        assert.equal(await page.locator('.site-nav').isVisible(), false);
        await page.locator('.site-nav-toggle').click();
      }
      assert.equal(await page.locator('.session-nav').count(), 1);
      assert.equal(await page.getByRole('button', {name: 'Sair', exact: true}).count(), 1);
      assert.equal(await page.evaluate(() => document.querySelector('.site-header').scrollWidth > innerWidth), false, file + ' overflow em ' + width);
      const links = await page.locator('.site-header a').evaluateAll(nodes => nodes.map(node => node.href));
      assert.ok(links.every(link => new URL(link).searchParams.get('datasource') === 'mock'));
      assert.equal(new URL(page.url()).searchParams.get('bookId'), 'abc');
      assert.equal(new URL(page.url()).searchParams.get('chapterId'), 'def');
    }
    console.log('PASS headers em ' + width + 'px: tipografia, dimensões, alinhamento, menu e sessão');
  }
  assert.deepEqual(unexpected, []);
 } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
