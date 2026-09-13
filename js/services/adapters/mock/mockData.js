// Dados compartilhados entre os adapters do ambiente Mock.

export const mockUsers = [
  {
    id: "mock-user-1",
    email: "teste1@gmail.com",
    password: "090909",
    username: "teste1",
    displayName: "Usuário Teste 1"
  }
];

export const mockProfiles = [
  {
    id: "mock-user-1",
    username: "teste1",
    displayName: "Usuário Teste 1",
    bio: null,
    avatarPath: null,
    createdAt: "2026-08-31T12:00:00.000Z",
    updatedAt: "2026-08-31T12:00:00.000Z"
  }
];

// Gêneros disponíveis no ambiente Mock.
export const mockGenres = [
  {
    id: 1,
    name: "Ação",
    slug: "acao"
  },
  {
    id: 2,
    name: "Aventura",
    slug: "aventura"
  },
  {
    id: 3,
    name: "Comédia",
    slug: "comedia"
  },
  {
    id: 4,
    name: "Drama",
    slug: "drama"
  },
  {
    id: 5,
    name: "Fantasia",
    slug: "fantasia"
  },
  {
    id: 6,
    name: "Ficção Científica",
    slug: "ficcao-cientifica"
  },
  {
    id: 7,
    name: "Mistério",
    slug: "misterio"
  },
  {
    id: 8,
    name: "Romance",
    slug: "romance"
  },
  {
    id: 9,
    name: "Suspense",
    slug: "suspense"
  },
  {
    id: 10,
    name: "Terror",
    slug: "terror"
  },
  {
    id: 11,
    name: "Ficção Histórica",
    slug: "ficcao-historica"
  },
  {
    id: 12,
    name: "Fanfic",
    slug: "fanfic"
  }
];

// Livros disponíveis no ambiente Mock.
export const mockBooks = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    authorId: "mock-user-1",
    title: "Livro Publicado de Teste",
    description: "Livro utilizado para testes do ambiente Mock.",
    coverPath: null,
    status: "published",
    publicationStatus: "ongoing",
    language: "pt-BR",
    publishedAt: "2026-09-01T12:00:00.000Z",
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z"
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    authorId: "mock-user-1",
    title: "Livro em Rascunho",
    description: "Rascunho utilizado nos testes.",
    coverPath: null,
    status: "draft",
    publicationStatus: "ongoing",
    language: "pt-BR",
    publishedAt: null,
    createdAt: "2026-09-02T12:00:00.000Z",
    updatedAt: "2026-09-02T12:00:00.000Z"
  }
];

// Relações entre livros e gêneros no ambiente Mock.
export const mockBookGenres = [
  {
    bookId: "11111111-1111-1111-1111-111111111111",
    genreId: 5
  },
  {
    bookId: "11111111-1111-1111-1111-111111111111",
    genreId: 2
  },
  {
    bookId: "22222222-2222-2222-2222-222222222222",
    genreId: 8
  }
];

// Capítulos mínimos usados pelos testes de publicação.
export const mockChapters = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    bookId: "11111111-1111-1111-1111-111111111111",
    title: "Capítulo 1",
    content: "A".repeat(500),
    status: "published",
    position: 1,
    publishedAt: "2026-09-01T12:00:00.000Z",
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z"
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    bookId: "11111111-1111-1111-1111-111111111111",
    title: "Capítulo 2",
    content: "B".repeat(500),
    status: "draft",
    position: 2,
    publishedAt: null,
    createdAt: "2026-09-02T12:00:00.000Z",
    updatedAt: "2026-09-02T12:00:00.000Z"
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    bookId: "22222222-2222-2222-2222-222222222222",
    title: "Rascunho 1",
    content: null,
    status: "draft",
    position: 1,
    publishedAt: null,
    createdAt: "2026-09-03T12:00:00.000Z",
    updatedAt: "2026-09-03T12:00:00.000Z"
  }
];