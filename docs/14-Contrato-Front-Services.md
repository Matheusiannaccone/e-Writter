# 14 — Contrato Front ↔ Services

## 1. Objetivo

Este documento define o contrato oficial entre o frontend e a camada de serviços do e-Writter.

O frontend deve acessar dados e executar operações exclusivamente por meio dos arquivos localizados em:

```text
js/services/
```

As páginas e componentes não devem acessar diretamente:

- Supabase;
- tabelas do banco;
- Supabase Auth;
- Supabase Storage;
- adapters Mock;
- adapters Supabase;
- migrations;
- políticas RLS.

A arquitetura utilizada é:

```text
PAGE / COMPONENT
        ↓
      SERVICE
        ↓
      ADAPTER
     ↙       ↘
   MOCK    SUPABASE
```

O frontend conhece apenas o **service**.

---

# 2. Services disponíveis

Atualmente o frontend possui os seguintes services:

```text
authService.js
profileService.js
genreService.js
bookService.js
chapterService.js
favoriteService.js
imageService.js
```

Cada service possui uma responsabilidade específica:

| Service | Responsabilidade |
|---|---|
| `authService` | autenticação e sessão |
| `profileService` | perfis de usuários |
| `genreService` | gêneros literários |
| `bookService` | livros |
| `chapterService` | capítulos |
| `favoriteService` | biblioteca/favoritos |
| `imageService` | avatar e capa de livros |

---

# 3. Como importar um service

O frontend deve importar somente as funções necessárias.

Exemplo:

```js
import {
  getBooks,
  getBookById
} from "../services/bookService.js";
```

Uso:

```js
const result = await getBooks();

if (result.error) {
  console.error(result.error);
  return;
}

console.log(result.data);
```

Não utilizar:

```js
import { supabase } from "../services/supabaseClient.js";
```

Também não utilizar diretamente:

```js
import { supabaseBookAdapter } from "...";
import { mockBookAdapter } from "...";
```

A escolha do adapter é responsabilidade da infraestrutura do projeto.

---

# 4. Formato padrão de resposta

Quase todas as operações assíncronas dos services seguem o mesmo envelope.

## 4.1 Sucesso

```js
{
  data: ...,
  error: null
}
```

Exemplo:

```js
{
  data: {
    id: "...",
    title: "Meu livro"
  },
  error: null
}
```

---

## 4.2 Lista vazia

Uma consulta que não possui resultados retorna:

```js
{
  data: [],
  error: null
}
```

Lista vazia **não é erro**.

---

## 4.3 Erro

```js
{
  data: null,
  error: {
    code: "ERROR_CODE",
    message: "Mensagem adequada à aplicação."
  }
}
```

Exemplo:

```js
{
  data: null,
  error: {
    code: "NOT_FOUND",
    message: "Livro não encontrado."
  }
}
```

O frontend deve tomar decisões principalmente a partir de:

```js
result.error.code
```

A mensagem pode ser exibida ao usuário quando pertinente.

---

# 5. Códigos de erro

Os services atualmente podem retornar:

| Código | Significado |
|---|---|
| `VALIDATION_ERROR` | dados enviados são inválidos |
| `UNAUTHENTICATED` | operação exige usuário autenticado |
| `FORBIDDEN` | usuário autenticado não possui permissão |
| `NOT_FOUND` | recurso não existe ou não está acessível |
| `CONFLICT` | conflito com um registro existente |
| `NETWORK_ERROR` | falha de comunicação com o servidor |
| `UNKNOWN` | erro inesperado |
| `UNKNOWN_ERROR` | erro inesperado em operações de autenticação |

### Tratamento recomendado

```js
switch (result.error?.code) {
  case "VALIDATION_ERROR":
    break;

  case "UNAUTHENTICATED":
    break;

  case "FORBIDDEN":
    break;

  case "NOT_FOUND":
    break;

  case "CONFLICT":
    break;

  case "NETWORK_ERROR":
    break;

  case "UNKNOWN":
  case "UNKNOWN_ERROR":
  default:
    break;
}
```

