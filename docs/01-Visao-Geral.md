# 01 — Visão Geral

## Produto e contexto

O e-Writter é uma aplicação web acadêmica da disciplina de Web Design, desenvolvida por uma equipe de cinco integrantes. O MVP funcional é identificado como `1.0.0`; mudanças documentais posteriores não ampliam seu escopo de produto.

## Problema e público

Autores iniciantes precisam de uma forma simples de organizar e publicar histórias por capítulos. Leitores precisam descobrir essas obras, acessar o conteúdo publicado e guardar favoritos. A proposta reduz esse percurso a um catálogo, uma experiência de leitura e uma área de autoria na mesma aplicação.

O público principal são leitores e autores independentes/iniciantes. Uma única conta atende aos dois usos; a leitura pública dispensa cadastro. Plataformas como Wattpad, Spirit Fanfics e MangaToon foram referências conceituais, sem compromisso de reproduzir seus recursos sociais.

## Objetivo

Permitir o percurso de criação de conta, preparação de obra, escrita de capítulos, publicação e leitura pública, com uma biblioteca pessoal para o usuário autenticado. O produto prioriza uma experiência responsiva e simples, adequada ao contexto acadêmico.

## Escopo entregue

| Área | Entrega acessível na interface |
|---|---|
| Conta | Cadastro, autenticação, saída e recuperação/redefinição de senha |
| Perfil | Visualização e edição do próprio nome, username e biografia |
| Autoria | Criação e edição de obras, seleção de gêneros e envio/remoção de capa |
| Capítulos | Criação e edição de texto; publicação e despublicação pelo ateliê |
| Descoberta | Catálogo de obras publicadas e página de detalhes |
| Leitura | Conteúdo em texto simples e navegação entre capítulos publicados |
| Coleção pessoal | Adição e remoção de favoritos e consulta da biblioteca |

Requisitos e critérios verificáveis: [02-Requisitos.md](02-Requisitos.md). Os caminhos concretos estão em [06-Fluxos-de-Usuario.md](06-Fluxos-de-Usuario.md).

## Limitações e fora do escopo

- Não há busca ou filtro de catálogo, página pública dedicada de autor nem progresso de leitura.
- Exclusão de conta não está implementada. Exclusão de obras/capítulos existe como operação técnica, sem controle na interface.
- Avatar não é editável no Perfil. Idioma e situação narrativa também não possuem seletor na interface.
- Capítulos usam texto simples, sem interpretação de HTML/Markdown ou editor rich text.
- O Mock é uma demonstração local e possui diferenças em relação ao backend real; não constitui ambiente seguro de produção.
- A revisão do repositório não comprova a configuração efetivamente aplicada na hospedagem ou no banco remoto.

Avaliações, comentários, seguidores, recomendações, monetização, colaboração entre autores, exportação e offline/PWA permanecem fora da entrega atual. Prioridades de evolução: [08-Backlog-e-Roadmap.md](08-Backlog-e-Roadmap.md).

## Critério de avaliação

A demonstração deve permitir que uma conta crie uma obra, escreva e publique um capítulo, publique a obra e que um visitante a encontre e leia. Deve também demonstrar edição de perfil, favoritos e os estados de erro/acesso relevantes. A existência desse percurso no código não equivale à aprovação integral de regressão: evidências e falhas conhecidas são registradas em [10-Testes.md](10-Testes.md).
