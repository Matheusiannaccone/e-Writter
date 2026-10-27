# 14 — Contrato Front ↔ Services

## Escopo e convenções

Esta é a referência das **41 funções públicas de domínio** exportadas pelos sete arquivos `*Service.js` em [js/services](../js/services/). As páginas e componentes usam essas funções; seleção de adapters e cliente Supabase são infraestrutura, descrita em [04-Arquitetura.md](04-Arquitetura.md).

Os services encaminham argumentos e retornos ao adapter ativo, sem normalização adicional. Portanto, diferenças observáveis entre fontes fazem parte deste contrato. Regras completas estão em [03-Regras-de-Negocio.md](03-Regras-de-Negocio.md); schema/RLS não são reproduzidos aqui.

A notação TypeScript abaixo é apenas documental, sem implicar build ou dependência TypeScript no projeto.

```ts
type ServiceError = { code: string; message: string };
type Result<T> = { data: T | null; error: ServiceError | null };
type Id = string;
type Timestamp = string; // ISO nas projeções de dados da aplicação
```

Salvo `onAuthStateChange`, as funções retornam `Promise<Result<T>>`. No sucesso, `error` é nulo; listas sem resultados usam `[]`. `data: null` também pode representar sucesso em `signOut` ou ausência de sessão. Verificar `error` e o contrato da operação, não apenas a presença de `data`.

As páginas devem manter `try/catch/finally`: nem toda exceção lançada pelo SDK, armazenamento ou chamada inválida é convertida em envelope. Um erro não garante que etapas anteriores de uma mutação tenham sido revertidas.

## Modelos de domínio

```ts
type Genre = { id: number; name: string; slug: string };
type Profile = {
  id: Id; username: string; displayName: string;
  bio: string | null; avatarPath: string | null;
  createdAt: Timestamp; updatedAt: Timestamp;
};
type Book = {
  id: Id; authorId: Id | null; title: string;
  description: string | null; coverPath: string | null;
  status: 'draft' | 'published';
  publicationStatus: 'ongoing' | 'completed' | 'discontinued';
  language: string; publishedAt: Timestamp | null;
  createdAt: Timestamp; updatedAt: Timestamp; genres: Genre[];
};
type Chapter = {
  id: Id; bookId: Id; title: string | null; content: string | null;
  status: 'draft' | 'published'; position: number;
  publishedAt: Timestamp | null; createdAt: Timestamp; updatedAt: Timestamp;
};
type AuthorSummary = {
  id: Id; username: string; displayName: string; avatarPath: string | null;
};
type FavoriteBook = {
  id: Id; title: string; author: AuthorSummary | null;
  coverPath: string | null; status: 'draft' | 'published';
  publicationStatus: 'ongoing' | 'completed' | 'discontinued';
  language: string; genres: Genre[]; publishedAt: Timestamp | null;
};
type Favorite = {
  userId: Id; bookId: Id; createdAt: Timestamp; book: FavoriteBook | null;
};
```

Os adapters Supabase convertem colunas para camelCase. Identificadores de perfis/obras/capítulos no banco são UUIDs; gêneros usam inteiros positivos. **Identidades Mock não são UUIDs**: fixtures usam prefixo próprio e novas contas usam prefixo seguido de UUID. Obras/capítulos Mock continuam usando UUIDs.

`avatarPath` e `coverPath` são referências lógicas, não URLs. `authorId`, `Favorite.book`, `FavoriteBook.author`, título/conteúdo de rascunho e datas de publicação podem ser nulos como indicado. Um favorito não garante obra ainda publicada/acessível.

## Erros retornados

