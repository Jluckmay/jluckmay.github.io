# Portfólio acadêmico | Academic portfolio

**João Lucas Mayrinck D'Oliveira**

[Português](#português) · [English](#english)

---

## Português

Portfólio pessoal e acadêmico desenvolvido como página estática. Reúne trajetória acadêmica, interesses de pesquisa, projetos, publicações e canais de contato.

### Recursos

- mapa de ciberameaças da Kaspersky como plano de fundo interativo;
- apresentação animada com frases rotativas;
- temas claro e escuro com detecção da preferência do sistema;
- idiomas português e inglês com detecção automática;
- seções expansíveis para experiências, interesses, projetos e publicações;
- navegação responsiva e contextual;
- suporte a leitores de tela, navegação por teclado e movimento reduzido;
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

### Estrutura

```text
.
├── index.html   # Página, estilos, conteúdo e comportamento
├── README.md    # Documentação bilíngue do projeto
└── LICENSE      # Licença MIT
```

### Personalização

Conteúdo, traduções, animações e links ficam em `index.html`. As principais configurações visuais estão nas variáveis CSS declaradas em `:root`.

### Serviços externos

A página carrega fontes, ícones, fotografia de perfil e mapa por serviços externos. Esses recursos dependem de conexão com a internet e podem estar sujeitos às políticas de privacidade dos respectivos provedores.

### Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).

---

## English

Personal and academic portfolio built as a static website. It presents academic experience, research interests, projects, publications and contact channels.

### Features

- Kaspersky cyberthreat map as an interactive background;
- animated introduction with rotating phrases;
- light and dark themes with automatic system-preference detection;
- Portuguese and English languages with automatic detection;
- expandable sections for experience, interests, projects and publications;
- responsive, contextual navigation;
- screen-reader, keyboard-navigation and reduced-motion support;
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

### Structure

```text
.
├── index.html   # Page content, styles and behavior
├── README.md    # Bilingual project documentation
└── LICENSE      # MIT License
```

### Customization

Content, translations, animations and links are contained in `index.html`. Main visual settings are defined by CSS custom properties under `:root`.

### External services

The page loads fonts, icons, the profile image and the map from external services. These resources require an internet connection and may be subject to their providers' privacy policies.

### License

Distributed under the MIT License. See [LICENSE](LICENSE).
