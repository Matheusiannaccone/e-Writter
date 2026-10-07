# 07 — Design System

## 1. Status

Documento base.  
A identidade visual final ainda deve ser definida pelo grupo.

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

Definir tokens no início da implementação:

```css
:root {
  --color-bg: ...;
  --color-surface: ...;
  --color-text: ...;
  --color-text-muted: ...;
  --color-primary: ...;
  --color-danger: ...;
  --color-border: ...;

  --font-body: ...;
  --font-reading: ...;

  --space-1: ...;
  --space-2: ...;
  --space-3: ...;
  --space-4: ...;
  --space-5: ...;

  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;
}
```

Os valores visuais devem ser aprovados pelo grupo antes de serem tratados como identidade definitiva.

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

### Inputs

- label identificável;
- erro próximo ao campo;
- foco visível;
- placeholder não substitui label.

### Card de livro

Deve suportar:

- capa;
- título;
- autor;
- gênero ou metadado resumido.

### Navegação

Deve possuir solução específica para mobile e não depender de hover.

### Feedback

Padrões para:

- sucesso;
- erro;
- aviso;
- carregamento;
- conteúdo vazio.

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