| Código | Uso observado |
|---|---|
| `VALIDATION_ERROR` | Entrada/formato inválido ou critério de domínio recusado. |
| `UNAUTHENTICATED` | Sessão ausente/inválida, credenciais recusadas ou operação que exige autenticação. |
| `INVALID_RECOVERY_LINK` | Recuperação sem sessão aceita, expirada ou URL de erro. |
| `CONFLICT` | E-mail/username já utilizado ou favorito duplicado. |
| `NOT_FOUND` | Recurso ausente ou não visível; não prova inexistência global. |
| `FORBIDDEN` | Recusa explícita de propriedade/imagem ou mensagem RLS reconhecida pelo adapter de imagens. |
| `NETWORK_ERROR` | Falha de comunicação reconhecida. |
| `RATE_LIMIT` | Limite de e-mail/requisições de Auth. |
| `EMAIL_NOT_AUTHORIZED` | Restrição do serviço de e-mail para o endereço. |
| `AUTH_UNAVAILABLE` | Operação/provedor de Auth desabilitado. |
| `UNKNOWN` | Falha genérica dos adapters de dados/imagem. |
| `UNKNOWN_ERROR` | Falha genérica de Auth/identidade Mock. |

Tratar os dois códigos genéricos como falha recuperável quando aplicável, sem decidir por texto de mensagem. Não presumir que todo SQLSTATE/erro RLS seja convertido em `FORBIDDEN`; vários adapters usam `UNKNOWN`. Lista vazia e ausência de sessão sem erro não são falhas de rede.

## authService

Fonte: [authService.js](../js/services/authService.js).

| Assinatura | Tipo de `data` no resultado e comportamento |
|---|---|
| `signUp({ email, password, username, displayName })` | Objeto com `user` e `session`, conforme Auth; sessão pode ser nula no Supabase. Mock retorna usuário e sessão após persistir conta/perfil. |
| `signIn({ email, password })` | Supabase: objeto do SDK com `user`/`session`; Mock: a própria sessão `{ user, expires_at }`. Não há formato único adicional criado pelo service. |
| `signOut()` | `null`; verificar `error` antes de anunciar saída. |
| `getSession()` | Sessão do adapter ou `null` quando não existe, sem exigir que isso seja erro. |
| `getCurrentUser()` | Usuário de Auth ou identidade Mock `{ id, email, username, displayName }`; ausência de autenticação retorna erro. |
| `resetPasswordForEmail({ email })` | Resposta de envio do SDK; no Mock, objeto `message` informando simulação, sem envio ou consulta de existência. |
| `getPasswordRecoverySession()` | Sessão aceita pelo adapter; URL/sessão inválida pode produzir `INVALID_RECOVERY_LINK`. |
| `updatePassword({ password })` | Supabase: usuário atualizado; Mock: `{ id, email, message }` após persistir novo verificador. |
| `onAuthStateChange(callback)` | Exceção ao envelope assíncrono: retorna sincronamente `{ data: { subscription: { unsubscribe() } } }`. |

Parâmetros de cadastro: `email`, `password`, `username` e `displayName` são strings. Username usa 3–30 caracteres minúsculos, números, ponto ou sublinhado; nome aparado tem 1–60 caracteres; senha tem no mínimo 6. O Mock valida a sintaxe de e-mail compartilhada, inclusive domínio sem ponto; não consulta DNS ou existência da conta. O Supabase pode impor validação/limites adicionais.

O cadastro envia metadata de perfil ao Auth no Supabase; a interface não deve fazer INSERT separado em `profiles`. Na atualização de senha, o adapter consulta novamente a sessão aceita. O Supabase aceita a sessão válida disponível após a inicialização do SDK, sem uma marca adicional obrigatória de recovery; o Mock utiliza uma sessão comum de demonstração. Senha fraca/reutilizada pode virar `VALIDATION_ERROR` no backend real.

`callback(event, session)` recebe eventos do adapter. O Mock emite `SIGNED_IN`, `SIGNED_OUT` e `SESSION_ERROR` e não entrega automaticamente um evento inicial na assinatura. O SDK Supabase também pode emitir `INITIAL_SESSION`, `TOKEN_REFRESHED`, `USER_UPDATED` e `PASSWORD_RECOVERY`. Para encerrar a assinatura, chamar `listener.data.subscription.unsubscribe()`; consultas assíncronas relevantes são agendadas fora do callback do SDK pelos componentes.

Auth usa os códigos de validação, autenticação, conflito, rede, recuperação e limites descritos acima. Falhas de storage da identidade Mock usam `UNKNOWN_ERROR`. Uma conta pode já estar salva quando falha apenas o início da sessão.

## profileService

Fonte: [profileService.js](../js/services/profileService.js).