`UNKNOWN` e `UNKNOWN_ERROR` devem ser tratados pelo frontend como a mesma categoria de erro genérico.

---

# 6. `authService`

Arquivo:

```text
js/services/authService.js
```

Funções disponíveis:

```js
signUp({
  email,
  password,
  username,
  displayName
})

signIn({
  email,
  password
})

signOut()

getSession()

getCurrentUser()

onAuthStateChange(callback)
```

---

## 6.1 `signUp(data)`

Cria uma nova conta.

### Entrada

```js
{
  email: "usuario@email.com",
  password: "senha123",
  username: "usuario",
  displayName: "Nome do Usuário"
}
```

### Regras relevantes

`username`:

```text
3 a 30 caracteres
somente letras minúsculas
números permitidos
"." permitido
"_" permitido
sem espaços
```

Formato:

```regex
^[a-z0-9._]+$
```

`displayName`:

```text
1 a 60 caracteres
```

A senha deve possuir no mínimo:

```text
6 caracteres
```

### Exemplo

```js
import { signUp } from "../services/authService.js";

const result = await signUp({
  email,
  password,
  username,
  displayName
});

if (result.error) {
  showError(result.error.message);
  return;
}

// Cadastro concluído.
```

### Erros possíveis

```text
VALIDATION_ERROR
CONFLICT
NETWORK_ERROR
UNKNOWN_ERROR
```

### Importante

O frontend **não deve criar manualmente um registro em `profiles`** após o cadastro.

A criação do perfil é responsabilidade do backend/banco.

---

## 6.2 `signIn(data)`

Autentica o usuário.

### Entrada

```js
{
  email,
  password
}
```

### Exemplo

```js
const result = await signIn({
  email,
  password
});

if (result.error) {
  showError(result.error.message);
  return;
}

redirectToHome();
```

### Erros possíveis

```text
UNAUTHENTICATED
VALIDATION_ERROR
NETWORK_ERROR
UNKNOWN_ERROR
```

---

## 6.3 `signOut()`

Encerra a sessão atual.

```js
const result = await signOut();

if (result.error) {
  showError(result.error.message);
  return;
}

redirectToLogin();
```

---

## 6.4 `getSession()`

Obtém a sessão atual.

```js
const result = await getSession();
```

Quando existe sessão:

```js
result.data !== null
```

Quando não existe:

```js
result.data === null
```

### Importante

A estrutura interna da sessão pertence à camada de autenticação.

O frontend não deve depender de propriedades específicas do SDK do Supabase além do necessário para controlar o estado autenticado.

Para informações do perfil do usuário, utilizar:

```js
getMyProfile()
```

---

## 6.5 `getCurrentUser()`

Obtém o usuário autenticado da camada de autenticação.

```js
const result = await getCurrentUser();
```

O objeto retornado deve ser usado principalmente para identificação/autenticação.

Para nome público, username, bio e avatar, utilizar:

```js
profileService.getMyProfile()
```

### Erros possíveis

```text
UNAUTHENTICATED
NETWORK_ERROR
UNKNOWN_ERROR
```

---

## 6.6 `onAuthStateChange(callback)`

Escuta alterações na autenticação.

Exemplo:

```js
const listener = onAuthStateChange(
  (event, session) => {
    console.log(event, session);
  }
);
```

Eventos importantes:

```text
SIGNED_IN
SIGNED_OUT
```

Quando o componente não precisar mais do listener:

```js
listener.data.subscription.unsubscribe();
```

---

# 7. `profileService`

Arquivo:

```text
js/services/profileService.js
```

Funções:

```js
getProfile(userId)

getMyProfile()

getProfileByUsername(username)

updateMyProfile(data)
```

---

## 7.1 Modelo `Profile`

```js
{
  id: "uuid",
  username: "usuario",
  displayName: "Nome público",
  bio: null,
  avatarPath: null,
  createdAt: "2026-09-13T...",
  updatedAt: "2026-09-13T..."
}
```

Podem ser `null`:

```text
bio
avatarPath
```

---

## 7.2 `getProfile(userId)`

