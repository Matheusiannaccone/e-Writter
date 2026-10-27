# 03 — Regras de Negócio

## Âmbito

Esta é a referência das regras funcionais implementadas no MVP. Schema e mecanismos de integridade estão em [05-Modelo-de-Dados.md](05-Modelo-de-Dados.md), autorização em [11-Seguranca.md](11-Seguranca.md) e diferenças entre fontes em [14-Contrato-Front-Services.md](14-Contrato-Front-Services.md). A disponibilidade na interface é classificada em [02-Requisitos.md](02-Requisitos.md).

## Conta e autoria

| Regra | Comportamento atual |
|---|---|
| RN-001 | Uma conta pode ler e escrever; não há tipo separado de escritor. |
| RN-002, RN-013 | A criação de obra pelo fluxo autenticado vincula a autoria à conta. O schema admite autoria nula, sem oferecer fluxo de exclusão de conta. |
| RN-003, RN-004 | Somente o autor altera/exclui a obra e seus capítulos; a propriedade do capítulo deriva da obra. Exclusões técnicas não têm controle na interface atual. |
| RN-005 | Perfil público e identidade de Auth são conjuntos distintos. O e-mail exibido no Perfil vem da própria sessão. |
| RN-008 | Uma obra com autoria nula não pode ser assumida por outro usuário comum. |

Cadastro pode concluir com sessão ou exigir confirmação por e-mail, conforme o ambiente. Recuperação Mock apenas informa simulação; redefinição exige uma sessão de demonstração já autenticada. Sair encerra a sessão, preservando a conta e os dados persistidos. Detalhes operacionais das jornadas: [06-Fluxos-de-Usuario.md](06-Fluxos-de-Usuario.md).

## Obras e gêneros

| Regra | Comportamento atual |
|---|---|
| RN-010 | `draft` e `published` controlam visibilidade editorial. |
| RN-011 | Rascunhos ficam fora do catálogo; o autor consulta suas próprias obras. |
| RN-012 | Publicar ou retirar de publicação exige autoria e autenticação. |
| RN-014 | Há no máximo um vínculo de autor por obra. |
| RN-015 | O vocabulário de gêneros é administrado pelo projeto; usuários não o ampliam. |
| RN-016 | Capa é opcional; falha de upload pode ocorrer depois de os dados da obra terem sido salvos. |
| RN-017, RN-018 | A criação exige título não vazio e de um a três gêneros válidos e distintos. Descrição, capa e capítulos podem faltar no rascunho. |
| RN-017A | No Supabase, criação da obra e associação inicial dos gêneros constituem uma operação transacional. O Mock não fornece transações do banco. |
| RN-019 | `ongoing`, `completed` e `discontinued` representam andamento narrativo, independente de publicação. Existem no schema/service, sem seletor na interface. |
| RN-019B | Obras novas usam `pt-BR`; não há domínio fechado de idiomas no banco nem seletor na interface. |
| RN-019C | Publicação exige título, descrição não vazia, de um a três gêneros e ao menos um capítulo publicado. Capa continua opcional. |
| RN-019G | Retirar uma obra de publicação muda seu estado para `draft` e limpa a data de publicação, preservando os estados dos capítulos. |

Os critérios de publicação também precisam continuar válidos ao editar conteúdo já publicado no backend. Na interface, alterações pendentes da obra precisam ser salvas antes de publicar; o editor de capítulos só é aberto a partir de obra já persistida e sem alterações pendentes.

## Capítulos

