# Portfólio acadêmico | Academic portfolio

**João Lucas Mayrinck D'Oliveira**

[Português](#português) · [English](#english)

---

## Português

Portfólio pessoal e acadêmico desenvolvido como página estática. Reúne trajetória acadêmica, interesses de pesquisa, projetos, competências técnicas e interpessoais, idiomas, publicações e canais de contato.

### Recursos

- mapa de ciberameaças da Kaspersky como plano de fundo, com política de
  referência restritiva e animação de rede local como fallback;
- apresentação animada com frases rotativas;
- temas claro e escuro com detecção da preferência do sistema e adaptação do
  plano de fundo e das cores para melhor contraste;
- idiomas português e inglês com detecção automática;
- seção de skills e soft skills com idiomas e níveis visuais de proficiência;
- seções expansíveis para experiências, interesses, projetos e publicações;
- navegação responsiva e contextual;
- versão retrô leve em `/#retro`, com seleção automática para conexões lentas
  detectadas e opção de voltar à versão completa;
- suporte a leitores de tela, navegação por teclado e movimento reduzido;
- cards de projetos e publicações integralmente clicáveis, preservando seus
  botões e links específicos;
- SEO técnico com URL canônica, metadados sociais, dados estruturados,
  sitemap, diretivas de rastreamento e favicon rastreável;
- links para GitHub Pages, repositórios, DOI, ORCID, Lattes e página acadêmica.

### Tecnologias

- HTML5
- CSS3
- JavaScript
- Font Awesome
- Google Fonts
- Kaspersky Cybermap Widget

A página editorial pode ser aberta sem compilação ou gerenciador de pacotes.
A sincronização automática usa um script de geração com Node.js 24, sem dependências npm.

### Execução local

Abra `index.html` diretamente no navegador ou inicie um servidor HTTP local:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

### Versão leve / retrô

Acesse `/#retro` ou use **#** (descrição: “página otimizada”) nos controles da página. O modo retrô
mantém o conteúdo, os links, as coleções expansíveis, os idiomas e os temas,
usando fontes do sistema e navegação textual. A foto usa uma miniatura WebP local
de aproximadamente 13 KB, carregada ao se aproximar da área visível. Não baixa a foto original, o mapa, as fontes
externas, os ícones ou `modern.css`, nem executa as animações e os efeitos de rolagem.
O HTML e o favicon continuam sendo transferidos; não se trata de um modo offline.

Na abertura, o navegador seleciona esse modo quando informa economia de dados,
rede efetiva `slow-2g`, `2g` ou `3g`, velocidade inferior a 1,5 Mbps, latência de
pelo menos 500 ms ou estado offline. São estimativas do navegador, não uma medição
de estabilidade. Sem essas informações, a versão completa permanece como padrão;
o acesso manual por `/#retro` funciona independentemente dessa detecção.

**Versão completa** (`/#completo`) permite ignorar a detecção automática.
A escolha explícita permanece durante a sessão da aba, inclusive ao navegar pelas
seções e recarregar. Não há troca automática no meio da leitura. Se o armazenamento
estiver bloqueado, o modo ainda pode ser escolhido pelo endereço, mas a preferência
não persiste entre recarregamentos de âncoras de seção. Sem JavaScript, o conteúdo
aparece no formato leve em português, com todas as coleções abertas.

Teste de navegador, com Node.js, Playwright e Microsoft Edge disponíveis:

```bash
node tests/retro.cjs
```

`PLAYWRIGHT_MODULE` pode indicar uma instalação existente do Playwright;
`BROWSER_CHANNEL` permite selecionar outro canal compatível, como `chrome`.

### Atualização automática: GitHub e ORCID

O workflow `.github/workflows/update-portfolio.yml` gera e publica uma página
atualizada mensalmente, no dia **1 às 09:17 UTC (06:17 em Brasília)**, a cada push em `main`
e por execução manual na aba Actions. O GitHub pode atrasar execuções agendadas
ou desativá-las após 60 dias sem atividade no repositório público.

- A seleção editorial de `index.html`, seus destaques e descrições são preservados.
- Novos repositórios e trabalhos públicos entram nas listas expansíveis, depois
  dos destaques. Repositórios são comparados por URL; publicações, por DOI e título.
- `sync.config.json` define os perfis e exclusões. Novos forks são ignorados por
  padrão; forks já selecionados manualmente permanecem. Repositórios arquivados
  são aceitos; este próprio site é excluído da importação automática.
- A coleta acontece durante a geração. Nenhuma consulta às APIs ocorre no navegador,
  e ambas as versões da página recebem o mesmo conteúdo atualizado.
- Títulos e descrições importados mantêm o idioma da fonte. Controles continuam
  bilíngues. Conteúdo externo é escapado antes de entrar no HTML.
- Falha em qualquer API interrompe a publicação, mantendo a última versão publicada.
  A cada geração bem-sucedida, os itens automáticos refletem os dados públicos atuais;
  os itens editados manualmente continuam sob controle de `index.html`.

Para ativar, publique os arquivos em `main` e selecione **Settings → Pages →
Build and deployment → Source → GitHub Actions** no repositório. Execute
**Actions → Update portfolio and deploy Pages → Run workflow** para conferir a
primeira publicação. O workflow não cria commits automáticos: publica `dist/`
diretamente no Pages, sem enviar testes, configuração ou scripts ao site.

GitHub usa o token de leitura fornecido automaticamente pelo Actions. ORCID usa
leitura pública anônima; se necessário, configure o secret opcional
`ORCID_READ_PUBLIC_TOKEN` com um token `/read-public`. Nunca coloque tokens no HTML
ou em `sync.config.json`.

Para gerar e inspecionar a versão sincronizada localmente, use Node.js 24:

```bash
node --test tests/sync-portfolio.test.mjs
node scripts/sync-portfolio.mjs
python -m http.server 8000 --directory dist
```

`dist/` é gerado e ignorado pelo Git. Editar `index.html` altera a seleção editorial;
as novidades das APIs aparecem em `dist/index.html`. Para executar os testes de
navegador sobre essa saída, defina `SITE_DIR` com o caminho absoluto de `dist/`.

Referências: [GitHub Pages com Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[agendamentos](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[API pública do ORCID](https://info.orcid.org/documentation/api-tutorials/api-tutorial-read-data-on-a-record/).

### Acesso Web

A página está disponível pelo link: `https://jluckmay.github.io/`

### Estrutura

```text
.
├── index.html                       # Conteúdo, modo leve e comportamento
├── modern.css                       # Estilos exclusivos da versão completa
├── tests/retro.cjs                  # Verificação dos modos em navegador
├── tests/sync-portfolio.test.mjs    # Testes da importação e geração
├── scripts/sync-portfolio.mjs       # Coleta das APIs e geração estática
├── sync.config.json                # Perfis e exclusões da sincronização
├── .github/workflows/update-portfolio.yml # Agendamento e publicação no Pages
├── favicon.svg                     # Ícone rastreável do site
├── profile.webp                    # Foto da versão completa e compartilhamento social
├── profile-retro.webp              # Miniatura otimizada para o modo leve
├── robots.txt                      # Regras para rastreadores
├── sitemap.xml                     # Mapa do site para mecanismos de busca
├── googled9a84729087bb788.html     # Verificação do Google Search Console
├── README.md                       # Documentação bilíngue do projeto
└── LICENSE                         # Licença MIT
```

### Personalização

Conteúdo, traduções, comportamento e links ficam em `index.html`, junto aos estilos
do modo retrô. O design completo e suas animações ficam em `modern.css`, com
configurações visuais nas variáveis CSS declaradas em `:root`.

A versão completa usa `profile.webp` (1089 × 1444 px, aproximadamente 153 KB),
gerado do PNG com qualidade 90 e transparência preservada. A compressão tem perdas;
o mesmo WebP também é usado como imagem de compartilhamento social.

### Serviços externos

A versão completa carrega fontes, ícones e mapa por serviços externos. Esses recursos dependem de conexão com a internet e podem estar sujeitos às políticas de privacidade dos respectivos provedores. A foto é local. Caso o mapa da Kaspersky não carregue, uma animação SVG local preserva o plano de fundo visual. O modo retrô dispensa esses recursos.

### Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).

---

## English

Personal and academic portfolio built as a static website. It presents academic experience, research interests, projects, technical and interpersonal skills, languages, publications and contact channels.

### Features

- Kaspersky cyberthreat map as a background, with a restrictive referrer
  policy and a local network animation as fallback;
- animated introduction with rotating phrases;
- light and dark themes with automatic system-preference detection and
  background and color adaptation for improved contrast;
- Portuguese and English languages with automatic detection;
- skills and soft skills section with languages and visual proficiency levels;
- expandable sections for experience, interests, projects and publications;
- responsive, contextual navigation;
- lightweight retro edition at `/#retro`, selected automatically for detected
  slow connections, with an option to return to the full version;
- screen-reader, keyboard-navigation and reduced-motion support;
- fully clickable project and publication cards that preserve their specific
  buttons and links;
- technical SEO with a canonical URL, social metadata, structured data,
  sitemap, crawler directives and a crawlable favicon;
- links to GitHub Pages, repositories, DOI records, ORCID, Lattes and the academic homepage.

### Technologies

- HTML5
- CSS3
- JavaScript
- Font Awesome
- Google Fonts
- Kaspersky Cybermap Widget

The editorial page can be opened without a build step or package manager.
Automatic synchronization uses a Node.js 24 generation script with no npm dependencies.

### Local development

Open `index.html` directly in a browser or start a local HTTP server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

### Lightweight / retro edition

Visit `/#retro` or select **#** (description: “optimized page”) in the page controls. Retro mode
keeps the content, links, expandable collections, languages and themes, using
system fonts and text navigation. The photo uses a local WebP thumbnail of about
13 KB, loaded as it approaches the viewport. It does not download the original photo, map, external
fonts, icons or `modern.css`, or run animations and scroll effects. The HTML and
favicon are still transferred; this is not an offline mode.

On startup, the browser selects this mode when it reports data saving, an effective
`slow-2g`, `2g` or `3g` connection, speed below 1.5 Mbps, latency of at least 500 ms,
or offline status. These are browser estimates, not a stability measurement.
Without this information, the full version remains the default; manual access
through `/#retro` works regardless of detection support.

**Full version** (`/#completo`) overrides automatic detection. Explicit choices
last for the tab session, including section navigation and reloads. The mode does
not change automatically while reading. When storage is blocked, the URL still
selects the mode, but preferences cannot survive reloads of section anchors.
Without JavaScript, content appears in lightweight Portuguese with all collections
expanded.

Browser checks require Node.js, Playwright and Microsoft Edge:

```bash
node tests/retro.cjs
```

`PLAYWRIGHT_MODULE` can point to an existing Playwright installation;
`BROWSER_CHANNEL` selects another supported channel, such as `chrome`.

### Automatic updates: GitHub and ORCID

The `.github/workflows/update-portfolio.yml` workflow builds and publishes a fresh
page monthly, on day **1 at 09:17 UTC (06:17 in Brasilia)**, on pushes to `main`, and on manual
runs from the Actions tab. GitHub can delay scheduled runs or disable them after
60 days without activity in a public repository.

- The editorial selection in `index.html`, its highlights and descriptions stay intact.
- Additional public repositories and works appear in the expandable lists after
  the highlights. Repositories are deduplicated by URL; works, by DOI and title.
- `sync.config.json` sets the profiles and exclusions. New forks are ignored by
  default; manually selected forks remain. Archived repositories are eligible;
  this portfolio repository is excluded from automatic imports.
- APIs are queried during generation, never in the visitor's browser. Both page
  editions receive the same updated content.
- Imported titles and descriptions retain their source language. Controls remain
  bilingual. External content is escaped before insertion into HTML.
- If either API fails, publication stops and the previous deployment remains live.
  Each successful build reflects the current public data for automatic entries;
  manual entries remain controlled by `index.html`.

To activate, push the files to `main` and select **Settings → Pages → Build and
deployment → Source → GitHub Actions** in the repository. Run **Actions → Update
portfolio and deploy Pages → Run workflow** to verify the first deployment.
The workflow does not create automatic commits: it deploys `dist/` directly to
Pages, excluding tests, configuration and scripts from the published website.

GitHub uses the read token automatically provided by Actions. ORCID uses anonymous
public reads; if needed, configure the optional `ORCID_READ_PUBLIC_TOKEN` secret
with a `/read-public` token. Never place tokens in HTML or `sync.config.json`.

Generate and inspect the synchronized version locally with Node.js 24:

```bash
node --test tests/sync-portfolio.test.mjs
node scripts/sync-portfolio.mjs
python -m http.server 8000 --directory dist
```

`dist/` is generated and ignored by Git. Edit `index.html` to change the editorial
selection; API additions appear in `dist/index.html`. To run browser checks against
that output, set `SITE_DIR` to the absolute path of `dist/`.

References: [GitHub Pages with Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[ORCID public API](https://info.orcid.org/documentation/api-tutorials/api-tutorial-read-data-on-a-record/).

### Web Access

This page can be accessed by the following link: `https://jluckmay.github.io/`

### Structure

```text
.
├── index.html                       # Content, lightweight styles and behavior
├── modern.css                       # Full-version styles
├── tests/retro.cjs                  # Browser checks for both modes
├── tests/sync-portfolio.test.mjs    # Import and generation checks
├── scripts/sync-portfolio.mjs       # API fetching and static generation
├── sync.config.json                # Profiles and sync exclusions
├── .github/workflows/update-portfolio.yml # Scheduled builds and Pages deployment
├── favicon.svg                     # Crawlable site icon
├── profile.webp                    # Profile and social sharing image
├── profile-retro.webp              # Optimized thumbnail for the lightweight edition
├── robots.txt                      # Crawler rules
├── sitemap.xml                     # Search engine sitemap
├── googled9a84729087bb788.html     # Google Search Console verification
├── README.md                       # Bilingual project documentation
└── LICENSE                         # MIT License
```

### Customization

Content, translations, behavior and links are contained in `index.html`, alongside
retro styles. The full design and its animations live in `modern.css`, with main
visual settings defined by CSS custom properties under `:root`.

The full version uses `profile.webp` (1089 × 1444 px, approximately 153 KB),
encoded from the PNG at quality 90 with transparency preserved. Compression is
lossy; the same WebP is also used as the social sharing image.

### External services

The full version loads fonts, icons and the map from external services. These resources require an internet connection and may be subject to their providers' privacy policies. The profile image is local. If the Kaspersky map fails to load, a local SVG animation preserves the visual background. Retro mode skips these resources.

### License

Distributed under the MIT License. See [LICENSE](LICENSE).
