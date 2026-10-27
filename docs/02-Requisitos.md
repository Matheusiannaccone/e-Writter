# 02 — Requisitos

## Convenções e evidência

Os identificadores RF/RNF anteriores são preservados para rastreabilidade. A situação descreve o código do MVP `1.0.0`, não a prioridade do planejamento original.

- **Implementado:** fluxo ou mecanismo correspondente existe no repositório; não significa aprovação de todos os testes.
- **Parcial:** há suporte técnico ou parte do comportamento, mas o requisito completo não está acessível/garantido.
- **Pós-MVP:** não entregue como funcionalidade atual.
- **Verificação externa:** depende de infraestrutura ou aceite que o checkout não comprova.

Regras completas pertencem a [03-Regras-de-Negocio.md](03-Regras-de-Negocio.md); evidências e limitações de validação, a [10-Testes.md](10-Testes.md).

## Conta e perfil

| ID | Requisito e critério verificável | Situação |
|---|---|---|
| RF-001 | Cadastrar conta com dados válidos e obter resultado com usuário/sessão ou orientação de confirmação. | Implementado |
| RF-002 | Entrar com credenciais válidas e abrir a Biblioteca; credenciais inválidas exibem erro. | Implementado |
| RF-003 | Sair pelo menu e limpar dados privados da interface sem apagar a conta. | Implementado |
| RF-004 | Solicitar recuperação e redefinir senha com sessão aceita; Mock informa simulação sem envio. | Implementado; entrega real de e-mail exige verificação externa |
| RF-005 | Consultar e editar nome de exibição, username e bio do próprio perfil. | Implementado |
| RF-006 | Solicitar exclusão definitiva da conta. | Pós-MVP; sem interface/service/fluxo administrativo |
| RF-007 | Escolher excluir ou preservar obras ao excluir a conta. | Pós-MVP; decisão histórica preservada no ADR-016 |
| RF-008 | Enviar/remover avatar e visualizar a imagem no Perfil. | Parcial; service existe, interface usa símbolo estático |

## Obras

| ID | Requisito e critério verificável | Situação |
|---|---|---|
| RF-010 | Criar obra própria com título e seleção válida de gêneros no ateliê. | Implementado |
| RF-011 | Selecionar e editar uma obra própria; não selecionar obra alheia por URL. | Implementado |
| RF-012 | Excluir obra própria pela interface, tratando dependências. | Parcial; `deleteBook` existe, sem controle na interface |
| RF-013 | Manter rascunho sem descrição, capa ou capítulos. | Implementado |
| RF-014 | Publicar obra elegível pelo painel de publicação. | Implementado |
| RF-015 | Definir título e descrição. | Implementado |
| RF-016 | Enviar, substituir e remover capa opcional da obra já salva. | Implementado |
| RF-017 | Associar gêneros controlados desde a criação. | Implementado |
| RF-018 | Exibir apenas obras publicadas no catálogo. | Implementado |
| RF-019 | Listar obras próprias em rascunho na área de autoria. | Implementado |
| RF-019A | Bloquear publicação sem os critérios da RN-019C. | Implementado |
| RF-019B | Distinguir andamento narrativo e visibilidade e permitir sua classificação. | Parcial; dados/API existem, sem seletor de andamento na interface |
| RF-019C | Exibir “Autor desconhecido” para obra preservada após exclusão da conta. | Pós-MVP; fluxo ausente e fallback atual é “Autor não informado” |
| RF-019D | Descontinuar automaticamente obra não concluída preservada após exclusão da conta. | Pós-MVP; não há automatismo correspondente |
| RF-019E | Impedir criação persistida de obra sem título ou gêneros válidos. | Implementado; integridade do banco descrita em 05 |
| RF-019F | Retirar obra própria do catálogo voltando-a a rascunho. | Implementado |

## Capítulos

| ID | Requisito e critério verificável | Situação |
|---|---|---|
| RF-020 | Criar capítulo de uma obra própria pelo editor. | Implementado |
| RF-021 | Editar título e conteúdo de capítulo próprio. | Implementado |
| RF-022 | Excluir capítulo e todos os posteriores pela interface. | Parcial; `deleteChapter` existe, sem controle na interface |
| RF-023 | Salvar capítulo em rascunho abaixo do mínimo de publicação. | Implementado; a interface exige título e conteúdo não vazios, embora o adapter aceite incompletos |
| RF-024 | Publicar capítulo elegível no ateliê da obra. | Implementado |
| RF-025 | Manter posição inteira positiva, única e crescente na sequência da obra. | Implementado; não há reordenação livre |
| RF-026 | Ocultar rascunhos de terceiros e conteúdo de obra não publicada. | Implementado |
| RF-027 | Exigir os critérios da RN-026 para publicação e edição de capítulo publicado. | Implementado |
| RF-028 | Acrescentar novo capítulo ao final. | Implementado |
| RF-029 | Impedir escolha manual de posição, inserção intermediária e reordenação. | Implementado |
| RF-029A | Retirar capítulo de publicação pelo ateliê. | Implementado; diferença Mock/Supabase documentada no contrato |

## Descoberta e coleção pessoal

