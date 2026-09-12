import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const assets = [
  'modern.css', 'favicon.svg', 'profile.webp', 'profile-retro.webp',
  'robots.txt', 'sitemap.xml', 'googled9a84729087bb788.html',
];

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function decodeHtml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[entity.toLowerCase()];
  });
}

function plainText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function titleKey(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function doiKey(value) {
  let doi = String(value ?? '').trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, '');
  try { doi = decodeURIComponent(doi); } catch { /* Keep an unencoded DOI. */ }
  return /^10\.\d{4,9}\/\S+$/i.test(doi) ? doi.toLowerCase() : null;
}

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${label}`);
  return value.trim();
}

export function validateConfig(config) {
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(config.githubUsername ?? '')) throw new Error('Invalid GitHub username');
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(config.orcidId ?? '')) throw new Error('Invalid ORCID iD');
  if (typeof config.includeForks !== 'boolean') throw new Error('includeForks must be boolean');
  for (const field of ['excludedRepositories', 'excludedDois', 'excludedOrcidPutCodes']) {
    if (!Array.isArray(config[field]) || config[field].some(value => typeof value !== 'string')) {
      throw new Error(`${field} must be an array of strings`);
    }
  }
  return config;
}

export async function fetchJson(url, headers = {}, fetcher = fetch, wait = delay) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetcher(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'Jluckmay-portfolio-sync', ...headers },
        signal: AbortSignal.timeout(20_000), redirect: 'error',
      });
    } catch {
      if (attempt === 2) throw new Error(`Could not reach ${new URL(url).hostname}`);
      await wait(1000 * (attempt + 1));
      continue;
    }
    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retryAfter = Number(response.headers.get('retry-after')) || attempt + 1;
      if (retryAfter <= 10) { await wait(retryAfter * 1000); continue; }
    }
    throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}; nothing will be published`);
  }
}

export async function fetchRepositories(config, { token, fetcher = fetch, wait = delay } = {}) {
  const result = [];
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let page = 1; page <= 20; page++) {
    const url = `https://api.github.com/users/${config.githubUsername}/repos?type=owner&sort=full_name&per_page=100&page=${page}`;
    const data = await fetchJson(url, headers, fetcher, wait);
    if (!Array.isArray(data)) throw new Error('GitHub did not return a repository list');
    result.push(...data);
    if (data.length < 100) return result;
  }
  throw new Error('GitHub pagination exceeded 2000 repositories; refusing a partial build');
}