Busca um perfil pelo ID.

```js
const result = await getProfile(userId);
```

### Entrada

```text
userId: UUID
```

### Sucesso

```js
{
  data: Profile,
  error: null
}
```

### Erros possíveis

```text
VALIDATION_ERROR
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

## 7.3 `getMyProfile()`

Retorna o perfil do usuário autenticado.

```js
const result = await getMyProfile();
```

### Sucesso

```js
{
  data: Profile,
  error: null
}
```

### Erros possíveis

```text
UNAUTHENTICATED
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

## 7.4 `getProfileByUsername(username)`

Busca um perfil público pelo username.

```js
const result =
  await getProfileByUsername("matheus");
```

O service normaliza o valor com:

```text
trim
lowercase
```

### Erros possíveis

```text
VALIDATION_ERROR
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

## 7.5 `updateMyProfile(data)`

Atualiza o perfil do usuário autenticado.

### Campos permitidos

```js
{
  username?,
  displayName?,
  bio?
}
```

Exemplo:

```js
const result = await updateMyProfile({
  displayName: "Novo Nome",
  bio: "Minha nova bio."
});
```

### Regras

`username`:

```text
3 a 30 caracteres
lowercase
^[a-z0-9._]+$
```

`displayName`:

```text
1 a 60 caracteres
```

`bio`:

```text
máximo 500 caracteres
```

Bio vazia é convertida para:

```js
null
```

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
CONFLICT
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

### Importante

Avatar não é atualizado por esta função.

Para avatar utilizar:

```js
imageService.uploadAvatar()
imageService.removeAvatar()
```

---

# 8. `genreService`

Arquivo:

```text
js/services/genreService.js
```

Funções:

```js
getGenres()

getGenreById(id)

getGenreBySlug(slug)
```

Todas as operações de gênero são públicas.

---

## 8.1 Modelo `Genre`

```js
{
  id: 1,
  name: "Fantasia",
  slug: "fantasia"
}
```

---

## 8.2 `getGenres()`

Retorna todos os gêneros disponíveis.

```js
const result = await getGenres();
```

### Sucesso

```js
{
  data: [
    {
      id: 1,
      name: "Fantasia",
      slug: "fantasia"
    }
  ],
  error: null
}
```

A lista é retornada em ordem alfabética pelo nome.

Lista sem resultados:

```js
{
  data: [],
  error: null
}
```

### Erros possíveis

```text
NETWORK_ERROR
UNKNOWN
```

---

## 8.3 `getGenreById(id)`

```js
const result = await getGenreById(1);
```

O ID deve ser um inteiro positivo.

### Erros possíveis

```text
VALIDATION_ERROR
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

## 8.4 `getGenreBySlug(slug)`

```js
const result =
  await getGenreBySlug("fantasia");
```

O slug é normalizado utilizando:

```text
trim
lowercase
```

### Erros possíveis

```text
VALIDATION_ERROR
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

# 9. `bookService`

Arquivo:

```text
js/services/bookService.js
```

Funções:

```js
getBooks()

getBookById(id)

getMyBooks()

getBooksByAuthor(authorId)

createBook(data)

updateBook(id, data)

publishBook(id)

deleteBook(id)
```

---

## 9.1 Modelo `Book`

```js
{
  id: "uuid",
  authorId: "uuid",
  title: "Meu Livro",
  description: null,
  coverPath: null,
  status: "draft",
  publicationStatus: "ongoing",
  language: "pt-BR",
  publishedAt: null,
  createdAt: "2026-09-13T...",
  updatedAt: "2026-09-13T...",
  genres: [
    {
      id: 1,
      name: "Fantasia",
      slug: "fantasia"
    }
  ]
}
```

Podem ser `null`:

```text
description
coverPath
publishedAt
```

### `status`

Valores relevantes:

```text
draft
published
```

### `publicationStatus`

Valores aceitos:

```text
ongoing
completed
discontinued
```

---

## 9.2 `getBooks()`

Retorna o catálogo público de livros.

```js
const result = await getBooks();
```

Somente livros com:

```text
status = published
```

são retornados.

### Sucesso

```js
{
  data: [Book, Book],
  error: null
}
```

A lista é ordenada pelos livros publicados mais recentemente.

### Erros possíveis

```text
NETWORK_ERROR
UNKNOWN
```

---

## 9.3 `getBookById(id)`

Busca um livro visível pelo ID.

```js
const result =
  await getBookById(bookId);
