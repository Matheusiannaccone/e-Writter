# 09 — Git e Versionamento

## Branches e integração

`main` representa o estado integrado. A convenção do projeto é trabalhar em branches focadas, como `feature/<descricao>`, `fix/<descricao>`, `docs/<descricao>` e `refactor/<descricao>`, e integrar por Pull Request. Esta auditoria ocorre em `docs/documentacao-final`.

Fluxo esperado: atualizar a base, criar/usar branch de trabalho, implementar, revisar o diff, validar, publicar a branch, abrir PR, obter revisão e integrar. Desenvolvimento direto na `main` não é o procedimento da equipe.

Essas são convenções do projeto; a configuração de proteções do GitHub não foi verificada nesta auditoria.

## Commits

Utilizar mensagens claras e mudanças focadas. Os tipos seguem a terminologia de Conventional Commits:

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidade |
| `fix` | Correção |
| `docs` | Documentação |
| `style` | Formatação/apresentação sem mudança lógica relevante |
| `refactor` | Reorganização sem mudança de comportamento pretendida |
| `test` | Testes |
| `chore` | Manutenção/configuração |

O formato convencional é `tipo: descrição`. O histórico do projeto também usa o prefixo local `MAJOR.MINOR.PATCH - tipo: descrição`; esse prefixo não faz parte da sintaxe estrita de Conventional Commits. Ao manter a convenção histórica, não tratá-lo como prova automática de release ou versão do pacote.

Antes de registrar uma mudança, revisar `git status`, diff, escopo e validação; não incluir credenciais nem misturar tarefas independentes.

## Pull Requests e revisão

Todo merge esperado na `main` passa por PR com problema resolvido, resultado, validação e limitações. Mudanças visuais devem apresentar evidência adequada. A revisão deve ser feita por pelo menos um integrante diferente do autor; mudanças sensíveis podem demandar revisão adicional.

O revisor confere escopo, comportamento, autorização, regressão e documentação afetada. Quando houver ajustes relevantes depois da aprovação, solicitar nova revisão. Não presumir que aprovação textual substitui os checks existentes.

## Conflitos

O autor da branch conduz a resolução: compreender as duas alterações, atualizar a base, preservar ambos os requisitos aplicáveis e repetir os testes afetados. Não escolher automaticamente um lado nem resolver conflitos diretamente na `main`. Havendo dúvida de intenção, alinhar com o autor da outra mudança antes da integração.

## Versões

Semantic Versioning utiliza `MAJOR.MINOR.PATCH`:

| Parte | Significado |
|---|---|
| MAJOR | Mudança incompatível relevante |
| MINOR | Funcionalidade compatível |
| PATCH | Correção/ajuste compatível |

O desenvolvimento anterior ao MVP usou `0.x.y`; o primeiro marco estável é `1.0.0`. O pacote permanece nessa versão. O commit posterior de documentação foi nomeado `1.0.1`, mas não atualizou `package.json`. Distinguir nome de commit, versão do pacote, tag e release ao preparar uma publicação.

## Tags, releases e rastreabilidade

Após revisão e validação de uma versão apresentável, uma tag anotada como `v1.0.0` pode identificar o commit exato; uma release pode reunir descrição e evidências. A criação/publicação é uma ação de integração deliberada, não parte automática de uma edição documental.

Não há tags locais no checkout auditado; não se afirma ausência de tags remotas. Antes de publicar, verificar qual commit, versão do pacote e artefato estão sendo associados. Evitar mover tags já publicadas sem coordenação.

## Proteções recomendadas

Quando disponíveis, exigir PR, aprovação e checks adequados, bloquear push direto na branch principal e evitar autoaprovação. Essas proteções são recomendações, não uma declaração de que já estão configuradas.

Execução local/deploy pertence a [12-Deploy-e-Ambientes.md](12-Deploy-e-Ambientes.md); validação pertence a [10-Testes.md](10-Testes.md). O histórico de PRs e commits específicos é consultado no Git/GitHub, sem reprodução cronológica neste guia.
