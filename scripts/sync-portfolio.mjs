import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createResumePayload } from './resume-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const assets = [
  'assets/css/modern.css',
  'assets/img/favicon.svg',
  'assets/img/profile.webp',
  'assets/img/profile-retro.webp',
  'assets/pdf/curriculo.pdf',
  'assets/pdf/curriculo-en.pdf',
  'robots.txt',
  'sitemap.xml',
  'googled9a84729087bb788.html',
];

const _C1 = [226, 187, 207, 192, 222, 41, 45, 30, 254, 24, 250, 255, 7, 71, 32, 38, 49, 36, 99];
const _C2 = [72, 118, 61, 77, 90, 147, 157, 121, 161, 118, 125, 147, 140, 135, 143, 220, 172, 223, 190];

export function resolveBackendUrl() {
  if (process.env.LATEX_RESUME_BACKEND_URL) return process.env.LATEX_RESUME_BACKEND_URL;
  const cipher = _C1.concat(_C2);
  const key = [0x53, 0x79, 0x6e, 0x74, 0x68, 0x65, 0x73, 0x69, 0x73];
  const salt = 0xa7;
  let res = '';
  for (let i = 0; i < cipher.length; i++) {
    const k = key[i % key.length];
    let diff = (cipher[i] - (i * 7) - salt) % 256;
    if (diff < 0) diff += 256;
    res += String.fromCharCode(diff ^ k);
  }
  return res;
}

export async function deriveTransportKey(ts, direction = 'req') {
  const enc = new TextEncoder();
  const base = `LATEX_RESUME_PAYLOAD_ENCRYPT_2026_${direction}_${ts}`;
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(base));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptTransportPayload(payload, direction = 'req') {
  const ts = Date.now();
  const key = await deriveTransportKey(ts, direction);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload)));
  return {
    enc_version: 'ENC_PAYLOAD_V1',
    ts,
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(cipher).toString('base64'),
  };
}

export async function decryptTransportPayload(envelope, direction = 'resp') {
  if (!envelope || envelope.enc_version !== 'ENC_PAYLOAD_V1') return envelope;
  const key = await deriveTransportKey(envelope.ts, direction);
  const iv = Buffer.from(envelope.iv, 'base64');
  const cipher = Buffer.from(envelope.ciphertext, 'base64');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}

export function shouldSyncResume() {
  if (process.env.SYNC_RESUME === 'true') return true;
  if (process.env.GITHUB_EVENT_NAME === 'schedule') return true;
  return false;
}

export async function warmupBackend(backendUrl, {
  fetcher = fetch,
  maxWaitMs = 90_000,
  pingIntervalMs = 5_000,
  pingTimeoutMs = 15_000,
  wait = delay,
} = {}) {
  const base = backendUrl.replace(/\/+$/, '');
  const start = Date.now();
  console.log('[sync-portfolio] Aquecendo servidor backend LaTeX (aguardando cold start do Render)...');
  let attempt = 0;

  while (Date.now() - start <= maxWaitMs) {
    attempt++;
    try {
      const res = await fetcher(`${base}/healthz`, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: AbortSignal.timeout(pingTimeoutMs),
      });
      if (res && res.ok) {
        console.log(`[sync-portfolio] Servidor backend LaTeX ativo e pronto (${attempt} tentativa(s)).`);
        return true;
      }
    } catch {
      // Ignora erro de rede/timeout durante o spin-up
    }

    if (Date.now() - start + pingIntervalMs > maxWaitMs) break;
    await wait(pingIntervalMs);
  }

  console.warn('[sync-portfolio] Servidor backend LaTeX não respondeu dentro do tempo limite. Mantendo fallbacks locais.');
  return false;
}

