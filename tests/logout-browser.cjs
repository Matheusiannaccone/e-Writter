// Exercita login, logout, limpeza de dados privados e navegação pelo histórico em navegador real.
// Execução independente: npm test seleciona apenas arquivos com sufixo .test.cjs.
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
  async function go(file) { await page.goto(`${base}/${file}${file.includes('?') ? '&' : '?'}datasource=mock`); }
  async function sessionState(state) { await page.waitForFunction(state => document.querySelector('.session-nav')?.dataset.sessionState === state, state); }
  async function login() {
    await go('login.html'); await page.locator('#email').fill('teste1@gmail.com'); await page.locator('#password').fill('090909');
    await page.locator('#login-button').click(); await page.waitForURL('**/biblioteca.html?datasource=mock'); await sessionState('authenticated');
  }
  await go('index.html'); await sessionState('guest');
  assert.equal(await page.getByRole('link', { name: 'Entrar', exact: true }).count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Sair', exact: true }).count(), 0);
  await login(); await page.reload(); await sessionState('authenticated');
  assert.equal(await page.getByRole('link', { name: 'Meus Livros', exact: true }).count(), 1);
  console.log('PASS login, navegação desktop e restauração após refresh');

  for (const file of ['perfil.html', 'meuslivros.html', 'biblioteca.html', 'book-editor.html', 'chapter-editor.html']) {
    await go(file); await sessionState('authenticated');
    if (file === 'perfil.html') await page.waitForFunction(() => !document.querySelector('#profile-save-button').disabled);
    if (file === 'meuslivros.html') await page.waitForFunction(() => document.querySelector('#my-books-list').children.length > 0);
    if (file === 'book-editor.html') {
      await page.waitForFunction(() => !document.querySelector('#editor-content').hidden);
      const value = await page.locator('#book-picker option').nth(1).getAttribute('value');
      await page.locator('#book-picker').selectOption(value);
      await page.waitForFunction(() => document.querySelector('#book-title').value !== '');
    }
    if (file === 'chapter-editor.html') {
      await page.waitForFunction(() => document.querySelector('#chapter-book-select').options.length > 1);
      const value = await page.locator('#chapter-book-select option').nth(1).getAttribute('value');
      await page.locator('#chapter-book-select').selectOption(value);
      await page.waitForFunction(() => !document.querySelector('#chapter-new-button').disabled);
    }
    await page.getByRole('button', { name: 'Sair', exact: true }).click(); await sessionState('guest');
    const session = await page.evaluate(async () => (await (await import('./js/services/authService.js')).getSession()).data);
    assert.equal(session, null);
    if (file === 'perfil.html') assert.equal(await page.locator('#profile-display-name-input').inputValue(), '');
    if (file === 'meuslivros.html') assert.equal(await page.locator('#my-books-list').textContent(), '');
    if (file === 'biblioteca.html') assert.equal(await page.locator('#favorites-list').textContent(), '');
    if (file === 'book-editor.html') assert.equal(await page.locator('#book-title').inputValue(), '');
    if (file === 'chapter-editor.html') assert.equal(await page.locator('#chapter-content').inputValue(), '');
    console.log('PASS logout e limpeza privada: ' + file); await login();
  }
  // Navegação real Voltar/Avançar e evento pageshow.persisted exercitam caminhos complementares.
  await go('perfil.html'); await page.waitForFunction(() => !document.querySelector('#profile-save-button').disabled);
  await page.locator('.site-brand').click(); await sessionState('authenticated');
  assert.equal(new URL(page.url()).searchParams.get('datasource'), 'mock');
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); await sessionState('guest');
  await page.goBack(); await page.waitForURL('**/login.html?next=perfil.html&datasource=mock');
  await page.goForward(); await sessionState('guest'); console.log('PASS Voltar/Avançar após logout e link da marca');

  for (const file of ['meuslivros.html', 'biblioteca.html', 'book-editor.html', 'chapter-editor.html']) {
    await go(file); await sessionState('guest');
    const privateData = await page.evaluate(() => document.querySelector('#my-books-list, #favorites-list, #chapter-list')?.textContent.trim() || '');
    assert.equal(privateData, '');
    if (file === 'book-editor.html') assert.equal(await page.locator('#editor-content').isVisible(), false);
  }
  console.log('PASS URLs privadas sem sessão');
  await login(); await go('perfil.html'); await page.waitForFunction(() => !document.querySelector('#profile-save-button').disabled);
  await page.evaluate(() => {
    sessionStorage.removeItem('e-writter-mock-user');
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await sessionState('guest');
  assert.equal(await page.locator('#profile-display-name-input').inputValue(), '');
  console.log('PASS revalidação explícita pageshow');

  for (const [file, getter, method, selector] of [
    ['perfil.html', 'getProfileAdapter', 'getMyProfile', '#profile-display-name-input'],
    ['meuslivros.html', 'getBookAdapter', 'getMyBooks', '#my-books-list'],
    ['biblioteca.html', 'getFavoriteAdapter', 'listFavorites', '#favorites-list'],
    ['book-editor.html', 'getBookAdapter', 'getMyBooks', '#book-title'],
    ['chapter-editor.html', 'getBookAdapter', 'getMyBooks', '#chapter-content']
  ]) {
    await login(); await go(file); await sessionState('authenticated');
    await page.evaluate(async ({ getter, method }) => {
      const adapter = (await import('./js/services/dataSource.js'))[getter]();
      const original = adapter[method].bind(adapter);
      window.__held = false; window.__released = false;
      adapter[method] = async (...args) => {
        const result = await original(...args);
        window.__held = true;
        await new Promise(resolve => { window.__release = resolve; });
        window.__released = true;
        return result;
      };
      dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    }, { getter, method });
    await page.waitForFunction(() => window.__held);
    await page.getByRole('button', { name: 'Sair', exact: true }).click(); await sessionState('guest');
    await page.evaluate(() => window.__release()); await page.waitForFunction(() => window.__released);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
    assert.equal(await page.locator(selector).evaluate(node => 'value' in node ? node.value : node.textContent.trim()), '');
    console.log('PASS resposta privada atrasada: ' + file);
  }
  await login();
  await page.evaluate(() => {
    window.__removeItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(key) { if (this === sessionStorage && key === 'e-writter-mock-user') throw Error('blocked by test'); return window.__removeItem.call(this, key); };
  });
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); await sessionState('error');
  assert.equal(await page.getByRole('button', { name: 'Tentar sair novamente' }).count(), 1);
  await page.evaluate(() => { Storage.prototype.removeItem = window.__removeItem; });
  await page.getByRole('button', { name: 'Tentar sair novamente' }).click(); await sessionState('guest');
  console.log('PASS falha de armazenamento sem sucesso falso e retry');
  await login(); await go('redefinir-senha.html');
  await page.waitForFunction(() => !document.querySelector('#save-button').disabled);
  await page.locator('#password').fill('temporaria123');
  await page.evaluate(async () => { await (await import('./js/services/authService.js')).signOut(); });
  assert.equal(await page.locator('#save-button').isDisabled(), true);
  assert.equal(await page.locator('#password').inputValue(), '');
  console.log('PASS redefinição limpa senha e bloqueia operação após logout');
  await page.setViewportSize({ width: 390, height: 844 }); await go('index.html'); await sessionState('guest');
  assert.equal(await page.locator('.site-nav').isVisible(), false);
  await page.locator('.site-nav-toggle').click();
  assert.equal(await page.locator('.session-nav').getByRole('link', { name: 'Entrar', exact: true }).isVisible(), true);
  await login(); await page.locator('.site-nav-toggle').click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); await sessionState('guest');
  assert.equal(await page.locator('.session-nav').getByRole('link', { name: 'Entrar', exact: true }).isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log('PASS menu mobile e logout sem overflow');
  await login();
  for (const width of [390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    if (width < 768) await page.locator('.site-nav-toggle').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'overflow em ' + width);
  }
  console.log('PASS navegação autenticada sem overflow em 390, 768, 1024 e 1280px');
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log('PASS nenhum erro JavaScript e nenhuma chamada remota');
 } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
