# 10 — Testes

## 1. Objetivo

Definir uma estratégia prática de validação e regressão.

O projeto pode iniciar com testes manuais estruturados e evoluir para automação quando houver benefício claro.

## 2. Tipos de teste

- **Funcional:** requisito funciona.
- **Autorização:** acesso indevido é bloqueado.
- **Responsividade:** interface funciona em larguras diferentes.
- **Integração:** Auth, banco, Storage e frontend funcionam em conjunto.
- **Regressão:** fluxos essenciais continuam funcionando antes de release.

## 3. Casos mínimos

### Autenticação

**T-001 — Cadastro válido**  
Esperado: identidade e perfil criados conforme fluxo.

**T-002 — Cadastro inválido**  
Esperado: não produzir perfil inconsistente.

**T-003 — Login válido**  
Esperado: sessão criada.

**T-004 — Login inválido**  
Esperado: erro adequado sem informação sensível.

**T-005 — Logout**  
Esperado: sessão encerrada e recursos privados indisponíveis.

### Livros

**T-010 — Criar livro**  
Esperado: obra válida criada para o usuário autenticado.

**T-011 — Editar livro próprio**  
Esperado: permitido.

**T-012 — Editar livro alheio**  
Esperado: negado por RLS.

**T-013 — Rascunho não público**  
Esperado: externo não consegue consultar.

**T-014 — Publicar livro**  
Esperado: publicação somente quando critérios forem atendidos.

**T-015 — Excluir livro próprio**  
Esperado: dependências tratadas corretamente.

### Capítulos

**T-020 — Criar capítulo**  
Esperado: vínculo correto e posição atribuída conforme regra.

**T-021 — Ordem**  
Esperado: sequência correta.

**T-022 — Rascunho de capítulo**  
Esperado: privado ao autor.

**T-023 — Publicação de capítulo**  
Esperado: público apenas quando capítulo e livro forem elegíveis.

**T-024 — Navegação anterior/próximo**  
Esperado: respeita capítulos publicados e ordem.

### Biblioteca

**T-030 — Favoritar**  
Esperado: relação criada.

**T-031 — Favoritar repetido**  
Esperado: sem duplicata.

**T-032 — Remover favorito**  
Esperado: relação removida sem alterar livro.

### Busca e gêneros

**T-040 — Filtrar por gênero**  
Esperado: somente obras elegíveis relacionadas.

**T-041 — Busca sem resultado**  
Esperado: estado vazio, não erro.

## 4. Matriz de segurança com dois usuários

| Ação sobre conteúdo de A | Usuário A | Usuário B |
|---|---:|---:|
| Ler livro publicado | permitido | permitido |
| Ler rascunho | permitido | negado |
| Editar livro | permitido | negado |
| Excluir livro | permitido | negado |
| Editar capítulo | permitido | negado |
| Ler favoritos de A | permitido | negado |

Repetir testes afetados quando a Matriz RLS mudar.

Fonte das políticas: `11-Seguranca.md`.

## 5. Responsividade

Validar ao menos:

- mobile pequeno;
- mobile comum;
- tablet;
- desktop.

Verificar:

- overflow;
- navegação;
- formulários;
- cards;
- leitor;
- botões;
- mensagens longas;
- capas.

## 6. Navegadores

Próximo da entrega, validar:

- Chrome/Chromium;
- Firefox;
- Safari quando houver ambiente disponível.

Registrar limitações reais.

## 7. Checklist de regressão

Antes de uma release candidata:

- [ ] cadastro;
- [ ] login;
- [ ] logout;
- [ ] sessão;
- [ ] perfil;
- [ ] criar/editar/excluir/publicar livro;
- [ ] upload de capa;
- [ ] criar/editar/excluir/publicar capítulo;
- [ ] leitura e navegação;
- [ ] busca e gênero;
- [ ] biblioteca;
- [ ] usuário A não altera dados de B;
- [ ] mobile e desktop;
- [ ] 404;
- [ ] console sem erro crítico conhecido;
- [ ] documentação compatível.

O checklist operacional de produção em `12-Deploy-e-Ambientes.md` deve referenciar esta regressão, não duplicá-la.

## 8. Registro de bugs

Registrar:

```text
Título
Versão
Ambiente
Pré-condição
Passos
Resultado atual
Resultado esperado
Evidência
Severidade
```

Preferir GitHub Issues.

## 9. Severidade

- **Crítica:** perda de dados, falha de segurança ou aplicação inutilizável;
- **Alta:** fluxo principal quebrado;
- **Média:** funcionalidade secundária incorreta;
- **Baixa:** problema visual ou inconveniente não bloqueante.

## 10. Integração do editor de capítulos — 0.43.1 em diante

A página `chapter-editor.html` usa o script de Lucas Emmanoel recuperado do PR #44
no commit 0.43.0. A integração mantém esse commit e a página `book-editor.html`.

Validação automatizada, sem dependências adicionais:

```sh
npm run test:chapter-editor
node --check js/pages/chapterEditorPage.js
node --check js/pages/book-editor.js
git diff --check
```

Os testes executam os handlers reais das páginas em um DOM mínimo com services
controlados. Cobrem IDs e assets locais, sessão ausente/expirada, obra indisponível,
estados vazios, falhas retornadas/exceções, respostas fora de ordem, bloqueio durante
save, prevenção de submit duplicado, atualização da lista, preservação de texto em
erro e navegação com `bookId`/`datasource`. Não substituem testes em navegador ou RLS.
O comando `npm test` anterior continua sendo um placeholder que termina com erro.

Contratos conferidos com `14-Contrato-Front-Services.md`, seções 10.2, 10.4 e 10.5,
e com os adapters mock/Supabase: `getChaptersByBook(bookId)`,
`createChapter(bookId, { title, content })` e `updateChapter(id, { title, content })`.
Nenhuma chamada envia posição, status ou campos de autoria. A posição e as
permissões continuam nos services/adapters. A validação de título/conteúdo
obrigatórios já presente no script de Lucas foi mantida; os services permitem
rascunhos incompletos. As restrições de capítulos publicados continuam no backend.

Pendências de teste manual:

- Em mock local e com `?datasource=supabase`, criar uma obra, abrir o editor,
  criar/editar capítulos e voltar ao ateliê com a mesma obra e fonte de dados.
- Repetir T-010, T-011, T-014, T-020, T-021, T-022 e T-023; incluir upload/remoção
  de capa, publicação/retirada de publicação e conteúdo publicado de 499/500/15.000
  caracteres. Conferir persistência após recarregar e os bloqueios existentes.
- Repetir a matriz com autor A, usuário B e visitante no Supabase real; verificar
  que `bookId` alheio não concede acesso e que a sessão expirada não grava dados.
- Simular rede lenta/offline, alternar rapidamente entre obras e salvar durante
  latência. Confirmar mensagens e lista da obra atual. Se o save confirmar e a
  atualização da lista falhar, confirmar o aviso e selecionar novamente a obra.
- Validar em 320px, mobile, tablet e desktop: ausência de overflow, título longo,
  textarea, header/footer, menu, foco visível, ordem de tabulação, skip link,
  labels e anúncios das mensagens com leitor de tela. Conferir Chrome e Firefox.
