// Run with Node and Playwright installed; PLAYWRIGHT_MODULE can point to an existing installation.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const server = createServer((request, response) => {
    const file = request.url.split('?')[0];
    if (!['/', '/index.html', '/modern.css', '/favicon.svg', '/profile.webp', '/profile-retro.webp'].includes(file)) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' :
      file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
    response.end(readFileSync(join(__dirname, '..', file === '/' ? 'index.html' : file.slice(1))));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const fast = { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false };
    async function visit({ hash = '', connection = fast, blockedStorage = false, offline = false, javaScriptEnabled = true, width = 1280 } = {}) {
      const context = await browser.newContext({ locale: 'pt-BR', javaScriptEnabled, viewport: { width, height: 900 } });
      await context.addInitScript(({ connection, blockedStorage, offline }) => {
        Object.defineProperty(navigator, 'connection', { get: () => connection });
        Object.defineProperty(navigator, 'onLine', { get: () => !offline });
        if (blockedStorage) for (const name of ['localStorage', 'sessionStorage']) {
          Object.defineProperty(window, name, { get() { throw new Error('Storage blocked'); } });
        }
      }, { connection, blockedStorage, offline });
      const requests = [], errors = [];
      await context.route('**/*', async route => {
        requests.push(route.request().url());
        if (route.request().url().startsWith(origin)) await route.continue();
        else await route.fulfill({ contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/html', body: '' });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/' + hash);
      return { context, page, requests, errors };
    }
    async function checkRetro(options) {
      const result = await visit(options);
      const { page, requests, errors } = result;
      assert.equal(await page.locator('html').getAttribute('data-mode'), 'retro');
      assert(await page.locator('.retro-notice').isVisible());
      const portrait = page.locator('.portrait img');
      assert(await portrait.isVisible());
      await portrait.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const image = document.querySelector('.portrait img');
        return image.complete && image.naturalWidth === 320;
      });
      assert(requests.some(url => url.endsWith('/profile-retro.webp')));
      assert(requests.every(url => [origin + '/', origin + '/favicon.svg', origin + '/profile-retro.webp'].includes(url.split('#')[0])), requests.join('\n'));
      assert.deepEqual(errors, []);
      return result;
    }
    for (const connection of [
      { ...fast, saveData: true }, { ...fast, effectiveType: 'slow-2g' },
      { ...fast, effectiveType: '2g' }, { ...fast, effectiveType: '3g' },
      { ...fast, downlink: 1 }, { ...fast, rtt: 600 }
    ]) {
      const result = await checkRetro({ connection });
      await result.context.close();
    }
    for (const options of [{ offline: true }, { hash: '#retro', connection: null, blockedStorage: true }, { javaScriptEnabled: false }]) {
      const result = await checkRetro(options);
      if (options.javaScriptEnabled === false) assert(await result.page.locator('.extra-item').first().isVisible());
      await result.context.close();
    }
    const retro = await checkRetro({ hash: '#retro', width: 375 });
    assert(await retro.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await retro.page.locator('.nav-link[href="#projetos"]').click();
    await retro.page.reload();
    assert.equal(await retro.page.locator('html').getAttribute('data-mode'), 'retro');
    await retro.page.locator('.expand-toggle[data-kind="projetos"]:not(.collapse-at-end)').click();
    assert(await retro.page.locator('#projects-extra .extra-item').first().isVisible());
    const theme = await retro.page.locator('html').getAttribute('data-theme');
    await retro.page.locator('#theme-toggle').click();
    assert.notEqual(await retro.page.locator('html').getAttribute('data-theme'), theme);
    await retro.page.locator('#language-toggle').click();
    assert.equal(await retro.page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await retro.page.locator('#mode-switch').innerText(), 'Full version');
    await retro.page.screenshot({ path: join(require('node:os').tmpdir(), 'portfolio-retro-mobile.png'), fullPage: false });
    await retro.page.locator('#mode-switch').click();
    await retro.page.waitForFunction(() => document.documentElement.dataset.mode === 'modern');
    await retro.page.waitForLoadState('load');
    assert(retro.requests.some(url => url.endsWith('/modern.css')));
    assert(retro.requests.some(url => url.endsWith('/profile.webp')));
    assert(!retro.requests.some(url => url.endsWith('/profile.png')));
    assert(retro.requests.some(url => url.includes('cybermap.kaspersky.com')));
    await retro.page.locator('#mode-switch').click();
    await retro.page.waitForFunction(() => document.documentElement.dataset.mode === 'retro');
    assert.deepEqual(retro.errors, []);
    await retro.context.close();
    for (const options of [{}, { connection: null }, { hash: '#completo', connection: { ...fast, saveData: true } }]) {
      const result = await visit(options);
      assert.equal(await result.page.locator('html').getAttribute('data-mode'), 'modern');
      assert(await result.page.locator('.portrait img').isVisible());
      assert.deepEqual(result.errors, []);
      await result.context.close();
    }
    console.log('PASS: automatic detection, optimized retro photo without full assets, mobile layout, anchors/reload, collections, themes, languages, mode switching, full-mode override, unavailable API/storage and no-JS fallback.');
  } finally {
    await browser?.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
