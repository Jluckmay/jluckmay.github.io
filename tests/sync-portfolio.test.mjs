import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assets, buildSite, fetchJson, fetchRepositories, normalizeWorks, renderPortfolio,
} from '../scripts/sync-portfolio.mjs';

const config = {
  githubUsername: 'Jluckmay', orcidId: '0009-0001-0178-4877', includeForks: false,
  excludedRepositories: ['jluckmay.github.io'], excludedDois: [], excludedOrcidPutCodes: [],
};
const template = `<section id="projetos">
<article class="card"><h3>Manual project</h3><p>Custom description.</p>
<a href="https://github.com/JLUCKMAY/Existing/">Existing</a></article>
<div id="projects-extra"><!-- github-projects:start -->
            <!-- github-projects:end --></div></section>
<section id="publicacoes">
<article class="publication"><h3>Ciência &amp; Educação</h3><a href="https://doi.org/10.1234/EXISTING">DOI</a></article>
<div id="publications-extra"><!-- orcid-publications:start -->
            <!-- orcid-publications:end --></div></section>`;
const repo = (name, extra = {}) => ({ name, owner: { login: 'Jluckmay' }, private: false, fork: false, ...extra });
const work = (title, code, doi, extra = {}) => ({
  'put-code': code, title: { title: { value: title } }, visibility: 'public', 'display-index': '1',
  'publication-date': { year: { value: '2026' } },
  'external-ids': { 'external-id': doi ? [{ 'external-id-type': 'doi', 'external-id-value': doi, 'external-id-relationship': 'self' }] : [] },
  ...extra,
});
const record = (...works) => ({ group: works.map(item => ({ 'work-summary': [item] })) });
const response = data => new Response(JSON.stringify(data), { status: 200 });

test('keeps manual content and deduplicates repositories, DOI variants and normalized titles', () => {
  const result = renderPortfolio(template, [repo('existing'), repo('new'), repo('new')], record(
    work('Different title for the same DOI', 1, 'https://dx.doi.org/10.1234/existing'),
    work('Ciencia & Educacao', 2), work('A new paper', 3, '10.1234/new'),
    work('Duplicate paper metadata', 4, '10.1234/NEW'),
  ), config);
  assert.equal(result.addedProjects, 1);
  assert.equal(result.addedWorks, 1);
  assert(result.html.includes('<h3>Manual project</h3><p>Custom description.</p>'));
  assert(result.html.includes('<h3>Ciência &amp; Educação</h3>'));
  assert.equal(renderPortfolio(result.html, [repo('new')], record(work('A new paper', 3, '10.1234/new')), config).html, result.html);
});

test('filters new forks, private repositories, other owners and configured exclusions', () => {
  const repositories = [repo('fork', { fork: true }), repo('secret', { private: true }),
    repo('external', { owner: { login: 'someone-else' } }), repo('jluckmay.github.io'), repo('archived', { archived: true })];
  const result = renderPortfolio(template, repositories, record(), config);
  assert.equal(result.addedProjects, 1);
  assert(result.html.includes('<h3>archived</h3>'));
  assert.equal(renderPortfolio(template, [repo('fork', { fork: true })], record(), { ...config, includeForks: true }).addedProjects, 1);
});