| Assinatura | `T` em `Result<T>` | Parâmetros/efeitos |
|---|---|---|
| `getProfile(userId)` | `Profile` | UUID no Supabase; string não vazia de identidade no Mock. Consulta pública. |
| `getMyProfile()` | `Profile` | Exige sessão; consulta o titular. |
| `getProfileByUsername(username)` | `Profile` | String normalizada com trim/minúsculas e validada no adapter. |
| `updateMyProfile(data)` | `Profile` | Exige sessão e ao menos um campo editável válido. |

`data` aceita `username?: string`, `displayName?: string` e `bio?: string | null`. Username/nome usam os limites do cadastro. Bio tem até 500 caracteres e vazio é convertido para nulo; texto não vazio pode conservar espaços recebidos pelo adapter. Campos desconhecidos não são enviados para atualização; se nenhum campo reconhecido for fornecido, retorna validação. E-mail e avatar não são editados por esta função.

Erros relevantes: validação, ausência de sessão, recurso ausente, conflito de username, rede e genéricos. O Mock adiciona falhas de identidade/armazenamento com `UNKNOWN_ERROR`.

## genreService

Fonte: [genreService.js](../js/services/genreService.js).

| Assinatura | `T` | Parâmetros/resultado |
|---|---|---|
| `getGenres()` | `Genre[]` | Lista ordenada por nome; Mock usa comparação `pt-BR`, Supabase ordena no banco. |
| `getGenreById(id)` | `Genre` | Inteiro positivo; não converter string implicitamente no consumidor. |
| `getGenreBySlug(slug)` | `Genre` | String aparada/minúscula; vazio é inválido. |

Consultas públicas, sem operações de escrita. Erros relevantes: validação, ausente, rede e `UNKNOWN`.

## bookService

Fonte: [bookService.js](../js/services/bookService.js).

| Assinatura | `T` | Parâmetros/resultado |
|---|---|---|
| `getBooks()` | `Book[]` | Somente publicadas. Supabase ordena por publicação decrescente; Mock mantém ordem do array. |
| `getBookById(id)` | `Book` | UUID de obra; só retorna registro visível à sessão/visitante. |
| `getMyBooks()` | `Book[]` | Exige sessão, inclui rascunhos. Supabase ordena por atualização decrescente; Mock mantém ordem do array. |
| `getBooksByAuthor(authorId)` | `Book[]` | UUID validado pelos dois adapters, somente publicadas. Isso limita o uso com identidades Mock prefixadas. |
| `createBook(data)` | `Book` | `title: string`, `genreIds: number[]`, `description?: string | null`. |
| `updateBook(id, data)` | `Book` | UUID e atualização parcial reconhecida, descrita abaixo. |
| `publishBook(id)` | `Book` | UUID, autenticação/autoria e critérios da RN-019C. |
| `unpublishBook(id)` | `Book` | UUID de obra própria publicada; retorna a draft. Já estar em draft é validação. |
| `deleteBook(id)` | `{ id: string }` | UUID e autoria; operação técnica sem controle de exclusão na interface. |

Nova obra usa `draft`, `ongoing`, `pt-BR` e capa/data de publicação nulas. IDs/autoria/timestamps não são fornecidos pelo consumidor. `genreIds` deve conter de um a três inteiros positivos distintos existentes.

Atualização aceita `title`, `description`, `coverPath`, `publicationStatus`, `language` e `genreIds`. Precisa haver ao menos um campo aceito; chaves extras não são aplicadas. Título deve ser não vazio; descrição/caminho podem ser nulos ou normalizados de vazio para nulo; idioma deve ser string não vazia; andamento usa o domínio de `Book`.

A alteração de `coverPath` não envia arquivos: usar imageService para o pipeline da imagem. A interface atual edita apenas título, descrição, gêneros e capa, sem seletor de andamento/idioma.

No Supabase, atualizar campos e substituir gêneros são chamadas separadas; falha posterior não desfaz campos já salvos. No Mock, validações e atribuições de campos de obra são sequenciais, sem transação: não assumir ausência de alteração em memória após todo erro. Uma leitura posterior também pode falhar após mutação já aplicada.

Excluir obra remove capítulos/gêneros nos dois adapters; no Supabase as FKs também removem favoritos. O Mock não faz a mesma limpeza de favoritos. Arquivos de capa não são automaticamente excluídos por `deleteBook`.

