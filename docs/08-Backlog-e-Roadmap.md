# 08 — Roadmap

## 1. Objetivo

Registrar a evolução de alto nível do produto.

O acompanhamento operacional de tarefas, responsáveis, prazos, criticidade e status é realizado no **Trello**. Este documento não deve duplicar os cartões do quadro.

## 2. Roadmap do MVP

| Fase | Resultado esperado | Marco sugerido |
|---|---|---|
| Fundação | arquitetura, ambientes, segurança e processos definidos | `0.1.x` |
| Conta e perfil | cadastro, login, logout, sessão e perfil | `0.2.0` |
| Publicação | livros, capítulos, gêneros, rascunho, publicação e capa | `0.3.0` |
| Descoberta e leitura | home, detalhes, leitor, busca e navegação | `0.4.0` |
| Biblioteca | favoritos e biblioteca do usuário | `0.5.0` |
| Estabilização | requisitos, segurança, responsividade e regressão validados | `1.0.0` |

Os marcos são referências de versionamento, não cronograma rígido.

## 3. Fundação

Saída esperada:

- repositório e fluxo Git funcionando;
- Vercel e Supabase configurados;
- modelo de dados aprovado;
- estratégia RLS/Storage definida;
- design system inicial;
- contrato Front ↔ Supabase estabelecido.

## 4. Conta e perfil

Saída esperada:

- cadastro;
- login;
- logout;
- sessão;
- criação e edição de `profiles`;
- RLS de perfil;
- tratamento padronizado de estados e erros.

## 5. Publicação

Saída esperada:

- CRUD autorizado de livros;
- gêneros;
- capítulos;
- rascunhos;
- publicação;
- capa;
- integridade de ordenação;
- autorização de autoria.

## 6. Descoberta e leitura

Saída esperada:

- catálogo;
- cards;
- página de detalhes;
- lista de capítulos;
- leitor;
- anterior/próximo;
- busca;
- gênero;
- revisão mobile first.

## 7. Biblioteca

Saída esperada:

- adicionar/remover favorito;
- biblioteca;
- estado visual;
- RLS;
- testes integrados.

## 8. Estabilização

Antes de `1.0.0`:

- revisar requisitos;
- executar regressão;
- revisar RLS e uploads;
- validar responsividade e navegadores;
- revisar acessibilidade mínima;
- corrigir fluxos quebrados;
- atualizar documentação;
- preparar demonstração.

Checklist de testes: `10-Testes.md`.  
Deploy/release: `12-Deploy-e-Ambientes.md`.

## 9. Pós-MVP

Candidatos:

- página pública completa de autor;
- histórico e continuar lendo;
- avaliações/curtidas;
- comentários;
- ranking;
- busca avançada;
- configurações de leitura;
- PWA/offline;
- recomendações;
- seguidores;
- notificações;
- exportação;
- analytics;
- moderação;
- colaboração entre autores.

Esses recursos não devem atrasar `1.0.0`.

## 10. Definição de pronto

Uma tarefa operacional só deve ser considerada concluída quando cumprir os critérios registrados no cartão correspondente do Trello e, quando aplicável:

- comportamento validado;
- segurança revisada;
- responsividade verificada;
- documentação atualizada;
- PR revisado conforme `09-Git-e-Versionamento.md`.

## Pendência para avaliação de Matheus — favoritos (0.42.0)

- Validar a persistência de favoritos no ambiente mock após recarga: o adapter mock passou a guardar a lista por usuário no `localStorage`, mantendo a checagem de duplicidade existente. Isso é somente para prévia local; confirmar a integração real com Supabase/RLS antes da entrega em produção.
- Avaliar no serviço/adapters a normalização de erros de autorização do Supabase (`42501`/RLS) para `FORBIDDEN`; a interface atual trata a falha genericamente sem interromper a página.
