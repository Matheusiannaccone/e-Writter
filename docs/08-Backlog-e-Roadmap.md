# 08 — Backlog e Roadmap

## Estado do produto

O MVP `1.0.0` foi entregue. A identificação do pacote, dos commits e das releases é tratada em [09-Git-e-Versionamento.md](09-Git-e-Versionamento.md), sem reproduzir aqui o histórico de versionamento.

O produto possui o percurso principal de conta, autoria, publicação, leitura e favoritos. Isso não significa ausência de falhas conhecidas ou equivalência integral entre Mock e Supabase. O estado verificável de cada requisito é mantido em [02-Requisitos.md](02-Requisitos.md).

## Marcos concluídos no código

| Marco | Entrega |
|---|---|
| Fundação | Camadas de páginas, componentes, services e adapters; schema e políticas versionados. |
| Conta | Cadastro, login, logout, recuperação/redefinição e edição de perfil. |
| Autoria | Obras, gêneros, capas e escrita/edição de capítulos. |
| Publicação | Publicar/despublicar obras e capítulos; integridade transacional no Supabase. |
| Leitura | Catálogo, detalhes e leitor com capítulos publicados. |
| Biblioteca | Favoritos pessoais, listagem e remoção. |
| Documentação interna | Comentários técnicos e JSDoc integrados após o marco funcional. |

Não se associam versões intermediárias fictícias a esses marcos. O histórico detalhado permanece no Git; este arquivo não replica cartões do Trello, responsáveis ou prazos.

## Estabilização ainda necessária

As prioridades abaixo são uma organização técnica das lacunas observadas, não um cronograma aprovado.

| Prioridade | Resultado a buscar | Referência oficial |
|---|---|---|
| Alta | Resolver a divergência entre o teste de cabeçalho e as páginas de Auth e decidir/testar o comportamento de rotas `.html` versus limpas. | [10-Testes.md](10-Testes.md) |
| Alta | Confirmar segurança, redirects de recuperação, e-mail e Storage no ambiente real autorizado. | [11-Seguranca.md](11-Seguranca.md) e [12-Deploy-e-Ambientes.md](12-Deploy-e-Ambientes.md) |
| Alta | Resolver a configuração local que referencia seed inexistente e verificar o bootstrap do banco. | [12-Deploy-e-Ambientes.md](12-Deploy-e-Ambientes.md) |
| Média | Reduzir diferenças de persistência, identidade e despublicação entre adapters; avaliar normalização de erros genéricos de autorização. | [14-Contrato-Front-Services.md](14-Contrato-Front-Services.md) |
| Média | Ampliar evidência de acessibilidade, Firefox/Safari, bfcache nativo e fontes reais. | [10-Testes.md](10-Testes.md) |

## Evolução funcional candidata

| Grupo | Recursos fora da entrega atual |
|---|---|
| Completar superfícies existentes | Exclusão de obras/capítulos pela interface, upload/exibição de avatar e seleção de idioma/andamento. |
| Descoberta | Busca básica, filtro por gênero, página pública de autor e posterior busca avançada. |
| Conta | Exclusão protegida com escolha sobre obras; depende de completar o ADR-016 e regras associadas. |
| Leitura | Histórico, continuar lendo e preferências de apresentação. |
| Social | Avaliações, comentários, seguidores, ranking e recomendações. |
| Plataforma | PWA/offline, exportação, notificações, moderação e colaboração entre autores. |

A existência de FK, campo ou service isolado não conclui essas jornadas. Qualquer evolução deve definir critérios, efeitos nos dados e autorização antes da implementação. As decisões aceitas ainda não entregues continuam rastreáveis em [13-Decisoes-Tecnicas.md](13-Decisoes-Tecnicas.md).

## Condição de conclusão de uma evolução

Para cada mudança, exigir comportamento verificável, revisão de impacto, regressão proporcional e atualização dos documentos responsáveis. O controle operacional continua no Trello; o fluxo de integração está em [09-Git-e-Versionamento.md](09-Git-e-Versionamento.md).