| Regra | Comportamento atual |
|---|---|
| RN-020 | Todo capítulo pertence a uma obra. |
| RN-021, RN-021A | Posições são inteiras positivas e únicas por obra; as operações previstas constroem a sequência a partir de 1. |
| RN-021B | Criação acrescenta ao final; a posição não é fornecida pela página. |
| RN-021C | Não há reordenação, inserção intermediária ou mudança de obra. |
| RN-022 | O adapter aceita rascunho incompleto. O formulário atual exige título e conteúdo não vazios e permite menos de 500 caracteres. |
| RN-023 | Leitura pública exige capítulo e obra publicados. Publicar capítulo de obra em rascunho não o torna público. |
| RN-024 | Excluir uma obra no backend remove os capítulos relacionados. |
| RN-024A | A exclusão técnica de capítulo remove também todos os posteriores por posição; não há ação de exclusão na interface. |
| RN-025 | Anterior/próximo consideram somente capítulos publicados, ordenados por posição; podem saltar posições em rascunho. |
| RN-026 | Publicação exige título não vazio e conteúdo entre 500 e 15.000 caracteres, incluindo espaços. O título não entra na contagem. |
| RN-027 | A edição de um capítulo publicado precisa preservar seus critérios de publicação. |
| RN-028 | A interface bloqueia retirar o único capítulo publicado de uma obra publicada e orienta despublicar a obra primeiro. |

Não há requisito de que todos os capítulos anteriores estejam publicados. No Supabase, a operação técnica de despublicação inclui os capítulos publicados posteriores ao alvo e pode retornar a obra a rascunho se nenhum permanecer publicado. No Mock, somente o alvo muda. O contrato explicita essa diferença e a diferença de contagem Unicode entre JavaScript e PostgreSQL.

## Biblioteca e leitura pública

| Regra | Comportamento atual |
|---|---|
| RN-030 | Um usuário não pode adicionar a mesma obra duas vezes aos favoritos. |
| RN-031, RN-032 | Remover favorito não altera a obra; favoritar não concede autoria. |
| RN-034 | A coleção de favoritos é privada da conta autenticada. |
| RN-035 | Só obras publicadas podem ser adicionadas. A remoção da relação própria não exige que a obra continue pública. |
| RN-040, RN-044 | Catálogo, detalhes e leitor apresentam somente conteúdo publicado elegível; visitantes não precisam entrar. |
| RN-041 | O catálogo apresenta os resultados retornados pelo service, sujeito aos limites do backend; não há paginação na interface. |
| RN-042 | Não há recomendação personalizada ou ranking. Ordenações concretas variam conforme o adapter. |
| RN-043 | Obras podem ter vários gêneros dentro do limite; isso não implementa filtro de catálogo. |
| RN-045 | Escrita e biblioteca exigem autenticação. |

Despublicar uma obra não apaga automaticamente os favoritos existentes. A Biblioteca descarta registros inválidos, duplicados ou sem objeto de obra acessível; nesses casos, pode apresentar aviso. Isso não garante um controle para remover toda relação indisponível.

## Conteúdo e validação

| Regra | Comportamento atual |
|---|---|
| RN-050, RN-053 | Botões ocultos não concedem segurança; credenciais privilegiadas não pertencem ao frontend. Modelo técnico em 11. |
| RN-051, RN-052 | Texto de usuário é tratado como não confiável e os capítulos são renderizados como texto simples. |
| RN-054, RN-055 | Frontend valida para feedback; backend protege integridade e recusa publicação inválida. O Mock não substitui essas garantias. |

## Regras aceitas, mas não entregues

Os IDs abaixo preservam o planejamento de exclusão de conta do ADR-016. **Não descrevem um fluxo existente no MVP.**

| IDs preservados | Intenção de evolução |
|---|---|
| RN-006, RN-070 | Escolha entre excluir e preservar obras ao encerrar a conta. |
| RN-007, RN-073 | Identificação específica de autoria removida; o fallback atual de detalhes/catálogo é “Autor não informado”. |
| RN-009, RN-075 | Exclusão da identidade por mecanismo administrativo protegido. |
| RN-019A, RN-074 | Descontinuar automaticamente obra preservada não concluída. |
| RN-033 | Definir a conservação de favoritos no futuro fluxo completo de preservação. |
| RN-071, RN-072 | Orquestrar dependências e desvincular obras conforme a escolha do autor. A FK existente não implementa essa jornada. |

Histórico e continuação de leitura, comentários, avaliações, offline e demais evoluções estão centralizados em [08-Backlog-e-Roadmap.md](08-Backlog-e-Roadmap.md).
