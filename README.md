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

O projeto não exige etapa de compilação nem gerenciador de pacotes.

### Execução local

Abra `index.html` diretamente no navegador ou inicie um servidor HTTP local:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

### Acesso Web

A página está disponível pelo link: `https://jluckmay.github.io/`

### Estrutura

```text
.
├── index.html                       # Página, estilos, conteúdo e comportamento
├── favicon.svg                     # Ícone rastreável do site
├── profile.png                     # Imagem de perfil e compartilhamento social
├── robots.txt                      # Regras para rastreadores
├── sitemap.xml                     # Mapa do site para mecanismos de busca
├── googled9a84729087bb788.html     # Verificação do Google Search Console
├── README.md                       # Documentação bilíngue do projeto
└── LICENSE                         # Licença MIT
```

### Personalização

Conteúdo, traduções, animações e links ficam em `index.html`. As principais configurações visuais estão nas variáveis CSS declaradas em `:root`.

### Serviços externos

A página carrega fontes, ícones, fotografia de perfil e mapa por serviços externos. Esses recursos dependem de conexão com a internet e podem estar sujeitos às políticas de privacidade dos respectivos provedores. Caso o mapa da Kaspersky não carregue, uma animação SVG local preserva o plano de fundo visual.

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

The project requires no build step or package manager.

### Local development

Open `index.html` directly in a browser or start a local HTTP server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

### Web Access

This page can be accessed by the following link: `https://jluckmay.github.io/`

### Structure

```text
.
├── index.html                       # Page content, styles and behavior
├── favicon.svg                     # Crawlable site icon
├── profile.png                     # Profile and social sharing image
├── robots.txt                      # Crawler rules
├── sitemap.xml                     # Search engine sitemap
├── googled9a84729087bb788.html     # Google Search Console verification
├── README.md                       # Bilingual project documentation
└── LICENSE                         # MIT License
```

### Customization

Content, translations, animations and links are contained in `index.html`. Main visual settings are defined by CSS custom properties under `:root`.

### External services

The page loads fonts, icons, the profile image and the map from external services. These resources require an internet connection and may be subject to their providers' privacy policies. If the Kaspersky map fails to load, a local SVG animation preserves the visual background.

### License

Distributed under the MIT License. See [LICENSE](LICENSE).