| ID | Requisito e critério verificável | Situação |
|---|---|---|
| RF-030 | Apresentar obras publicadas na página inicial. | Implementado |
| RF-031 | Abrir detalhes de obra publicada sem exigir login. | Implementado |
| RF-032 | Listar capítulos publicados nos detalhes. | Implementado |
| RF-033 | Ler capítulo publicado de obra publicada como visitante. | Implementado |
| RF-034 | Navegar para capítulo anterior/próximo publicado quando existir. | Implementado |
| RF-035 | Buscar obra por texto no catálogo. | Pós-MVP; sem interface/service de busca |
| RF-036 | Filtrar ou navegar pelo catálogo por gênero. | Pós-MVP; associação de gêneros não equivale a filtro |
| RF-037 | Adicionar/remover favorito e consultar biblioteca da conta. | Implementado; relações indisponíveis podem ser omitidas pela interface |

## Recursos futuros

| ID | Requisito | Situação |
|---|---|---|
| RF-040 | Histórico de leitura. | Pós-MVP |
| RF-041 | Continuar do último capítulo/ponto lido. | Pós-MVP |
| RF-042 | Curtidas ou avaliações. | Pós-MVP |
| RF-043 | Comentários. | Pós-MVP |
| RF-044 | Página pública dedicada de autor. | Parcial; consultas de perfil/autoria existem, página não |
| RF-045 | Seguidores. | Pós-MVP |
| RF-046 | Ranking de popularidade. | Pós-MVP |
| RF-047 | Recomendações por interesse. | Pós-MVP |
| RF-050 | Leitura offline. | Pós-MVP |
| RF-051 | Instalação como PWA. | Pós-MVP |
| RF-052 | Exportação de conteúdo. | Pós-MVP |

## Requisitos não funcionais

| ID | Critério verificável | Situação |
|---|---|---|
| RNF-001 | Frontend em HTML, CSS e JavaScript sem framework. | Implementado; restrição acadêmica |
| RNF-002 | Código mantido em Git. | Implementado |
| RNF-003 | Repositório identificado no GitHub. | Implementado no contexto do projeto |
| RNF-004 | Hospedagem na Vercel. | Decisão vigente; configuração/estado remoto exigem verificação externa |
| RNF-005 | Versões no formato `MAJOR.MINOR.PATCH`. | Convenção vigente; identificação das versões em 09 |
| RNF-010 | Layout responsivo com base adequada a telas pequenas. | Implementado; evidências delimitadas em 10 |
| RNF-011 | Navegação principal utilizável em tela pequena. | Parcial; menu existe, mas quatro páginas de Auth não possuem o container global esperado pelo teste |
| RNF-012 | Leitor com coluna limitada e tipografia própria. | Implementado |
| RNF-013 | Componentes equivalentes compartilham padrões visuais. | Parcial; cards/helpers compartilhados, composições e cabeçalhos não uniformes |
| RNF-014 | Estados de carga, erro, sucesso e vazio quando aplicáveis. | Implementado nos fluxos principais |
| RNF-015 | Identificar autoria removida e descontinuação automática após exclusão da conta. | Pós-MVP; depende do fluxo de exclusão |
| RNF-020 | Escrita/personalização autenticada e leitura publicada anônima. | Implementado em código e políticas versionadas |
| RNF-021 | Autorização independente dos botões da interface. | Implementado em adapters/RLS/policies |
| RNF-022 | RLS nas tabelas expostas. | Implementado nas migrations; aplicação remota não certificada nesta auditoria |
| RNF-023 | Ausência de credenciais privilegiadas no frontend. | Cliente usa configuração pública; não houve auditoria de todo o histórico Git |
| RNF-024 | Renderizar conteúdo de usuário como texto e reduzir XSS. | Implementado nos fluxos inspecionados; não equivale a auditoria exaustiva |
| RNF-025 | Restringir tipo/tamanho e propriedade dos uploads. | Implementado no adapter Supabase e nas políticas de Storage versionadas |
| RNF-026 | Excluir identidade de Auth por mecanismo administrativo protegido. | Pós-MVP; mecanismo não implementado |
| RNF-030 | PostgreSQL como persistência do backend real. | Implementado |
| RNF-031 | Chaves estrangeiras nas relações essenciais. | Implementado |
| RNF-032 | Validar UX e repetir garantias críticas na persistência. | Implementado no backend; Mock possui limitações próprias |
| RNF-033 | Índices justificados por consultas reais. | Parcial; há índices de PK/UNIQUE, sem índices adicionais explícitos |
| RNF-034 | Modelo admite obra com autoria nula após remoção de perfil. | Implementado na FK; não entrega exclusão de conta |
| RNF-035 | Proteger vínculos, posição e publicação. | Implementado nas migrations; diferenças do Mock em 14 |
| RNF-040 | Organizar JavaScript por responsabilidade. | Implementado |
| RNF-041 | Reutilizar componentes e reduzir duplicações. | Implementado parcialmente; não implica ausência total de duplicação |
| RNF-042 | Registrar decisões arquiteturais. | Implementado em 13 |
| RNF-043 | Atualizar documentação ao mudar escopo. | Processo permanente; esta auditoria sincroniza a referência atual |
| RNF-050 | Compatibilidade com Chromium, Firefox e Safari. | Parcial; há evidência histórica de Chrome, sem certificação completa dos demais |
| RNF-051 | Layout funcional em mobile, tablet e desktop. | Implementado com validação parcial registrada em 10 |
| RNF-052 | Fluxos principais independentes de hover. | Implementado com links, botões e formulários |

## Alteração de requisitos

Preservar os IDs existentes; adicionar novos IDs sem reutilizar os antigos. Mudanças de escopo devem indicar situação, critério de aceite e documentos afetados. Restrições acadêmicas não são removidas por ausência de implementação. Uma decisão aceita pode continuar pendente: [13-Decisoes-Tecnicas.md](13-Decisoes-Tecnicas.md).
