# 07 — Design System

## 1. Status

Base visual inicial implementada na branch `design-global`.
A paleta e os valores abaixo são uma proposta para aprovação do grupo; ainda não representam uma identidade final aprovada.

Este arquivo estabelece padrões funcionais e estruturais para impedir que cada integrante desenvolva interfaces incompatíveis.

## 2. Princípios

1. Mobile first.
2. Legibilidade acima de decoração.
3. Consistência entre páginas.
4. Controles com áreas de toque adequadas.
5. Contraste suficiente.
6. Estados claros de interação.
7. Componentes reutilizáveis.
8. Leitor com baixa distração visual.

## 3. Breakpoints

Valores iniciais:

```css
/* Base: mobile */

/* Tablet */
@media (min-width: 768px) {}

/* Desktop */
@media (min-width: 1024px) {}
```

Breakpoints podem ser ajustados quando o layout real exigir.

## 4. Tokens CSS

Tokens implementados em `css/global.css`:

```css
:root {
  --color-bg: #e9d8b5;          /* fundo pergaminho */
  --color-surface: #fbf1da;     /* cards e painéis */
  --color-text: #34251d;        /* texto principal */
  --color-text-muted: #705849;  /* metadados */
  --color-primary: #743d35;     /* ações principais */
  --color-on-primary: #fff4df;  /* texto sobre ações */
  --color-danger: #963e32;      /* erro e ação destrutiva */
  --color-border: #d2b98d;

  --font-body: 'DM Sans', Arial, sans-serif;
  --font-reading: 'Cormorant Garamond', Georgia, serif;

  --space-1: .5rem;  --space-2: 1rem;  --space-3: 1.5rem;
  --space-4: 2rem;   --space-5: 3rem;
  --radius-sm: .4rem; --radius-md: .8rem; --radius-lg: 1.2rem;
}
```

Valores complementares para hover, inputs, feedback, header, largura de página e leitura estão no mesmo arquivo. A escala usa 8/16/24/32/48 px em uma base de 16 px. Os valores visuais devem ser aprovados pelo grupo antes de serem tratados como identidade definitiva.

## 5. Tipografia

Devem existir papéis claros para:

- título de página;
- título de seção;
- título de livro;
- metadado;
- corpo de interface;
- corpo de leitura;
- legenda;
- mensagem de estado.

O texto dos capítulos pode utilizar configuração distinta da interface, desde que priorize legibilidade.

Use `.page-title` para título de página, `.section-title` para seção,
`.book-title` para livro, `.text-meta`/`.text-caption` para informação
secundária e `.reading-copy` para leitura (máximo de 42 rem, entrelinha 1,7).
O corpo da interface usa DM Sans, 16 px e entrelinha 1,5. Essas classes são
opcionais onde a página já possui uma composição própria equivalente.

## 6. Grid de livros

### Mobile

Preferência inicial:

```text
2 cards por linha quando houver largura suficiente.
```

Em telas muito estreitas, o layout deve permanecer legível sem overflow.

### Tablet/Desktop

Aumentar colunas conforme largura disponível, preservando tamanho mínimo dos cards.

## 7. Componentes obrigatórios

### Botões

- primário;
- secundário;
- textual;
- destrutivo;
- desabilitado;
- carregando.

Em `css/components.css`, use `.button` para primário,
`.button--secondary`, `.button--text` e `.button--danger` para as demais
ações. Use `disabled` em `<button>` durante indisponibilidade e
`aria-busy="true"` enquanto a ação carrega, junto com texto de estado
perceptível. Links visualmente semelhantes não devem executar ações
destrutivas. Altura mínima: 44 px; foco visível vem de `css/global.css`.

### Inputs

- label identificável;
- erro próximo ao campo;
- foco visível;
- placeholder não substitui label.

Use `.field` com `<label for>` e controle com `id` correspondente. Para erro,
marque o controle com `aria-invalid="true"`, associe a mensagem `.field__error`
por `aria-describedby` e mantenha a mensagem próxima ao campo. Inputs de texto,
selects e textareas têm altura mínima de 48 px. Formulários existentes com
`.form-field`/`.editor` podem manter sua composição, seguindo estes estados.

### Card de livro