```

Um visitante consegue acessar livros publicados.

Um draft é acessível somente quando as regras de acesso permitem, normalmente ao próprio autor autenticado.

### Erros possíveis

```text
VALIDATION_ERROR
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

## 9.4 `getMyBooks()`

Retorna todos os livros pertencentes ao usuário autenticado.

Inclui:

```text
draft
published
```

Exemplo:

```js
const result = await getMyBooks();
```

### Erros possíveis

```text
UNAUTHENTICATED
NETWORK_ERROR
UNKNOWN
```

---

## 9.5 `getBooksByAuthor(authorId)`

Retorna os livros publicados de determinado autor.

```js
const result =
  await getBooksByAuthor(authorId);
```

Não retorna drafts.

### Erros possíveis

```text
VALIDATION_ERROR
NETWORK_ERROR
UNKNOWN
```

---

## 9.6 `createBook(data)`

Cria um livro.

### Entrada

```js
{
  title: "Título do livro",
  description: "Descrição opcional",
  genreIds: [1, 2]
}
```

`description` é opcional.

### Obrigatórios

```text
title
genreIds
```

### Gêneros

O livro deve possuir:

```text
mínimo: 1
máximo: 3
```

Não são permitidos gêneros duplicados.

### O frontend NÃO envia

```text
id
authorId
coverPath
status
publicationStatus
publishedAt
createdAt
updatedAt
```

O novo livro nasce como:

```text
status = draft
publicationStatus = ongoing
language = pt-BR
```

### Exemplo

```js
const result = await createBook({
  title: "Minha História",
  description: "Sinopse...",
  genreIds: [1, 4]
});
```

### Sucesso

```js
{
  data: Book,
  error: null
}
```

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NETWORK_ERROR
UNKNOWN
```

---

## 9.7 `updateBook(id, data)`

Atualiza um livro pertencente ao usuário.

### Campos aceitos

```js
{
  title?,
  description?,
  coverPath?,
  publicationStatus?,
  language?,
  genreIds?
}
```

Exemplo:

```js
const result = await updateBook(
  bookId,
  {
    title: "Novo título",
    publicationStatus: "completed"
  }
);
```

### Observação sobre capa

Embora `coverPath` exista no contrato interno de atualização, o frontend não deve fazer upload manual nem construir paths.

Para alterar a imagem da capa utilizar:

```js
uploadBookCover(bookId, file)
removeBookCover(bookId)
```

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

## 9.8 `publishBook(id)`

Publica um livro.

```js
const result =
  await publishBook(bookId);
```

Para publicação, o livro precisa cumprir as regras de negócio, incluindo:

```text
descrição válida
entre 1 e 3 gêneros
pelo menos 1 capítulo publicado
```

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

Não existe atualmente:

```js
unpublishBook()
```

O frontend não deve implementar botão ou fluxo dependente dessa função.

---

## 9.9 `deleteBook(id)`

Exclui um livro pertencente ao usuário.

```js
const result =
  await deleteBook(bookId);
```

A exclusão também afeta recursos dependentes conforme regras do banco.

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

# 10. `chapterService`

Arquivo:

```text
js/services/chapterService.js
```

Funções:

```js
getChaptersByBook(bookId)

getChapterById(id)

createChapter(bookId, data)

updateChapter(id, data)

publishChapter(id)

deleteChapter(id)
```

---

## 10.1 Modelo `Chapter`

```js
{
  id: "uuid",
  bookId: "uuid",
  title: "Capítulo 1",
  content: "Texto...",
  status: "draft",
  position: 1,
  publishedAt: null,
  createdAt: "2026-09-13T...",
  updatedAt: "2026-09-13T..."
}
```

### `status`

```text
draft
published
```

`publishedAt` pode ser:

```js
null
```

---

## 10.2 `getChaptersByBook(bookId)`

Retorna os capítulos que o usuário atual possui permissão para visualizar.

```js
const result =
  await getChaptersByBook(bookId);