export function normalizeRepositories(repositories, config) {
  if (!Array.isArray(repositories)) throw new Error('Invalid repository list');
  const excluded = new Set(config.excludedRepositories.map(name => name.toLowerCase()));
  return repositories.flatMap(repo => {
    const name = requiredString(repo?.name, 'repository name');
    const owner = requiredString(repo?.owner?.login, 'repository owner');
    if (owner.toLowerCase() !== config.githubUsername.toLowerCase() || repo.private || repo.disabled ||
      (!config.includeForks && repo.fork) || excluded.has(name.toLowerCase())) return [];
    const url = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    return [{ name, url, description: typeof repo.description === 'string' ? repo.description : '',
      homepage: safeUrl(repo.homepage), language: typeof repo.language === 'string' ? repo.language : '' }];
  }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

export function normalizeWorks(record, config) {
  if (!Array.isArray(record?.group)) throw new Error('ORCID did not return a works list');
  const excludedDois = new Set(config.excludedDois.map(doiKey));
  const excludedCodes = new Set(config.excludedOrcidPutCodes);
  return record.group.flatMap(group => {
    if (!Array.isArray(group['work-summary']) || !group['work-summary'].length) throw new Error('Invalid ORCID work group');
    const summaries = group['work-summary'].filter(work => work.visibility === 'public')
      .sort((a, b) => Number(b['display-index'] || 0) - Number(a['display-index'] || 0));
    if (!summaries.length) return [];
    if (summaries.some(work => excludedCodes.has(String(work['put-code'])))) return [];
    const work = summaries[0];
    const title = requiredString(work.title?.title?.value, 'ORCID title');
    const code = String(work['put-code']);
    if (!/^\d+$/.test(code)) throw new Error('Invalid ORCID put-code');
    const identifiers = [group, ...summaries].flatMap(item => item['external-ids']?.['external-id'] || []);
    // A parent book's DOI must not hide its individual chapters.
    const doi = identifiers.filter(id => id['external-id-type'] === 'doi' && id['external-id-relationship'] === 'self')
      .map(id => doiKey(id['external-id-value'])).find(Boolean);
    if (doi && excludedDois.has(doi)) return [];
    const year = work['publication-date']?.year?.value;
    const journal = work['journal-title']?.value;
    const recordUrl = `https://orcid.org/${config.orcidId}`;
    const url = doi ? `https://doi.org/${doi}` : safeUrl(work.url?.value) || recordUrl;
    return [{ title, code, doi, url,
      year: /^\d{4}$/.test(year ?? '') ? String(year) : '',
      journal: typeof journal === 'string' ? journal : '',
      label: doi ? 'DOI ↗' : url === recordUrl ? 'ORCID ↗' : 'Registro ↗' }];
  }).sort((a, b) => b.year.localeCompare(a.year) || a.title.localeCompare(b.title, 'pt-BR'));
}

function section(html, id) {
  const match = html.match(new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</section>`));
  if (!match) throw new Error(`Missing section: ${id}`);
  return match[1];
}

function replaceRegion(html, name, content = '') {
  const start = `<!-- ${name}:start -->`, end = `<!-- ${name}:end -->`;
  if (html.split(start).length !== 2 || html.split(end).length !== 2) throw new Error(`Missing or duplicate markers: ${name}`);
  const from = html.indexOf(start) + start.length, to = html.indexOf(end);
  if (to < from) throw new Error(`Reversed markers: ${name}`);
  return html.slice(0, from) + '\n' + (content ? content + '\n' : '') + '            ' + html.slice(to);
}

function links(html) {
  return [...html.matchAll(/\bhref="([^"]+)"/g)].map(match => decodeHtml(match[1]));
}

function repositoryKey(value) {
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase() === 'github.com' ? decodeURIComponent(url.pathname).replace(/\/$/, '').toLowerCase() : null;
  } catch { return null; }
}

export function renderPortfolio(template, repositories, record, config) {
  validateConfig(config);
  // Regeneration starts from the manual content, so repeated runs are idempotent.
  let html = replaceRegion(replaceRegion(template, 'github-projects'), 'orcid-publications');
  const projects = section(html, 'projetos'), publications = section(html, 'publicacoes');
  const knownRepos = new Set(links(projects).map(repositoryKey).filter(Boolean));
  const knownDois = new Set(links(publications).map(doiKey).filter(Boolean));
  const knownTitles = new Set([...publications.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)]
    .map(match => titleKey(plainText(match[1]))));
  const newProjects = normalizeRepositories(repositories, config).filter(repo => {
    const key = repositoryKey(repo.url);
    if (knownRepos.has(key)) return false;
    knownRepos.add(key);
    return true;
  });
  const newWorks = normalizeWorks(record, config).filter(work => {
    const title = titleKey(work.title);
    if ((work.doi && knownDois.has(work.doi)) || knownTitles.has(title)) return false;
    if (work.doi) knownDois.add(work.doi);
    knownTitles.add(title);
    return true;
  });
  const projectHtml = newProjects.map(repo => `            <article class="card extra-item" hidden data-sync-source="github">
              <span class="num">GitHub${repo.language ? ' / ' + escapeHtml(repo.language) : ''}</span>
              <h3>${escapeHtml(repo.name)}</h3>
              ${repo.description ? `<p>${escapeHtml(repo.description)}</p>` : ''}
              <div class="project-links">
                ${repo.homepage ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener noreferrer">Abrir projeto +</a>` : ''}
                <a href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer">Ver no GitHub +</a>
              </div>
            </article>`).join('\n');
  const workHtml = newWorks.map(work => `            <article class="publication extra-item" hidden data-sync-source="orcid" data-orcid-id="${work.code}">
              <div>
                <h3>${escapeHtml(work.title)}</h3>
                <p>${escapeHtml([work.journal, work.year].filter(Boolean).join(' · ') || 'ORCID')}</p>
              </div>
              <a href="${escapeHtml(work.url)}" target="_blank" rel="noopener noreferrer">${work.label}</a>
            </article>`).join('\n');
  html = replaceRegion(replaceRegion(html, 'github-projects', projectHtml), 'orcid-publications', workHtml);
  return { html, addedProjects: newProjects.length, addedWorks: newWorks.length };
}

export async function buildSite({ outputDir = join(root, 'dist'), fetcher = fetch } = {}) {
  const [template, configText] = await Promise.all([
    readFile(join(root, 'index.html'), 'utf8'), readFile(join(root, 'sync.config.json'), 'utf8'),
  ]);
  const config = validateConfig(JSON.parse(configText));
  const orcidHeaders = process.env.ORCID_READ_PUBLIC_TOKEN ? { Authorization: `Bearer ${process.env.ORCID_READ_PUBLIC_TOKEN}` } : {};
  const [repositories, works] = await Promise.all([
    fetchRepositories(config, { token: process.env.GITHUB_TOKEN, fetcher }),
    fetchJson(`https://pub.orcid.org/v3.0/${config.orcidId}/works`, orcidHeaders, fetcher),
  ]);
  const result = renderPortfolio(template, repositories, works, config);
  // Only a complete, validated response from both APIs can produce a deployment.
  await mkdir(outputDir, { recursive: true });
  await Promise.all(assets.map(file => copyFile(join(root, file), join(outputDir, file))));
  await writeFile(join(outputDir, '.nojekyll'), '');
  await writeFile(join(outputDir, 'index.html'), result.html);
  console.log(`Built site: ${result.addedProjects} additional GitHub projects, ${result.addedWorks} additional ORCID works.`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildSite().catch(error => { console.error(error.message); process.exitCode = 1; });
}
