# Validação — feedback em Auth e Perfil

Escopo: cartão [S2][P1] Padronizar loading, erro e feedback visual.

## Correções da validação manual — A03, A06, P03 e V01

Arquivos desta correção:

- `js/services/adapters/mock/identityStorage.js`, `authAdapter.js` e
  `profileAdapter.js` na mesma pasta;
- `js/validation/email.js` e `js/pages/recuperarSenhaPage.js`;
- `css/components.css`;
- `tests/helpers/mock-identity.cjs`, `tests/mock-identity.test.cjs`,
  `tests/auth-adapters.test.cjs`, `tests/auth-feedback.test.cjs`,
  `tests/card-layout.html`;
- `docs/mock-auth-perfil-persistencia.md`, `docs/14-Contrato-Front-Services.md`
  e este documento.

Os testes de persistência usam Web Crypto real do Node e recriam os módulos,
compartilhando armazenamento simulado. Cobrem navegação, refresh, nova sessão
sem login automático, fixtures, duplicidade, escrita/leitura indisponíveis,
snapshot corrompido, salts distintos e ausência de senha original serializada.

A fixture `tests/card-layout.html` importa os componentes e estilos reais e
verifica automaticamente contenção, interseções e política nativa de e-mail.
Foi executada no navegador local com 18 cards (Home, Biblioteca e Meus livros),
9 controles de favoritos e mensagens longas: em 320, 360, 390, 768 e 1024 px
houve zero transbordamento dos controles, zero interseções e nenhum overflow
horizontal. Tab/Shift+Tab entre link e botão preservaram foco sólido de 3 px.
Essa fixture não executa ações de favoritos ou gravações. Não substitui uma
validação completa das rotas com contas reais, zoom ou leitor de tela.

### Repetição manual

Usar sempre a mesma origem local (protocolo, host e porta) e fonte Mock. No
servidor que converte `.html` para rotas limpas, abrir diretamente as rotas
limpas para evitar perder a query no redirect.

1. **A03:** cadastrar conta fictícia; navegar para Perfil e recarregar. Fechar
   todas as janelas do contexto de sessão, abrir novamente e confirmar que
   precisa entrar. Fazer login com a conta criada e conferir o perfil. Uma aba
   duplicada pode copiar a sessão e não serve como teste de sessão nova.
2. **P03:** alterar nome, username e biografia; salvar, navegar e recarregar.
   Conferir os três campos e a identidade retornada por `getCurrentUser()`.
   Repetir com fixture. Tentar username já ocupado deve falhar sem alterar dados.
3. **Falha de armazenamento:** em contexto descartável, usar harness com
   armazenamento que lance erro em `setItem` (os testes automatizados já fazem
   isso). Cadastro/save devem informar erro, mantendo o snapshot anterior. Não
   usar edição de credenciais de produção ou indisponibilidade do Supabase.
4. **A06:** tentar `invalido` e `a@-b` (erro local); depois `a@b`, endereço
   conhecido e válido inexistente (mesma confirmação de simulação, sem envio).
5. **V01:** abrir `/tests/card-layout?datasource=mock`, variar as cinco larguras
   e conferir `passed: true`. Na Home, Biblioteca e Meus livros, verificar duas
   linhas de cards, mensagens longas e navegação por Tab/Shift+Tab, sem cortar
   botões ou encobrir o card seguinte.

Persistência e limites de segurança: [contrato do Mock](mock-auth-perfil-persistencia.md).

## Arquivos alterados

- HTML: `login.html`, `cadastro.html`, `recuperar-senha.html`,
  `redefinir-senha.html`, `perfil.html`.
- Estilos: `css/components.css`, `css/styles.css`, `css/user-pages.css`.
- Helpers: `js/components/feedback.js`.
- Páginas: `js/pages/loginPage.js`, `js/pages/cadastroPage.js`,
  `js/pages/recuperarSenhaPage.js`, `js/pages/redefinirSenhaPage.js`,
  `js/pages/profilePage.js`.
- Autenticação: `js/services/authService.js`,
  `js/services/adapters/mock/authAdapter.js`,
  `js/services/adapters/supabase/authAdapter.js`.
- Testes: `tests/auth-adapters.test.cjs`, `tests/auth-feedback.test.cjs`,
  `tests/favorites-page.test.cjs` (adaptação do stub de validação no caso de login).
- Documentação: `docs/07-Design-System.md`,
  `docs/14-Contrato-Front-Services.md` e este documento.

## Automatizada, sem rede

Executar `npm test`. Os testes de Auth e Perfil exercitam helpers e páginas
reais com DOM mínimo e services simulados; os adapters usam fixtures e cliente
Supabase simulado. Há verificação de ligação dos imports reais sem executar o
SDK remoto. Isso não equivale a teste visual ou integração com Supabase.

Cobertura: validação/foco/limpeza de erros dependentes, região viva estável,
preservação de descrições, processamento e envio duplicado, mensagens de cadastro
com/sem sessão, recuperação neutra, redefinição com sessão inválida/expirada,
senha recusada e erros de rede, bloqueios de carga/save/Cancelar do Perfil,
redirecionamento somente sem autenticação, remoção dos placeholders e retry.

## Pendente: navegador e tecnologia assistiva

- Nas cinco páginas, validar em 320, 360, 390, 768 e 1024 px e zoom de 200%:
  mensagens longas sem cortes/overflow, áreas de toque e foco visível.
- Usar somente teclado: erro leva ao primeiro campo inválido; correção limpa
  erro e associação; confirmação de senha é revalidada quando a senha muda.
- Com leitor de tela, verificar anúncio único de progresso/resultado, leitura
  do erro ao focar o campo e ausência de anúncios redundantes.
- Com rede lenta/offline, verificar bloqueios, valores preservados e retry;
  no Perfil, Cancelar não atua durante salvamento. Sessão ausente deve levar ao
  login; falha temporária de rede deve permanecer na página com mensagem.
- Validar contraste visual, modo de alto contraste e movimento reduzido;
  o texto deve continuar explicando cada estado sem depender da cor/spinner.
- Mock: autenticar com fixture, abrir redefinição na mesma aba e confirmar
  a persistência do verificador ao navegar/recarregar. Abrir sem sessão deve
  bloquear o formulário. Solicitar recuperação com endereços conhecidos e
  desconhecidos deve apresentar a mesma confirmação.

## Pendente: integração real, fora da execução desta correção

Não executada. Validar separadamente em ambiente autorizado: recebimento do
e-mail, URL de redirect permitida no Supabase, sessão pelo link válido, links
inválidos/expirados, política de senha e login com a senha alterada. Conferir
cadastro com confirmação de e-mail habilitada/desabilitada. Não usar contas de
produção nem registrar tokens. Logout não faz parte deste cartão.