```

Para visitante:

```text
apenas capítulos publicados de livros publicados
```

Para o autor:

```text
os próprios capítulos podem ser acessados conforme as regras de RLS
```

Os capítulos são organizados pela propriedade:

```text
position
```

### Erros possíveis

```text
VALIDATION_ERROR
NETWORK_ERROR
UNKNOWN
```

---

## 10.3 `getChapterById(id)`

Busca um capítulo visível.

```js
const result =
  await getChapterById(chapterId);
```

### Erros possíveis

```text
VALIDATION_ERROR
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

## 10.4 `createChapter(bookId, data)`

Cria um capítulo no final do livro.

### Entrada

```js
{
  title?,
  content?
}
```

Exemplo:

```js
const result = await createChapter(
  bookId,
  {
    title: "Capítulo 1",
    content: "Texto inicial..."
  }
);
```

Título e conteúdo podem estar incompletos enquanto o capítulo permanecer em draft.

### O frontend NÃO envia

```text
id
bookId dentro de data
position
status
publishedAt
createdAt
updatedAt
```

A posição é calculada automaticamente.

Capítulos sempre são adicionados ao final.

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

## 10.5 `updateChapter(id, data)`

Atualiza um capítulo.

### Campos aceitos

```js
{
  title?,
  content?
}
```

O frontend não pode alterar:

```text
bookId
position
status
publishedAt
```

### Capítulo publicado

Um capítulo já publicado precisa continuar atendendo às regras de publicação após uma edição.

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

## 10.6 `publishChapter(id)`

Publica um capítulo.

```js
const result =
  await publishChapter(chapterId);
```

Para publicação:

```text
título obrigatório
conteúdo entre 500 e 15000 caracteres
```

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

Não existe atualmente:

```js
unpublishChapter()
```

---

## 10.7 `deleteChapter(id)`

Exclui um capítulo.

```js
const result =
  await deleteChapter(chapterId);
```

### Regra importante

A exclusão é sequencial.

Se um livro possui:

```text
1
2
3
4
5
```

e o capítulo 3 for excluído, também serão removidos:

```text
4
5
```

Isso garante posições contínuas no MVP.

O frontend deve pedir confirmação clara ao usuário antes dessa operação.

---

# 11. `favoriteService`

Arquivo:

```text
js/services/favoriteService.js
```

Funções:

```js
listFavorites()

isFavorite(bookId)

addFavorite(bookId)

removeFavorite(bookId)
```

Todas as operações deste service exigem autenticação.

---

## 11.1 Modelo `Favorite`

```js
{
  userId: "uuid",
  bookId: "uuid",
  createdAt: "2026-09-13T...",
  book: {
    id: "uuid",
    title: "Título",
    author: {
      id: "uuid",
      username: "autor",
      displayName: "Autor",
      avatarPath: null
    },
    coverPath: null,
    status: "published",
    publicationStatus: "ongoing",
    language: "pt-BR",
    genres: [
      {
        id: 1,
        name: "Fantasia",
        slug: "fantasia"
      }
    ],
    publishedAt: "2026-09-13T..."
  }
}
```

`author` pode ser:

```js
null
```

`coverPath` pode ser:

```js
null
```

---

## 11.2 `listFavorites()`

Retorna a biblioteca do usuário autenticado.

```js
const result =
  await listFavorites();
```

Lista vazia:

```js
{
  data: [],
  error: null
}
```

### Erros possíveis

```text
UNAUTHENTICATED
NETWORK_ERROR
UNKNOWN
```

---

## 11.3 `isFavorite(bookId)`

Verifica se determinado livro está nos favoritos.

```js
const result =
  await isFavorite(bookId);
```

### Sucesso

```js
{
  data: true,
  error: null
}
```