Deve suportar:

- capa;
- título;
- autor;
- gênero ou metadado resumido.

### Navegação

Deve possuir solução específica para mobile e não depender de hover.

O menu de `site-layout.js` usa botão com `aria-expanded`, abre em mobile,
fecha com Escape e mostra `aria-current="page"` no destino atual. A partir
de 768 px, os links ficam em linha e o botão de menu some. Cada alvo
interativo tem altura mínima de 44 px.

### Feedback

Padrões para:

- sucesso;
- erro;
- aviso;
- carregamento;
- conteúdo vazio.

Use `.feedback` com `.feedback--success`, `.feedback--error` ou
`.feedback--warning` e texto explícito. Para carregamento e vazio, use a
mesma base com texto que explique o estado. O componente `.card` fornece
superfície, borda, espaçamento e raio para conteúdo genérico; cards de livro
continuam usando `createBookCard`.

### Layout responsivo

Comece com uma coluna e `.page-container` (margem lateral de 16 px).
Em 768 px a margem passa a 32 px e a navegação torna-se horizontal. Em
1024 px distribua colunas conforme o conteúdo, sem ultrapassar a largura
máxima de 74 rem. Em listas de livros, preserve duas colunas apenas quando
cada card permanecer legível; em larguras estreitas, use uma coluna.

## 8. Leitor

Priorizar:

- largura de linha confortável;
- bom espaçamento;
- contraste;
- tamanho legível;
- anterior/próximo;
- baixa distração.

Recursos futuros:

- tamanho de fonte;
- tema claro/escuro/sépia;
- família tipográfica;
- largura da coluna.

## 9. Acessibilidade mínima

- HTML semântico;
- labels associados a inputs;
- `alt` em imagens informativas;
- informação não transmitida somente por cor;
- foco visível;
- contraste adequado;
- elementos interativos corretos;
- áreas de toque adequadas;
- hierarquia de headings.

## 10. Imagens

Capas devem:

- manter proporção consistente;
- usar `object-fit` apropriado;
- possuir fallback visual;
- evitar arquivos desnecessariamente grandes.

Regras técnicas de upload: `11-Seguranca.md`.

## 11. Responsividade

```text
1. implementar mobile
2. validar mobile
3. expandir para tablet
4. expandir para desktop
```

## 12. Critério para novos componentes

Antes de criar componente novo:

1. verificar se já existe equivalente;
2. reutilizar tokens;
3. manter estados de foco/erro/desabilitado;
4. documentar quando o padrão for reutilizável.

## 13. Implementação compartilhada

A base visual está em `css/global.css` (tokens, tipografia, reset e foco) e
`css/components.css` (header, navegação, footer e botões). As páginas importam
ambos antes do CSS específico. O visual mantém a linguagem de papel, tinta e
vinho presente nas páginas de autenticação e no leitor. Os valores ainda estão
sujeitos à aprovação do grupo como identidade final.

Para usar a estrutura global em outra página, inclua o módulo
`js/components/site-layout.js` e os elementos sem conteúdo
`<header class="site-header" data-site-header></header>` e
`<footer class="site-footer" data-site-footer></footer>`. Adicione um link de
pular para `main` e um `id` correspondente. O módulo gera a navegação, marca
`aria-current="page"` pela URL e controla o menu mobile com `aria-expanded`.
A lista de links inclui apenas rotas presentes nesta branch; atualize-a quando
as outras páginas forem integradas.

Páginas de autenticação em outras branches podem reaproveitar tokens e estilos
sem receber o header completo quando a composição própria exigir foco no
formulário. O leitor mantém sua coluna e sua tipografia específicas.

## 13. Implementação 0.33.2

A base em `css/global.css` define tokens, tipografia, foco e largura comum.
`css/components.css` contém header, menu mobile, footer e botões.
`js/components/site-layout.js` monta o shell de início e leitura;
formulários de autenticação compartilham os tokens e mantêm um layout
próprio. O estado ativo usa `aria-current="page"`; o menu informa
`aria-expanded`, fecha com Escape e usa controles de 44 px.

A paleta em pergaminho e vinho segue a identidade já presente nas páginas.
Os valores continuam sujeitos à aprovação visual do grupo.