export async function syncResumePdfs({
  fetcher = fetch,
  timeoutMs = 60_000,
  targetDir = join(root, 'assets', 'pdf'),
  maxAttempts = 3,
  maxWarmupMs = 90_000,
  pingIntervalMs = 5_000,
  pingTimeoutMs = 15_000,
  wait = delay,
  skipWarmup = false,
} = {}) {
  const backendUrl = resolveBackendUrl().replace(/\/+$/, '');

  if (!skipWarmup) {
    const isReady = await warmupBackend(backendUrl, {
      fetcher,
      maxWaitMs: maxWarmupMs,
      pingIntervalMs,
      pingTimeoutMs,
      wait,
    });
    if (!isReady) {
      console.warn('[sync-portfolio] Backend indisponível durante o warm-up. Mantendo fallbacks pré-compilados.');
      return;
    }
  }

  const targets = [
    { lang: 'pt-br', filename: 'curriculo.pdf' },
    { lang: 'en-us', filename: 'curriculo-en.pdf' },
  ];

  for (const { lang, filename } of targets) {
    let success = false;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const payload = createResumePayload(lang);
        const encrypted = await encryptTransportPayload(payload, 'req');
        const response = await fetcher(`${backendUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Origin: 'https://jluckmay.github.io',
            Referer: 'https://jluckmay.github.io/',
            'X-Resume-Client': 'jluckmay-github-pages-v1',
            'X-Encrypted-Payload': '1',
          },
          body: JSON.stringify(encrypted),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const raw = await response.json();
        const data = raw?.enc_version === 'ENC_PAYLOAD_V1'
          ? await decryptTransportPayload(raw, 'resp')
          : raw;

        if (data && data.pdf_base64) {
          await mkdir(targetDir, { recursive: true });
          await writeFile(join(targetDir, filename), Buffer.from(data.pdf_base64, 'base64'));
          console.log(`[sync-portfolio] Atualizado currículo ${filename} via backend LaTeX.`);
          success = true;
          break;
        } else {
          throw new Error(data?.error || 'No PDF data returned');
        }
      } catch (err) {
        lastError = err;
        const isTransient = /HTTP (?:429|500|502|503|504)|timeout|aborted|network/i.test(err.message);
        if (isTransient && attempt < maxAttempts) {
          const retryWait = attempt * 2000;
          console.log(`[sync-portfolio] Tentativa ${attempt} para ${filename} falhou (${err.message}). Nova tentativa em ${retryWait / 1000}s...`);
          await wait(retryWait);
          continue;
        }
        break;
      }
    }

    if (!success) {
      console.warn(`[sync-portfolio] Backend indisponível para ${filename} (${lastError?.message || 'erro desconhecido'}). Mantendo fallback pré-compilado.`);
    }
  }
}

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

export const DEFAULT_PROJECT_OVERRIDES = {
  'minecraft-map-convertion': {
    name: 'Minecraft Map Converter',
    description: 'Pipeline automatizado em Python para conversão de mapas, entidades e comandos entre Minecraft Java e Bedrock.',
  },
};

export function formatProjectName(name) {
  if (typeof name !== 'string' || !name.trim()) return '';
  const knownAcronyms = new Set([
    'UFMG', 'PPGCC', 'DCC', 'UFV', 'IA', 'AI', 'ML', 'API', 'PDI', 'HTML', 'CSS', 'JS', 'UI', 'UX', 'SQL',
  ]);
  return name
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(word => {
      const upper = word.toUpperCase();
      if (knownAcronyms.has(upper)) return upper;
      if (/[a-z][A-Z]/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
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
  if (config.projectOverrides !== undefined) {
    if (typeof config.projectOverrides !== 'object' || config.projectOverrides === null || Array.isArray(config.projectOverrides)) {
      throw new Error('projectOverrides must be an object');
    }
    for (const [key, value] of Object.entries(config.projectOverrides)) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`Override for ${key} must be an object`);
      }
      if (value.name !== undefined && (typeof value.name !== 'string' || !value.name.trim())) {
        throw new Error(`Invalid name override for ${key}`);
      }
      if (value.description !== undefined && (typeof value.description !== 'string' || !value.description.trim())) {
        throw new Error(`Invalid description override for ${key}`);
      }
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
  const overrides = { ...DEFAULT_PROJECT_OVERRIDES, ...(config.projectOverrides || {}) };
  return repositories.flatMap(repo => {
    const rawName = requiredString(repo?.name, 'repository name');
    const owner = requiredString(repo?.owner?.login, 'repository owner');
    if (owner.toLowerCase() !== config.githubUsername.toLowerCase() || repo.private || repo.disabled ||
      (!config.includeForks && repo.fork) || excluded.has(rawName.toLowerCase())) return [];
    const url = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(rawName)}`;
    const override = overrides[rawName] || overrides[rawName.toLowerCase()] || {};
    const name = override.name ? requiredString(override.name, 'project override name') : formatProjectName(rawName);
    const repoDesc = typeof repo.description === 'string' ? repo.description.trim() : '';
    const description = override.description
      ? requiredString(override.description, 'project override description')
      : (repoDesc || (repo.language ? `Projeto em ${repo.language} disponível no GitHub.` : 'Projeto disponível no GitHub.'));
    const homepage = safeUrl(override.homepage || repo.homepage);
    const language = typeof repo.language === 'string' ? repo.language : '';
    const tag = typeof override.tag === 'string' ? override.tag : '';
    return [{ name, rawName, url, description, homepage, language, tag }];
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
  const projectHtml = newProjects.map(repo => {
    const linkItems = [];
    if (repo.homepage) {
      linkItems.push(`<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener noreferrer">Abrir projeto +</a>`);
    }
    linkItems.push(`<a href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer">${repo.homepage ? 'GitHub +' : 'Ver no GitHub +'}</a>`);
    const linksHtml = linkItems.join('\n                ');
    return `            <article class="card extra-item" hidden data-sync-source="github">
              <span class="num">${escapeHtml(repo.tag || ('GitHub' + (repo.language ? ' / ' + repo.language : '')))}</span>
              <h3>${escapeHtml(repo.name)}</h3>
              ${repo.description ? `<p>${escapeHtml(repo.description)}</p>` : ''}
              <div class="project-links">
                ${linksHtml}
              </div>
            </article>`;
  }).join('\n');
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
  // Na data de atualização automática da página (schedule ou SYNC_RESUME=true),
  // atualiza os PDFs via backend remoto mantendo os de fallback se offline.
  if (shouldSyncResume()) {
    await syncResumePdfs({ fetcher });
  }
  // Only a complete, validated response from both APIs can produce a deployment.
  await mkdir(outputDir, { recursive: true });
  await Promise.all(assets.map(async file => {
    const dest = join(outputDir, file);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(join(root, file), dest);
  }));
  await writeFile(join(outputDir, '.nojekyll'), '');
  await writeFile(join(outputDir, 'index.html'), result.html);
  console.log(`Built site: ${result.addedProjects} additional GitHub projects, ${result.addedWorks} additional ORCID works.`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildSite().catch(error => { console.error(error.message); process.exitCode = 1; });
}
