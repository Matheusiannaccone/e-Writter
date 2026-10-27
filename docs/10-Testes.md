# 10 — Testes

## Estratégia e alcance

A validação combina testes de contrato/adapters, execução dos controladores reais em DOM mínimo, scripts de navegador e cenários manuais de integração. Simular um service não comprova RLS, banco remoto, envio de e-mail ou Storage reais.

Requisitos: [02-Requisitos.md](02-Requisitos.md). Matriz de autorização para os cenários de segurança: [11-Seguranca.md](11-Seguranca.md).

## Execução automatizada

O ambiente desta auditoria usou Node.js `v22.17.1`. A suíte utiliza `node:test`, VM e Web Crypto do Node. O subprocesso do grafo habilita `--experimental-vm-modules` internamente.

```sh
npm test
npm run test:chapter-editor
npm run test:favorites
```

`npm test` executa os 11 arquivos `tests/*.test.cjs`; deixou de ser placeholder. Os comandos específicos são recortes e não substituem o conjunto.

| Suíte em `tests/` | Regra/fluxo validado |
|---|---|
| `auth-adapters.test.cjs` | Recuperação, cadastro, erros de Auth, sessão e encaminhamento pelo service. |
| `auth-feedback.test.cjs` | Validação/foco, processamento, Perfil, redefinição e prazo de recuperação entre abas simuladas. |
| `auth-navigation.test.cjs` | Menu de conta, contexto, saída e presença do cabeçalho nas páginas. |
| `chapter-editor.test.cjs` | Seleção própria, escrita, erros, respostas atrasadas, contexto de URL e perda de sessão. |
| `favorite-session.test.cjs` | Invalidação de favoritos e ciclo dos controles montados. |
| `favorites-page.test.cjs` | Coleção, cards reais, remoção/foco, imagens, navegação e destinos públicos. |
| `logout-session.test.cjs` | Sessão Mock, limpeza, falhas do storage e autenticações pendentes. |
| `mock-identity.test.cjs` | Restauração de contas/perfis, verificadores, conflitos e falhas de persistência. |
| `module-graph.test.cjs` | Sintaxe e ligação dos imports estáticos locais, sem avaliar o SDK real. |
| `session-boundary.test.cjs` | Gerações, troca de identidade, histórico e encerramento de inscrições. |
| `supabase-unpublish.test.cjs` | Autenticação, chamada de RPC e leitura posterior com cliente Supabase simulado. |

Os helpers de [tests/helpers](../tests/helpers/) recriam contextos independentes e storages compartilháveis. Promises controladas reproduzem latência e ordem de respostas; o teste de identidade usa derivação criptográfica real. Não são testes de banco.

## Resultado atual da auditoria

Em **27/10/2026**, sobre o código do commit `e23680d`, `npm test` executou **133 testes: 129 aprovados e 4 falhas**, sem cancelamentos ou testes ignorados. A execução antecedeu as edições Markdown; código e assertions foram preservados.

| Falha | Evidência observada |
|---|---|
| Cabeçalho em todas as páginas — teste 40 | [auth-navigation.test.cjs](../tests/auth-navigation.test.cjs) exige container global; `cadastro.html` não o possui. Login, recuperação e redefinição também usam composição sem esse container. |
| B05 — teste 88 | [favorites-page.test.cjs](../tests/favorites-page.test.cjs) espera `/detalhes-obra` em rota limpa; o helper atual gera `/detalhes-obra.html`. |
| A08 — teste 89 | A mesma suíte espera `/chapter`; o destino atual é `/chapter.html`. |
| Home na raiz — teste 95 | A suíte espera detalhes sem extensão; o destino atual mantém `.html`. |

Os três casos de URL revelam divergência entre testes e implementação; não demonstram, isoladamente, falha em todo servidor estático. Há commits posteriores aos relatórios antigos preservando extensões HTML. A decisão de manter/remover essas expectativas precisa ser tratada em tarefa de código/testes, com o servidor-alvo definido.

Esta revisão não declara a suíte integralmente aprovada nem altera testes para obter aprovação.

## Navegador e fixture visual

| Arquivo | Execução/finalidade |
|---|---|
| [logout-browser.cjs](../tests/logout-browser.cjs) | `npm run test:session-browser`: login, saída, páginas privadas, latência e histórico. |
| [headers-browser.cjs](../tests/headers-browser.cjs) | `node tests/headers-browser.cjs`: cabeçalhos, sessões, links e larguras. |
| [reading-visual-browser.cjs](../tests/reading-visual-browser.cjs) | `node tests/reading-visual-browser.cjs`: detalhes, leitura e imagens de revisão em `tmp/reading-review`. |
| [recovery-cooldown-browser.cjs](../tests/recovery-cooldown-browser.cjs) | `node tests/recovery-cooldown-browser.cjs`: prazo absoluto, recarga, duas abas e falhas simuladas. |
| [card-layout.html](../tests/card-layout.html) | Abrir pelo servidor local: contenção/interseção dos cards e validação sintática de e-mail comparada ao navegador. |

