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
    if (url.startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/')) return route.fulfill({ contentType: 'text/javascript', body: `export const createClient = () => ({auth:{resetPasswordForEmail: async () => {
window.__calls = (window.__calls || 0) + 1;
if (window.__mode === 'network') return {error:{name:'AuthRetryableFetchError',message:'Failed to fetch'}};
if (window.__mode === 'rate') return {error:{status:429,message:'Too many requests'}};
return {data:{},error:null};
}}});` });
    if (url.startsWith('https://fonts.googleapis.com/')) return route.fulfill({ contentType: 'text/css', body: '' });
    unexpected.push(url); return route.abort();
  });

  const page = await context.newPage();
  await page.clock.install({time: new Date('2026-10-27T12:00:00Z')});
  const url = base + '/recuperar-senha.html?datasource=supabase';
  const key = 'e-writter-password-recovery-available-at';
  await page.goto(url);
  await page.locator('#email').fill('existente@example.test');
  await page.locator('#reset-button').click();
  await page.waitForFunction(() => document.querySelector('#reset-button').textContent.includes('60s'));
  assert.match(await page.locator('#reset-message').textContent(), /Se houver uma conta/);
  assert.equal(await page.evaluate(() => window.__calls), 1);
  await page.locator('#email').fill('inexistente@example.test');
  await page.locator('#email').press('Enter');
  await page.locator('#reset-form').evaluate(form => form.requestSubmit());
  assert.equal(await page.evaluate(() => window.__calls), 1);
  await page.clock.fastForward(15000);
  await page.reload();
  assert.match(await page.locator('#reset-button').textContent(), /45s/);
  const other = await context.newPage();
  await other.clock.install({time: new Date('2026-10-27T12:00:15Z')});
  await other.goto(url);
  assert.equal(await other.locator('#reset-button').isDisabled(), true);
  await other.locator('#email').fill('inexistente@example.test');
  await other.locator('#reset-form').evaluate(form => form.requestSubmit());
  assert.equal(await other.evaluate(() => window.__calls || 0), 0);
  await other.clock.fastForward(45000);
  await page.clock.fastForward(45000);
  assert.equal(await other.locator('#reset-button').isEnabled(), true);
  assert.match(await other.locator('#reset-cooldown').textContent(), /já pode solicitar/);
  await other.locator('#reset-button').click();
  await other.waitForFunction(() => document.querySelector('#reset-button').textContent.includes('60s'));
  await page.waitForFunction(() => document.querySelector('#reset-button').disabled);
  assert.equal(await other.evaluate(() => window.__calls), 1);
  assert.match(await other.locator('#reset-message').textContent(), /Se houver uma conta/);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), await other.evaluate(key => localStorage.getItem(key), key));
  console.log('PASS sucesso neutro, Enter, troca de e-mail, recarga, duas abas, timestamp e liberação');
  await other.clock.fastForward(60000);
  await other.evaluate(() => { window.__mode = 'network'; });
  await other.locator('#reset-button').click();
  await other.waitForFunction(() => document.querySelector('#reset-message').dataset.type === 'error');
  assert.match(await other.locator('#reset-message').textContent(), /conectar ao servidor/);
  assert.equal(await other.locator('#reset-button').isEnabled(), true);
  await other.evaluate(() => { window.__mode = 'rate'; });
  await other.locator('#reset-button').click();
  await other.waitForFunction(() => document.querySelector('#reset-button').textContent.includes('60s'));
  assert.match(await other.locator('#reset-message').textContent(), /Muitas solicitações/);
  await other.locator('#reset-form').evaluate(form => form.requestSubmit());
  assert.equal(await other.evaluate(() => window.__calls), 3);
  assert.match(await other.locator('#reset-cooldown').textContent(), /espera maior/);
  console.log('PASS erro de rede sem sucesso falso e HTTP 429 com bloqueio sem segunda requisição');
  assert.deepEqual(unexpected, []);
 } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
