# e-Writter

Plataforma web **mobile first** de escrita e leitura de livros, desenvolvida como projeto acadêmico da disciplina de Web Design.

O e-Writter permite que usuários atuem como leitores e escritores, criando obras organizadas em capítulos, publicando conteúdo e mantendo uma biblioteca pessoal de favoritos.

O MVP utiliza **HTML, CSS e JavaScript puro** no frontend e **Supabase + PostgreSQL** no backend.

## Funcionalidades do MVP

* cadastro e autenticação de usuários;
* perfis públicos;
* criação e gerenciamento de livros;
* criação e publicação de capítulos;
* classificação de livros em 1 a 3 gêneros;
* descoberta e leitura de obras publicadas;
* biblioteca privada de favoritos;
* interface responsiva para desktop e dispositivos móveis.

### Regras principais

Livros podem permanecer como `draft` enquanto estão sendo desenvolvidos. Para publicação, precisam possuir título, descrição, de 1 a 3 gêneros e pelo menos um capítulo publicado.

Capítulos são adicionados sequencialmente ao final do livro. No MVP não existe reordenação ou inserção entre capítulos existentes. Para publicação, um capítulo precisa possuir título e conteúdo entre **500 e 15.000 caracteres**.

As principais regras de integridade também são protegidas diretamente pelo banco de dados.

## Stack

| Área           | Tecnologia                          |
| -------------- | ----------------------------------- |
| Frontend       | HTML5, CSS3 e JavaScript ES Modules |
| Backend        | Supabase                            |
| Banco de dados | PostgreSQL                          |
| Autenticação   | Supabase Auth                       |
| Autorização    | Row Level Security                  |
| Ambiente local | Supabase CLI + Docker               |
| Hospedagem     | Vercel                              |
| Versionamento  | Git + GitHub                        |

O projeto não utiliza framework frontend.

## Arquitetura

O frontend não acessa diretamente o Supabase a partir das páginas e componentes.

```text
Página / Componente
        ↓
      Service
        ↓
      Adapter
      ↙     ↘
    Mock   Supabase
```

Essa separação permite desenvolver partes da interface utilizando dados simulados e posteriormente conectá-las ao backend sem alterar o contrato consumido pelo frontend.

A fonte de dados é selecionada por `dataSource.js`.

Mais detalhes estão disponíveis em [Arquitetura](docs/04-Arquitetura.md) e [Contrato Front ↔ Supabase](docs/14-Contrato-Front-Supabase.md).

## Banco de dados

O modelo principal do MVP possui seis tabelas:

```text
profiles
books
chapters
genres
book_genres
favorites
```

Relacionamento simplificado:

```text
auth.users
    │
    ▼
 profiles
    │
    ▼
  books ───────── favorites
   │  \
   │   └──── book_genres ──── genres
   │
   ▼
chapters
```

O banco utiliza:

* constraints;
* foreign keys;
* Row Level Security;
* functions;
* triggers;
* exclusões em cascata;
* validações de publicação e integridade.

Entre as regras protegidas no banco estão a autoria das obras, sequência dos capítulos, limites de gêneros, favoritos privados e requisitos para publicação.

A estrutura é versionada em:

```text
supabase/migrations/
```

## Autenticação

A autenticação já possui uma camada de services e adapters:

```text
authService
     ↓
authAdapter
   ↙     ↘
 Mock  Supabase
```

O fluxo contempla cadastro, login, logout, sessão atual, usuário autenticado e mudanças no estado de autenticação.

Erros provenientes do backend são normalizados antes de chegar ao frontend.

## Estrutura do projeto

```text
/
├── assets/
├── css/
├── docs/
├── js/
│   ├── components/
│   ├── pages/
│   └── services/
│       ├── adapters/
│       │   ├── mock/
│       │   └── supabase/
│       ├── authService.js
│       ├── dataSource.js
│       └── supabaseClient.js
├── supabase/
│   ├── migrations/
│   ├── config.toml
│   └── seed.sql
├── index.html
├── package.json
└── README.md
```

A estrutura será expandida conforme novos services, adapters, páginas e componentes forem implementados.

## Ambiente local

### Requisitos

* Git;
* Node.js e npm;
* Docker;
* Supabase CLI.

### Iniciar o Supabase

```bash
npx supabase start
```

### Recriar o banco local

```bash
npx supabase db reset
```

### Conferir migrations

```bash
npx supabase migration list
```

### Validar alterações antes do ambiente remoto

```bash
npx supabase db push --dry-run
```

Alterações de banco devem ser validadas localmente antes de serem aplicadas ao Supabase compartilhado pela equipe.

## Fluxo Git

O projeto utiliza branches específicas por tarefa:

```text
feature/
fix/
docs/
refactor/
```

Fluxo padrão:

```text
main
 ↓
branch
 ↓
implementação
 ↓
testes
 ↓
commit
 ↓
Pull Request
 ↓
revisão
 ↓
merge
```

Não deve haver desenvolvimento direto na `main`.

Os commits seguem **Conventional Commits** e **Semantic Versioning**:

```text
MAJOR.MINOR.PATCH - tipo: descrição
```

Exemplo:

```text
0.15.0 - feat: adiciona integridade entre livros capítulos e gêneros
```

Mais detalhes em [Git e Versionamento](docs/09-Git-e-Versionamento.md).

## Estado atual

O projeto está na fase de **implementação e integração do MVP**.

Atualmente já estão implementados ou definidos:

* arquitetura e regras de negócio;
* ambientes Supabase local e remoto;
* deploy pela Vercel;
* fluxo colaborativo com Git e Pull Requests;
* autenticação com adapters Mock e Supabase;
* alternância entre Mock e backend real;
* modelo completo do banco do MVP;
* RLS, constraints, functions e triggers;
* regras de publicação de livros e capítulos;
* associação de gêneros;
* favoritos;
* validação completa das migrations e regras de integridade.

O foco atual passa a ser a criação dos services restantes e a integração progressiva do frontend com o backend.

## Próximas etapas

* services de perfis;
* services de livros;
* services de capítulos;
* services de gêneros e favoritos;
* integração das páginas com o backend;
* capas e avatares com Supabase Storage;
* refinamento da interface;
* testes de integração e do fluxo completo do usuário.

Recursos como comentários, avaliações, recomendações, notificações, reorganização livre de capítulos e leitura offline ficam para evolução pós-MVP.

## Documentação

A documentação técnica completa está em [`docs/`](docs/).

Principais documentos:

* [Visão Geral](docs/01-Visao-Geral.md)
* [Requisitos](docs/02-Requisitos.md)
* [Regras de Negócio](docs/03-Regras-de-Negocio.md)
* [Arquitetura](docs/04-Arquitetura.md)
* [Modelo de Dados](docs/05-Modelo-de-Dados.md)
* [Fluxos de Usuário](docs/06-Fluxos-de-Usuario.md)
* [Git e Versionamento](docs/09-Git-e-Versionamento.md)
* [Testes](docs/10-Testes.md)
* [Segurança](docs/11-Seguranca.md)
* [Contrato Front ↔ Supabase](docs/14-Contrato-Front-Supabase.md)
* [Links dos Tutoriais](docs/15-Link-dos-Tutoriais.md)

## Projeto acadêmico

Projeto desenvolvido por uma equipe de **5 integrantes** para a disciplina de **Web Design**.

A primeira versão estável do MVP será representada pela versão `1.0.0`. Durante o desenvolvimento, o projeto permanece em versões `0.x.y`.