ou:

```js
{
  data: false,
  error: null
}
```

### Uso

```js
const result =
  await isFavorite(bookId);

if (!result.error) {
  favoriteButton.active =
    result.data;
}
```

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NETWORK_ERROR
UNKNOWN
```

---

## 11.4 `addFavorite(bookId)`

Adiciona um livro à biblioteca.

```js
const result =
  await addFavorite(bookId);
```

Somente livros publicados podem ser favoritados.

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NOT_FOUND
CONFLICT
NETWORK_ERROR
UNKNOWN
```

`CONFLICT` ocorre quando o livro já está nos favoritos.

---

## 11.5 `removeFavorite(bookId)`

Remove um livro da biblioteca.

```js
const result =
  await removeFavorite(bookId);
```

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

---

# 12. `imageService`

Arquivo:

```text
js/services/imageService.js
```

Funções:

```js
uploadAvatar(file)

removeAvatar()

uploadBookCover(bookId, file)

removeBookCover(bookId)
```

---

## 12.1 Formatos aceitos

O frontend pode enviar:

```text
JPEG
PNG
WebP
```

MIME types:

```text
image/jpeg
image/png
image/webp
```

Não são aceitos no MVP:

```text
GIF
SVG
```

---

## 12.2 Persistência

Independentemente do formato enviado, a imagem é convertida antes da persistência para:

```text
WebP
```

O frontend não precisa converter a imagem manualmente antes de chamar o service.

---

## 12.3 `uploadAvatar(file)`

Envia ou substitui o avatar do usuário autenticado.

```js
const file =
  input.files[0];

const result =
  await uploadAvatar(file);
```

### Tamanho máximo do arquivo de entrada

```text
2 MB
```

### Sucesso

```js
{
  data: {
    path: "avatars/{user_id}/avatar.webp"
  },
  error: null
}
```

O perfil também recebe o novo:

```text
avatarPath
```

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
NETWORK_ERROR
UNKNOWN
```

---

## 12.4 `removeAvatar()`

Remove o avatar atual.

```js
const result =
  await removeAvatar();
```

### Sucesso

```js
{
  data: {
    path: null
  },
  error: null
}
```

Após a operação:

```text
profile.avatarPath = null
```

---

## 12.5 `uploadBookCover(bookId, file)`

Envia ou substitui a capa de um livro.

```js
const result =
  await uploadBookCover(
    bookId,
    file
  );
```

### Tamanho máximo

```text
5 MB
```

Somente o autor do livro pode alterar a capa.

### Sucesso

```js
{
  data: {
    path: "covers/{book_id}/cover.webp"
  },
  error: null
}
```

O livro também recebe:

```text
coverPath
```

### Erros possíveis

```text
VALIDATION_ERROR
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
NETWORK_ERROR
UNKNOWN
```

Dependendo da proteção aplicada pelo banco/Storage, um recurso sem acesso pode ser apresentado como `NOT_FOUND`, `FORBIDDEN` ou erro genérico.

O frontend não deve tentar contornar essa restrição.

---

## 12.6 `removeBookCover(bookId)`

Remove a capa do livro.

```js
const result =
  await removeBookCover(bookId);
```

Somente o autor pode realizar a operação.

### Sucesso

```js
{
  data: {
    path: null
  },
  error: null
}
```

Após a operação:

```text
book.coverPath = null
```

---

# 13. Uso de `avatarPath` e `coverPath`

Os services trabalham com:

```text
avatarPath
coverPath
```

Não utilizar os nomes antigos:

```text
avatarUrl
coverUrl
```

Exemplos de valores:

```text
avatars/UUID/avatar.webp
covers/UUID/cover.webp
```

Esses valores representam caminhos de armazenamento.

A responsabilidade de transformar esses paths em uma URL pública de exibição deve permanecer centralizada em uma solução apropriada do projeto, evitando espalhar lógica de Supabase Storage pelas páginas.

---

# 14. Fonte de dados: Mock e Supabase

A seleção da fonte de dados acontece automaticamente.

Em:

```text
localhost
127.0.0.1
```

o padrão é:

```text
Mock
```

Em outros hostnames:

```text
Supabase
```

Para utilizar Supabase localmente durante desenvolvimento:

```text
?datasource=supabase
```

Exemplo:

```text
http://127.0.0.1:5500/?datasource=supabase
```

O frontend não deve realizar condições como:

```js
if (usingSupabase) {
  ...
} else {
  ...
}
```

A página utiliza o mesmo service independentemente da fonte:

```js
const result =
  await getBooks();
