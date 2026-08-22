# Portfólio acadêmico - João Lucas Mayrinck D'Oliveira

Portfólio pessoal e acadêmico desenvolvido como página estática. Reúne trajetória acadêmica, interesses de pesquisa, projetos, publicações e canais de contato.

## Recursos

- mapa de ciberameaças da Kaspersky como plano de fundo interativo;
- apresentação animada com frases rotativas;
- temas claro e escuro com detecção da preferência do sistema;
- idiomas português e inglês com detecção automática;
- seções expansíveis para experiências, interesses, projetos e publicações;
- navegação responsiva e contextual;
- suporte a leitores de tela, navegação por teclado e movimento reduzido;
- links para GitHub Pages, repositórios, DOI, ORCID, Lattes e página acadêmica.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Font Awesome
- Google Fonts
- Kaspersky Cybermap Widget

O projeto não exige etapa de compilação nem gerenciador de pacotes.

## Execução local

Abra `index.html` diretamente no navegador ou inicie um servidor HTTP local:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Estrutura

```text
.
├── index.html   # Página, estilos, conteúdo e comportamento
├── README.md    # Documentação do projeto
└── LICENSE      # Licença MIT
```

## Personalização

Conteúdo, traduções, animações e links ficam em `index.html`. As principais configurações visuais estão nas variáveis CSS declaradas em `:root`.

## Serviços externos

A página carrega fontes, ícones, fotografia de perfil e mapa por serviços externos. Esses recursos dependem de conexão com a internet e podem estar sujeitos às políticas de privacidade dos respectivos provedores.

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).

