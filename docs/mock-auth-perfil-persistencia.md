# Persistência de Auth e Perfil Mock

Os services públicos não mudam. `identityStorage.js` é uma dependência exclusiva
dos adapters Mock de Auth e Perfil. Não acessa o Supabase ou as chaves de livros,
capítulos e favoritos.

## Dados e sessão

- `localStorage["e-writter-mock-identity-v1"]`: snapshot com `version: 1`, contas
  projetadas (`id`, `email`, `verifier`) e perfis. Nunca serializa `mockUsers` ou
  o campo `password` dos fixtures. O verificador usa Web Crypto, PBKDF2/SHA-256,
  210.000 iterações, salt aleatório de 16 bytes por senha e resultado de 256 bits.
- `sessionStorage["e-writter-mock-user"]`: somente `{ id }`. Aceita snapshots
  antigos com `id`, mas reconstrói nome/username a partir do perfil atual.
- Cada leitura hidrata e valida as contas/perfis antes de restaurar a sessão.
  Navegação e refresh na mesma aba preservam a autenticação. Nova sessão de
  navegador mantém as contas/perfis, mas exige login. Abas duplicadas podem
  herdar `sessionStorage` pelo comportamento do navegador; não equivalem a um
  contexto de sessão novo.
- Contas fixture continuam aceitando as senhas públicas dos fixtures enquanto
  não tiverem um verificador persistido. Senhas alteradas na demonstração passam
  a usar verificador e sobrevivem a reload, inclusive para fixtures.
- IDs de novas contas usam `crypto.randomUUID()`. E-mails são comparados sem
  diferenciar maiúsculas/minúsculas; usernames continuam minúsculos e únicos.

## Gravação e falhas

A derivação ocorre antes da transação. A gravação relê o estado mais recente,
revalida unicidade e só retorna sucesso após `localStorage.setItem`. O estado
alterado não modifica os fixtures em memória antes da confirmação. Web Locks
serializa gravações entre abas quando disponível; sem essa API, não há garantia
de transações simultâneas entre abas independentes.

Falhas de leitura, quota, JSON corrompido e versões incompatíveis geram erro
estruturado (`UNKNOWN_ERROR`) sem apagar ou sobrescrever os dados existentes.
Falha de gravação preserva o estado anterior. Não existe fallback silencioso
que anuncie salvamento somente em memória.

Cadastro grava a conta antes de iniciar a sessão. Se apenas `sessionStorage`
falhar, a conta já estará salva: a resposta informa explicitamente que não foi
possível iniciar a sessão, permitindo login após desbloquear o armazenamento.
Não há transação atômica entre as duas APIs de armazenamento.

## Recuperação e segurança

A política de sintaxe é compartilhada em `js/validation/email.js` e segue a
gramática ASCII do campo HTML de e-mail, inclusive domínio sem ponto (`a@b`).
Não verifica DNS nem existência da conta. Para qualquer endereço aceito, o Mock
retorna a mesma mensagem de simulação, sem consultar a conta, enviar e-mail ou
criar uma sessão. A redefinição exige sessão de demonstração já autenticada.

Este Mock não oferece segurança equivalente a um backend: dados e sessão podem
ser inspecionados/alterados por scripts da origem ou pelo usuário; verificadores
podem sofrer tentativa de adivinhação offline e não há controle servidor de
acesso ou tentativas. Usar somente dados e senhas fictícios. Web Crypto exige
contexto seguro (HTTPS ou localhost). Limpar os dados da origem remove contas
criadas e alterações; mudar protocolo/host/porta usa outro armazenamento.

Cadastros perdidos pela implementação anterior não podem ser recuperados.
Não há migração de senhas em texto simples, envio de e-mail real ou mudança no
fluxo de logout nesta correção.