```

---

# 15. Fluxos recomendados para o frontend

## 15.1 Login

```text
Usuário envia formulário
        ↓
signIn()
        ↓
erro?
├── sim → mostrar mensagem
└── não
        ↓
getMyProfile()
        ↓
carregar aplicação
```

Exemplo:

```js
const authResult =
  await signIn({
    email,
    password
  });

if (authResult.error) {
  showError(
    authResult.error.message
  );
  return;
}

const profileResult =
  await getMyProfile();

if (profileResult.error) {
  showError(
    profileResult.error.message
  );
  return;
}

renderUser(
  profileResult.data
);
```

---

## 15.2 Cadastro

```text
Formulário
   ↓
signUp()
   ↓
perfil criado automaticamente
   ↓
getMyProfile()
   ↓
interface
```

Não executar:

```js
supabase
  .from("profiles")
  .insert(...)
```

---

## 15.3 Página pública de autor

```text
username
   ↓
getProfileByUsername()
   ↓
Profile
   ↓
getBooksByAuthor(profile.id)
   ↓
livros publicados
```

---

## 15.4 Criar livro

```text
getGenres()
   ↓
usuário seleciona 1–3 gêneros
   ↓
createBook()
   ↓
livro draft
   ↓
editor
```

---

## 15.5 Editar livro

```text
getBookById()
   ↓
updateBook()
   ↓
uploadBookCover() opcional
   ↓
interface atualizada
```

---

## 15.6 Criar capítulo

```text
createChapter(bookId, data)
   ↓
capítulo draft
   ↓
updateChapter()
   ↓
publishChapter()
```

O frontend nunca calcula:

```text
position
```

---

## 15.7 Publicar livro

Fluxo recomendado:

```text
livro draft
   ↓
possui descrição?
   ↓
possui gênero?
   ↓
possui capítulo publicado?
   ↓
publishBook()
```

Mesmo que o frontend faça validações antecipadas, o banco continua sendo a autoridade final.

---

## 15.8 Favoritar livro

```js
const result =
  await isFavorite(bookId);

if (result.error) {
  return;
}

if (result.data) {
  await removeFavorite(bookId);
} else {
  await addFavorite(bookId);
}
```

---

## 15.9 Alterar avatar

```text
<input type="file">
       ↓
arquivo selecionado
       ↓
uploadAvatar(file)
       ↓
getMyProfile()
       ↓
atualizar interface
```

---

# 16. Estados da interface

O estado de carregamento pertence ao frontend.

Exemplo:

```js
setLoading(true);

const result =
  await getBooks();

setLoading(false);
```

Estados comuns:

| Situação | Resultado |
|---|---|
| carregando | controlado pela página |
| sucesso | `error === null` |
| lista vazia | `data = []` |
| não autenticado | `UNAUTHENTICATED` |
| não autorizado | `FORBIDDEN` |
| não encontrado | `NOT_FOUND` |
| validação | `VALIDATION_ERROR` |
| conflito | `CONFLICT` |
| rede | `NETWORK_ERROR` |
| inesperado | `UNKNOWN` / `UNKNOWN_ERROR` |

---

# 17. Responsabilidade do frontend

O frontend é responsável por:

- formulários;
- estados de loading;
- estados vazios;
- feedback visual;
- mensagens de confirmação;
- navegação;
- atualização da tela após operações;
- escolha de arquivos pelo usuário;
- confirmação antes de exclusões destrutivas;
- validações de UX que melhorem a experiência.

Validações feitas pelo frontend **não substituem** validações dos services ou do banco.

---

# 18. O que o frontend NÃO deve fazer

O frontend não deve:

```text
acessar Supabase diretamente
consultar tabelas diretamente
executar RPC diretamente
acessar Storage diretamente
criar profiles manualmente
importar adapters
alterar authorId
definir position de capítulos
definir status diretamente
construir paths de Storage
duplicar regras de autorização
depender de nomes snake_case do banco
```

Exemplos proibidos:

```js
supabase
  .from("books")
  .select("*");