Os quatro scripts exigem Playwright resolvível por Node e Chrome instalado, ou `PLAYWRIGHT_CHROME_EXECUTABLE`. Playwright não é dependência declarada no pacote. Se fornecido externamente, `NODE_PATH` pode apontar para o diretório de pacotes correspondente, sem mudar o projeto.

Os scripts de navegador usam servidor temporário e interceptam o SDK/fontes externos. Não validam CDN, tipografia remota ou Supabase real. Os scripts não foram reexecutados nesta auditoria documental. A fixture monta controles, mas o roteiro visual não equivale a testar mutações reais de favoritos.

## Evidências históricas preservadas

Os resultados abaixo foram relatados durante implementações anteriores. São evidências delimitadas, não uma nova aprovação do checkout atual.

| Origem/marco | Resultado registrado e limite |
|---|---|
| Integração de capítulos, revisão 0.43.5 | 23 testes automatizados aprovados e verificações HTTP locais; o aceite manual anterior tinha 27 aprovações, 2 falhas e 1 pendente no Mock. Supabase não havia sido testado nesse relato. |
| Revisão de Biblioteca 0.44.4/0.44.5 | 47 testes aprovados e diagnóstico de redirects 301 que descartavam query; não houve novo aceite manual nem integração real com Supabase. A implementação de rotas mudou depois. |
| Revisão visual de Auth/Perfil | Fixture com 18 cards, 9 controles e mensagens longas em 320, 360, 390, 768 e 1024px: relatados zero overflow/interseções e foco de 3px por teclado. Não cobriu zoom, leitor de tela ou rotas completas com contas reais. |
| Logout, relatório de 25/10/2026 | 107 testes Node aprovados e script de sessão aprovado em Chrome headless; relatados cenários privados/histórico sem erros JavaScript e sem overflow em 390, 768, 1024 e 1280px. SDK e fontes foram substituídos. `pageshow.persisted` foi disparado deterministicamente, sem comprovar uso nativo de bfcache. |

O Git conserva os relatórios originais e sua proveniência. Foram consolidados aqui os resultados úteis e os limites; listas de arquivos alterados, cartões e logs de branches deixaram de ser guias atuais.

## Regressão manual permanente

Usar ambiente de teste, dados fictícios e duas contas distintas. Registrar ambiente, commit, passos, resultado e evidência; não registrar senhas ou tokens.

| Área | Cenários mínimos |
|---|---|
| Conta | Cadastro válido/inválido, conflito de username, confirmação habilitada/desabilitada conforme ambiente, login, refresh e saída com erro/retry. |
| Recuperação | Endereços conhecidos/desconhecidos, formato inválido, 60s por origem, Enter, troca de e-mail, recarga, duas abas, rede/limite, link válido/expirado e login com senha alterada. |
| Perfil | Carga, edição, cancelamento, conflito, falha de persistência, sessão expirada e logout durante carga/save. |
| Obras/capa | Criação, edição, requisitos de publicação, salvar antes de abrir capítulos, envio/remoção e falha parcial após salvar metadados. |
| Capítulos | Obra correta pelo contexto, vazio, criar/editar, 499/500/15.000 caracteres, Unicode fora do BMP, mudanças rápidas de obra e resposta atrasada. |
| Publicação | Obra/capítulo elegíveis, rascunho invisível, retirada, bloqueio do único capítulo na interface e cascata técnica do Supabase. |
| Leitura | Catálogo → detalhes → capítulo → anterior/próximo, capítulos ocultos, ID ausente/inválido, capa indisponível e erro com retry. |
| Biblioteca | Duplicidade, remoção por teclado, foco após último card, persistência, payload inválido, obra indisponível e troca de conta durante operação. |
| Autorização | Visitante, autor A e usuário B: consultar rascunhos, alterar obras/capítulos, acessar favoritos e escrever em paths de imagem alheios. |
| Ciclo de página | Voltar/Avançar, troca de identidade, expiração e bfcache nativo quando disponível; nenhum resultado privado antigo deve reaparecer. |
| Interface | 320px, mobile comum, tablet, desktop, zoom de 200%, teclado, mensagens longas, foco, contraste, movimento reduzido e leitor de tela. |

Exclusões técnicas de obra/capítulo são validadas no nível service/banco, sem inventar uma ação de interface. Busca, conta excluída e 404 própria não pertencem ao roteiro funcional atual. A matriz RLS é referenciada em 11, sem ser duplicada aqui.

## Limitações e interpretação

Não há nova certificação de Firefox/Safari, tecnologia assistiva, bfcache nativo, e-mail, CDN, banco ou hospedagem remota. Um teste com `datasource=supabase` em URL e service simulado não é integração real. A configuração efetivamente implantada precisa ser confrontada com as migrations em ambiente autorizado.

Falhas devem ser classificadas e investigadas, preservando o resultado anterior à alteração. Para falhas de segurança/perda de dados, priorizar o impacto real; para divergências de teste/rota, registrar a condição do servidor. Nenhuma contagem histórica substitui uma execução atual.