Erros relevantes: validação, ausência de sessão nas operações próprias, ausente/não visível, rede e `UNKNOWN`. Uma recusa de autorização pode ser apresentada como ausente ou genérica.

## chapterService

Fonte: [chapterService.js](../js/services/chapterService.js).

| Assinatura | `T` | Parâmetros/resultado |
|---|---|---|
| `getChaptersByBook(bookId)` | `Chapter[]` | UUID; capítulos visíveis, por posição crescente. Obra ausente/oculta difere de lista vazia e pode retornar `NOT_FOUND`. |
| `getChapterById(id)` | `Chapter` | UUID de capítulo visível. |
| `createChapter(bookId, data)` | `Chapter` | Obra própria; `title?: string | null`, `content?: string | null`. Nasce rascunho ao final. |
| `updateChapter(id, data)` | `Chapter` | UUID; ao menos um de `title`/`content`, como string ou nulo. Chaves extras são recusadas. |
| `publishChapter(id)` | `Chapter` | UUID próprio e critérios da RN-026; pode publicar capítulo de obra ainda em rascunho sem liberá-lo ao público. |
| `unpublishChapter(id)` | `Chapter` | UUID de capítulo próprio publicado; efeitos diferem entre fontes. |
| `deleteChapter(id)` | `{ id: string, deletedIds: string[] }` | Exclui alvo e posteriores; a lista de IDs no Supabase é consultada antes do DELETE. Sem controle na interface. |

O consumidor não define posição, vínculo de obra em atualização, autoria, status ou datas. Título é aparado; conteúdo não é aparado e string vazia vira nulo no adapter. Publicados precisam permanecer válidos após edição. O formulário é mais restritivo para rascunhos que o contrato, exigindo título/conteúdo não vazios.

A contagem da interface/Mock usa `.length` do JavaScript (unidades UTF-16); o PostgreSQL usa `char_length` (caracteres). Texto com símbolos fora do BMP pode produzir contagens diferentes. Não há garantia de paridade integral na borda dos limites.

### Despublicação e exclusão

No Supabase, `unpublishChapter` chama a RPC que despublica alvo e capítulos publicados posteriores. Se não restar publicado, pode despublicar a obra. O retorno público contém apenas o alvo normalizado; consumidores devem recarregar obra/lista. A interface atual bloqueia o único publicado de uma obra publicada antes dessa chamada, mas a RPC técnica possui a cascata descrita.

No Mock, despublicação altera somente o alvo e recusa retirar o último publicado de obra publicada. `deleteChapter` Mock remove a cauda em memória sem salvar o catálogo e sem repetir a proteção do banco para o último publicado. Recarregar pode desfazer essa exclusão. Não tratar essas operações como equivalentes entre fontes.

A exclusão no Supabase pode falhar por integridade da obra publicada. Erros relevantes: validação, ausência de sessão, ausente/não visível, rede e `UNKNOWN`. `deletedIds` é uma relação previamente consultada, não um relatório transacional de exclusão de arquivos/imagens.

## favoriteService

Fonte: [favoriteService.js](../js/services/favoriteService.js).

| Assinatura | `T` | Parâmetros/resultado |
|---|---|---|
| `listFavorites()` | `Favorite[]` | Conta atual, mais recentes primeiro; já inclui resumos de obra/autoria/gêneros. |
| `isFavorite(bookId)` | `boolean` | UUID; confirma existência da relação própria. |
| `addFavorite(bookId)` | `Favorite` | UUID de obra publicada; duplicidade é `CONFLICT`. |
| `removeFavorite(bookId)` | `{ bookId: string }` | Remove relação própria; ausência é `NOT_FOUND`. Não exige obra ainda pública. |

Todas exigem autenticação. A relação pode sobreviver à despublicação ou ficar sem obra acessível; `book`/`author` podem ser nulos. O Mock usa os perfis fixtures de `mockData` no resumo, sem refletir necessariamente alterações do snapshot de identidade. As páginas devem validar o payload antes de montar cards e não presumir que a quantidade persistida seja a quantidade exibida.