```

```js
supabase.storage
  .from("covers")
  .upload(...);
```

```js
book.author_id
```

Em vez disso:

```js
getBooks();
uploadBookCover();
book.authorId;
```

---

# 19. camelCase e snake_case

O banco utiliza:

```text
snake_case
```

Exemplos:

```text
display_name
avatar_path
author_id
cover_path
publication_status
published_at
created_at
updated_at
```

A aplicação utiliza:

```text
camelCase
```

Exemplos:

```text
displayName
avatarPath
authorId
coverPath
publicationStatus
publishedAt
createdAt
updatedAt
```

A conversão é responsabilidade dos adapters.

Páginas e componentes trabalham somente com `camelCase`.

---

# 20. IDs

Perfis, livros e capítulos utilizam UUID.

Exemplo:

```text
550e8400-e29b-41d4-a716-446655440000
```

Gêneros utilizam IDs inteiros positivos:

```js
1
2
3
```

O frontend não deve gerar IDs para esses recursos.

---

# 21. Regra de autorização

A interface pode esconder botões quando uma operação não deveria estar disponível.

Exemplo:

```text
Editar livro
Excluir livro
Publicar capítulo
Alterar capa
```

Porém isso é apenas UX.

A autorização real é aplicada por:

```text
services
Supabase
RLS
Storage policies
constraints
triggers
funções SQL
```

Nunca considerar um botão oculto como proteção de segurança.

---

# 22. Atualização da tela após mutações

Após uma mutação bem-sucedida, o frontend pode utilizar o próprio retorno ou realizar nova consulta.

Exemplo:

```js
const result =
  await updateMyProfile({
    displayName
  });

if (!result.error) {
  renderProfile(result.data);
}
```

Quando uma operação altera dados relacionados:

```js
await uploadAvatar(file);

const profile =
  await getMyProfile();
```

Isso evita manter estado visual desatualizado.

---

# 23. Exclusões destrutivas

Algumas exclusões podem afetar outros dados.

Antes de executar:

```js
deleteBook()
deleteChapter()
```

o frontend deve solicitar confirmação.

Especialmente em capítulos:

```text
excluir um capítulo exclui também os capítulos posteriores
```

A mensagem da interface deve deixar esse comportamento claro.

---

# 24. Regras para desenvolvimento do frontend

Antes de criar uma nova chamada de dados, verificar se já existe uma função neste contrato.

Se existir:

```text
utilizar o service
```

Se não existir:

```text
não acessar Supabase diretamente
```

Nesse caso, a necessidade deve ser discutida com quem mantém a camada de dados para decidir se uma nova função será adicionada ao service.

---

# 25. Mudanças neste contrato

Uma mudança exige atualização deste documento quando alterar:

- nome de função pública;
- parâmetros;
- nome de propriedade;
- tipo de propriedade;
- nulabilidade relevante;
- estrutura de retorno;
- código de erro;
- comportamento observável pelo frontend.

Mudanças internas não exigem alteração do contrato quando não afetam o frontend.

Exemplos:

```text
query SQL
índice
trigger interno
nome de função auxiliar
implementação de adapter
otimização de consulta
```

---

# 26. Fonte de verdade

Para o frontend, este documento é a referência oficial das interfaces disponíveis.

Ordem de responsabilidade:

```text
Regras de negócio
    ↓
Services
    ↓
Adapters
    ↓
Supabase / Mock
```

O frontend não deve precisar conhecer a implementação abaixo dos services.

Em caso de divergência entre uma implementação e este contrato, a divergência deve ser corrigida antes que novos componentes dependam dela.