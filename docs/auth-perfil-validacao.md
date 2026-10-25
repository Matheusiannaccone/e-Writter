# Validação — feedback em Auth e Perfil

Escopo: cartão [S2][P1] Padronizar loading, erro e feedback visual.

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
  a indicação de que a alteração é apenas em memória. Abrir sem sessão deve
  bloquear o formulário. Solicitar recuperação com endereços conhecidos e
  desconhecidos deve apresentar a mesma confirmação.

## Pendente: integração real, fora da execução desta correção

Não executada. Validar separadamente em ambiente autorizado: recebimento do
e-mail, URL de redirect permitida no Supabase, sessão pelo link válido, links
inválidos/expirados, política de senha e login com a senha alterada. Conferir
cadastro com confirmação de e-mail habilitada/desabilitada. Não usar contas de
produção nem registrar tokens. Logout não faz parte deste cartão.