Erros relevantes: validação, ausência de sessão, ausente, conflito na inclusão, rede e `UNKNOWN`. Falha de persistência local de favoritos pode ser absorvida pelo Mock, mantendo apenas o estado em memória.

## imageService

Fonte: [imageService.js](../js/services/imageService.js).

| Assinatura | `T` | Parâmetros/resultado |
|---|---|---|
| `uploadAvatar(file)` | `{ path: string }` | Arquivo de imagem da conta atual; caminho lógico de avatar. |
| `removeAvatar()` | `{ path: null }` | Conta atual; limpa a referência após a operação. |
| `uploadBookCover(bookId, file)` | `{ path: string }` | UUID de obra persistida e arquivo; exige propriedade. |
| `removeBookCover(bookId)` | `{ path: null }` | UUID; remove arquivo/referência pelo adapter. |
| `getBookCoverUrl(path)` | `{ url: string }` | Caminho lógico de capa `covers/{UUID}/cover.webp`; não é função de upload. |

No Supabase, `file` deve ser Blob/File JPEG, PNG ou WebP. O adapter valida tamanho, converte e armazena; limites e regras dos buckets pertencem a [11-Seguranca.md](11-Seguranca.md). Upload/remoção e referência na tabela não compartilham transação; o consumidor deve apresentar falha parcial com precisão.

`getBookCoverUrl` resolve URL pública com versão no Supabase e URL `blob:` temporária no Mock. Consumidores que trocam/descartam essas URLs temporárias devem liberá-las quando não forem necessárias; o editor já trata a troca de prévia. Não há `getAvatarUrl` ou outro resolver público de avatar no service.

O Mock grava a capa original no IndexedDB, sem conversão, embora o caminho termine em `.webp`. Avatar apenas modifica o perfil fixture em memória; contas novas do snapshot podem não possuir esse fixture e retornar `NOT_FOUND`. Isso não implementa upload/exibição de avatar na tela de Perfil.

Erros relevantes: validação, ausência de sessão nas mutações, propriedade recusada, recurso ausente, rede e `UNKNOWN`. Resolver caminho inválido ou capa não armazenada também pode falhar; a interface deve manter fallback.

## Diferenças entre Mock e Supabase

| Tema | Consequência para o consumidor |
|---|---|
| Login e usuário | Formato de `signIn().data` e projeção de usuário não são idênticos; usar `getCurrentUser` para identidade e profileService para perfil. |
| IDs e autoria | IDs de conta Mock são prefixados; `getBooksByAuthor` ainda exige UUID. |
| Ordem de obras | Mock conserva a ordem do array; Supabase aplica ordenação por datas. |
| Perfil/autor resumido | Perfil editado no snapshot não necessariamente atualiza autoria resumida dos favoritos Mock. |
| Persistência e erros | Identidade Mock exige confirmação de storage; catálogo/favoritos podem funcionar só em memória. |
| Despublicação de capítulo | Supabase trata cauda/obra; Mock somente o alvo, com proteção distinta. |
| Exclusão de capítulo | Mock não persiste a exclusão e não oferece toda a integridade do banco. |
| Exclusão de obra | Limpeza de favoritos e de arquivos não deve ser presumida igual nos adapters. |
| Imagens | Mock não converte capa e não integra avatar ao snapshot; Supabase usa Storage/WebP. |
| Texto | UTF-16 no JavaScript e `char_length` no PostgreSQL podem divergir em Unicode. |

## Uso e manutenção

A página controla carregamento, foco, confirmação e apresentação do resultado. Após efeitos em registros relacionados, reconsultar os dados relevantes; não assumir que o objeto retornado lista toda a cascata. Respostas precisam ser aceitas somente na geração/identidade atual, conforme os componentes de sessão.

Não há services de busca, progresso de leitura, exclusão de conta, comentários ou avaliações. `deleteBook`, `deleteChapter`, operações de avatar e consultas de autor existem como API, mas não constituem jornadas completas na interface.

Mudança em assinatura, nulabilidade, retorno, código de erro ou efeito observável exige atualização deste documento e validação proporcional. O código atual é a referência da auditoria; divergência encontrada deve ser registrada sem inventar uma garantia ou alterar a aplicação dentro de uma tarefa documental.