test('escapes external text and URLs; rejects executable homepage protocols', () => {
  const result = renderPortfolio(template, [repo('safe', {
    description: '<img src=x onerror=alert(1)>', homepage: 'javascript:alert(1)', language: '<script>',
  })], record(work('"Quoted" <script>alert(1)</script>', 7, null, { url: { value: 'https://example.org/?a=1&b=2' } })), config);
  assert(result.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert(!result.html.includes('href="javascript:'));
  assert(!result.html.includes('<script>'));
  assert(result.html.includes('https://example.org/?a=1&amp;b=2'));
  assert(result.html.includes('class="publication extra-item" hidden'));
});

test('uses the preferred ORCID summary and does not confuse a parent DOI with a chapter DOI', () => {
  const data = { group: [{ 'work-summary': [
    work('Old title', 8, '10.1234/old', { 'display-index': '0' }),
    work('Preferred title', 9, null, {
      'display-index': '2', 'external-ids': { 'external-id': [{
        'external-id-type': 'doi', 'external-id-value': '10.1234/book', 'external-id-relationship': 'part-of',
      }] },
    }),
  ] }] };
  assert.equal(normalizeWorks(data, config)[0].title, 'Preferred title');
  const chapter = record(data.group[0]['work-summary'][1]);
  assert.equal(normalizeWorks(chapter, config)[0].doi, undefined);
  assert.equal(normalizeWorks(chapter, config)[0].url, 'https://orcid.org/' + config.orcidId);
  assert.equal(normalizeWorks(data, { ...config, excludedOrcidPutCodes: ['8'] }).length, 0);
  assert.equal(normalizeWorks(record(work('Hidden', 10, null, { visibility: 'limited' })), config).length, 0);
  assert.equal(normalizeWorks(record(work('Excluded', 11, '10.1234/no')), { ...config, excludedDois: ['10.1234/no'] }).length, 0);
});

test('fails closed on malformed API responses or missing insertion markers', () => {
  assert.throws(() => renderPortfolio(template, [], {}, config), /works list/);
  assert.throws(() => renderPortfolio(template, [{}], record(), config), /repository name/);
  assert.throws(() => renderPortfolio(template, [], { group: [{}] }, config), /work group/);
  assert.throws(() => renderPortfolio(template.replace('github-projects:start', 'missing'), [], record(), config), /markers/);
});

test('fetches every GitHub page and stops on an incomplete API response', async () => {
  const urls = [];
  const repositories = await fetchRepositories(config, { fetcher: async url => {
    urls.push(url);
    return response(urls.length === 1 ? Array.from({ length: 100 }, (_, index) => repo(`repo-${index}`)) : [repo('last')]);
  } });
  assert.equal(repositories.length, 101);
  assert(urls[1].endsWith('page=2'));
  await assert.rejects(fetchRepositories(config, { fetcher: async () => response({ message: 'bad data' }) }), /repository list/);
});

test('retries temporary API failures, but never turns an authorization failure into empty data', async () => {
  let calls = 0;
  const data = await fetchJson('https://example.org/data', {}, async () => {
    calls++;
    return calls < 3 ? new Response('', { status: 503 }) : response({ ok: true });
  }, async () => {});
  assert.equal(calls, 3);
  assert.equal(data.ok, true);
  await assert.rejects(fetchJson('https://example.org/data', {}, async () => new Response('', { status: 401 })), /HTTP 401/);
});

test('builds only deployable assets and leaves the source HTML untouched', async () => {
  const before = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const outputDir = await mkdtemp(join(tmpdir(), 'portfolio-sync-test-'));
  const result = await buildSite({ outputDir, fetcher: async url => response(
    url.includes('api.github.com') ? [repo('a-new-test-project')] : record(work('A new test publication', 42, '10.1234/test')),
  ) });
  assert.deepEqual((await readdir(outputDir)).sort(), [...assets, 'index.html', '.nojekyll'].sort());
  assert.equal(result.addedProjects, 1);
  assert.equal(result.addedWorks, 1);
  assert.equal(await readFile(new URL('../index.html', import.meta.url), 'utf8'), before);
  assert((await readFile(join(outputDir, 'index.html'), 'utf8')).includes('A new test publication'));
});

test('an API failure cannot replace the previous generated page', async () => {
  const outputDir = join(await mkdtemp(join(tmpdir(), 'portfolio-sync-failure-')), 'site');
  await assert.rejects(buildSite({ outputDir, fetcher: async url => url.includes('api.github.com')
    ? response([]) : new Response('', { status: 403 }) }), /HTTP 403/);
  await assert.rejects(stat(outputDir), { code: 'ENOENT' });
});
