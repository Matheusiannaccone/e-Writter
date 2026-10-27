# 07 — Design System

## Referência visual implementada

A interface usa tons de papel/pergaminho, tinta escura e vinho, com tipografia de leitura em destaque. Esta é a descrição do CSS atual, sem afirmar uma aprovação visual externa. A base está em [global.css](../css/global.css); componentes compartilhados, em [components.css](../css/components.css).

## Tokens

| Grupo | Tokens e valores atuais |
|---|---|
| Superfícies | `--color-bg: #e9d8b5`, `--color-surface: #fbf1da`, `--color-input-bg: #fffaf0` |
| Texto | `--color-text: #34251d`, `--color-text-muted: #705849` |
| Ação | `--color-primary: #743d35`, `--color-primary-hover: #5b2d28`, `--color-on-primary: #fff4df` |
| Estados | `--color-danger: #963e32`, `--color-danger-hover: #772e26`, `--color-success: #2e512b`, `--color-warning: #654414` |
| Borda e cabeçalho | `--color-border: #d2b98d`, `--color-header: #34251d`, `--color-header-text: #f7e9ca` |
| Interface | `--font-body: 'DM Sans', Arial, sans-serif` |
| Leitura | `--font-reading: 'Cormorant Garamond', Georgia, serif` |
| Espaçamento | `--space-1` a `--space-5`: `.5rem`, `1rem`, `1.5rem`, `2rem`, `3rem` |
| Raios | `--radius-sm: .4rem`, `--radius-md: .8rem`, `--radius-lg: 1.2rem` |
| Larguras | `--page-width: 74rem`, `--reading-width: 42rem` |

As fontes são importadas do Google Fonts com alternativas locais. Estilos de autenticação usam aliases como `--ink` e `--wine`. Há valores e fontes específicos por página: `user-pages.css`, por exemplo, define Georgia como base. Portanto, o conjunto atual não é uma uniformização total por tokens.

## Tipografia e leitura

Utilitários globais diferenciam título de página/seção, metadados e corpo de leitura. Tamanhos fluidos usam `clamp`. O leitor tem coluna máxima própria de `47rem`, superfície de papel e corpo entre `1.35rem` e `1.5rem`, com entrelinha `1.65`.

Capítulos são inseridos como texto. Linhas em branco separam parágrafos e `white-space: pre-wrap` preserva quebras simples. A sinopse usa `pre-line`. Não há controles de tema, fonte ou largura para o leitor; são candidatos de evolução.

## Componentes compartilhados

| Componente | Implementação e padrão |
|---|---|
| Cabeçalho/menu | [site-layout.js](../js/components/site-layout.js): marca, links, página atual e toggle móvel. |
| Conta | [auth-navigation.js](../js/components/auth-navigation.js): verificação, visitante, autenticado, processamento e falha. |
| Card | [book-card.js](../js/components/book-card.js): capa com proporção 2:3, fallback, título, autoria opcional e metadados. |
| Favorito | [favorite-button.js](../js/components/favorite-button.js): botão separado do link principal, `aria-pressed` e feedback textual. |
| Botões | `.button` e `.button--secondary`, além de variantes específicas de páginas. |
| Formulários | [feedback.js](../js/components/feedback.js): associação de erro, processamento e região de feedback. |

Home, Biblioteca e Meus Livros usam o card compartilhado. Na Biblioteca, o favorito embutido é desativado e há um botão próprio de remoção. Títulos/autoria/metadados são limitados visualmente a duas linhas sem alterar seus textos no DOM. Imagens usam `object-fit: cover`; falha de capa preserva o placeholder.

## Navegação e composição

O cabeçalho global é montado em oito páginas: início, Biblioteca, Meus Livros, Perfil, detalhes, leitor e ambos os editores. As quatro páginas de autenticação importam o módulo de layout, mas não oferecem o container de cabeçalho. Isso diverge do teste que exige cabeçalho em todas as páginas e permanece registrado em [10-Testes.md](10-Testes.md).

O menu móvel usa botão real, `aria-expanded`, `aria-controls`, fechamento por Escape e retorno do foco. O breakpoint de navegação é 768px. O link da página atual recebe `aria-current="page"`. O rodapé global só é montado onde existe seu ponto de montagem; outras páginas têm rodapé próprio.

## Feedback e formulários

Auth e Perfil compartilham mensagens com estado textual (`Erro`, `Sucesso`, `Atenção`, `Carregando`, `Sem conteúdo`), além de cor. Regiões estáveis usam `role="status"`, `aria-live="polite"` e `aria-atomic="true"`. Erros locais associam a descrição ao campo, preservando outras descrições, e a validação foca o primeiro campo inválido.

O processamento controla `disabled`, `aria-busy`, indicador e restauração do rótulo. Os editores possuem mensagens próprias e também usam estados/bloqueios; não utilizam integralmente o helper de formulários. A recuperação apresenta prazo absoluto de espera em região viva e contagem no botão, evitando anunciar cada segundo.

Login, Cadastro e Recuperação mantêm restrições HTML nativas como fallback. Perfil e Redefinição possuem campos inicialmente desabilitados e dependem do controlador para liberar o uso; os editores também têm bloqueios e validação próprios. Placeholder não substitui label.

## Responsividade

| Conjunto | Comportamento/breakpoints presentes |
|---|---|
| Base/menu | Largura comum e menu de desktop a partir de 768px |
| Cards | Duas colunas na base; uma abaixo de 360px; grade automática a partir de 480px |
| Autenticação | Ajustes em 900px, empilhamento em 700px e redução em 360px |
| Ateliê | Duas colunas a partir de 768px; ações expandidas em até 520px |
| Editor de capítulos | Lista lateral a partir de 900px; ações expandidas em até 520px |
| Detalhes | Reorganização em 760px e 460px |
| Leitor | Navegação empilhada em até 420px e espaçamento adicional a partir de 768px |
| Perfil/Meus Livros | Reorganização em até 650px |

O CSS combina regras de base, `min-width` e `max-width`, conforme a composição existente. Não há um único breakpoint universal de desktop.

## Acessibilidade e manutenção

Existem foco visível, labels, controles nativos, atalhos de conteúdo em várias páginas, regiões de estado e tratamento de `prefers-reduced-motion`; a base reforça foco com `prefers-contrast: more`. Muitos controles têm área mínima de 44px, sem que isso certifique todos os elementos.

Não se declara conformidade WCAG integral: faltam evidências abrangentes de leitor de tela, zoom, contraste e todos os navegadores. Os procedimentos/evidências estão em [10-Testes.md](10-Testes.md).

Para novos componentes, reutilizar tokens e primitivas existentes, preservar foco/labels/estados e validar em telas estreitas. Limites e proteção de imagens pertencem a [11-Seguranca.md](11-Seguranca.md).
