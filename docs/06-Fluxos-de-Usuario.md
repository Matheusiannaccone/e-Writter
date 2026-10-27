# 06 — Fluxos de Usuário

## Páginas existentes

| Página | Uso |
|---|---|
| [index.html](../index.html) | Catálogo público |
| [detalhes-obra.html](../detalhes-obra.html) | Dados da obra e capítulos publicados; parâmetro `id` da obra |
| [chapter.html](../chapter.html) | Leitor; parâmetro `id` do capítulo |
| [cadastro.html](../cadastro.html) e [login.html](../login.html) | Entrada na conta |
| [recuperar-senha.html](../recuperar-senha.html) e [redefinir-senha.html](../redefinir-senha.html) | Recuperação de acesso |
| [perfil.html](../perfil.html) | Dados da própria conta |
| [meuslivros.html](../meuslivros.html) | Obras próprias, publicadas ou em rascunho |
| [book-editor.html](../book-editor.html) | Ateliê de metadados, capa e publicação |
| [chapter-editor.html](../chapter-editor.html) | Escrita/edição de capítulos |
| [biblioteca.html](../biblioteca.html) | Favoritos da conta |

## Descobrir e ler

1. O visitante abre o catálogo e seleciona um card.
2. Os detalhes consultam a obra por `id`, exibem sua sinopse e capítulos publicados ordenados.
3. “Iniciar Leitura” abre o primeiro capítulo disponível; os links numerados abrem o capítulo escolhido.
4. O leitor apresenta texto simples, anterior/próximo e retorno à obra. A navegação usa apenas os capítulos publicados.

Sem ID, conteúdo indisponível ou rascunho, a página apresenta indisponibilidade. Falha temporária pode oferecer nova tentativa. Capa ou perfil de autor indisponível têm apresentação alternativa. Não há busca, filtro ou registro de progresso neste percurso.

## Cadastrar, entrar e sair

No Cadastro, preencher nome, username, e-mail, senha e confirmação. A página informa sessão ativa quando o resultado contém sessão; caso contrário, orienta confirmar o e-mail. O fluxo normal não insere perfil separadamente na interface.

No Login, credenciais aceitas levam à Biblioteca. Erros mantêm o formulário disponível para correção. O menu de conta, nas páginas que o montam, oferece Perfil, Meus Livros e Sair. As quatro páginas de autenticação usam sua composição própria e não montam o cabeçalho global no HTML atual.

Sair bloqueia duplicação, limpa dados privados das páginas e atualiza o estado de conta. Uma falha permite tentar novamente e não é apresentada como saída concluída. Voltar/Avançar exige revalidação; uma resposta antiga não deve restaurar dados da conta anterior. O logout não apaga contas, obras ou favoritos.

## Recuperar e redefinir senha

1. No Login, abrir recuperação e informar e-mail sintaticamente válido.
2. O formulário apresenta resultado neutro no Supabase e reserva um prazo de 60 segundos compartilhado na origem, inclusive após mudar o e-mail ou recarregar.
3. Sucesso ou limite de envio mantém o prazo; outras falhas liberam a própria reserva e permitem nova tentativa. Não há reenvio automático.
4. No backend real, acessar a página de nova senha pelo redirect do Auth. Campos ficam bloqueados até o adapter aceitar a sessão; link/sessão inválidos não liberam a escrita.
5. Informar e confirmar a senha; depois do sucesso, a página limpa os campos e bloqueia repetição do envio.

No Mock não há e-mail nem link que autentique uma conta. Para demonstrar redefinição, entrar com uma conta fictícia e abrir a página na mesma aba. Configuração de redirects e limites: [12-Deploy-e-Ambientes.md](12-Deploy-e-Ambientes.md).

## Consultar e editar Perfil

O Perfil carrega usuário e dados próprios antes de liberar os campos. Permite editar nome, username e biografia; Cancelar restaura o último estado confirmado. E-mail é exibido sem edição e o avatar é um símbolo estático.

Sessão ausente redireciona ao Login com `next=perfil.html`; o Login atual conclui sempre na Biblioteca, sem consumir esse `next`. Falha temporária de carga oferece tentativa na própria página.

## Criar e editar obra

1. Abrir Ateliê ou “Escrever um livro” em Meus Livros.
2. Usar “Nova obra”, informar título e selecionar os gêneros.
3. Adicionar descrição e capa se desejado; salvar cria um rascunho.
4. Para editar, selecionar obra própria no ateliê ou abrir um card em Meus Livros.
5. Salvar metadados e, se houver, aguardar envio/remoção da capa. Uma falha de imagem informa que a obra já foi salva.

O parâmetro canônico do editor é `bookId`; o ateliê ainda aceita `book` legado, usado pelos cards de Meus Livros. A seleção só é aceita entre as obras retornadas para a conta. Não há controles de exclusão, idioma ou andamento narrativo.

## Escrever capítulos

Com obra persistida e alterações salvas, abrir “Escrever capítulos”. O editor confirma a obra entre as próprias, carrega a lista e permite novo rascunho ou edição de capítulo existente.

O formulário exige título e conteúdo não vazios e limita o texto; salvar não publica. Após confirmação, recarrega a lista e volta ao modo de novo rascunho. Se a gravação ocorrer, mas a recarga falhar, a mensagem diferencia esses resultados. Trocar de obra invalida respostas atrasadas da seleção anterior.

O retorno ao ateliê mantém o contexto de obra. Sem `bookId`, nenhuma obra é selecionada automaticamente, mesmo que exista apenas uma. Não há ação de excluir ou reordenar capítulos.

## Publicar e retirar de publicação

As ações ficam no painel de publicação do ateliê, não no formulário de escrita de capítulos. O painel mostra estado, impedimentos e uma confirmação antes de publicar/despublicar.

Primeiro publicar capítulo elegível; depois publicar a obra elegível. Uma obra em rascunho mantém seus capítulos fora da leitura pública mesmo se marcados como publicados. Alterações pendentes precisam ser salvas.

A interface bloqueia retirar o único capítulo publicado de uma obra publicada e orienta retirar a obra primeiro. Após qualquer mutação, reconsulta obra/capítulos porque o backend pode alterar vários registros. Regras: [03-Regras-de-Negocio.md](03-Regras-de-Negocio.md). Diferença da cascata entre fontes: [14-Contrato-Front-Services.md](14-Contrato-Front-Services.md).

## Favoritar e organizar a Biblioteca

Controles no catálogo, detalhes e leitor consultam a relação pessoal. Sem sessão, pedem entrada; com sessão, permitem adicionar/remover. O resultado só atualiza a interface se ainda pertencer à mesma sessão.

A Biblioteca lista os registros válidos com cards e remoção própria. Remover atualiza contagem e foco sem recarregar a página inteira; o último removido leva ao estado vazio. Falhas conservam o card e permitem nova tentativa. Registros sem obra acessível ou inválidos podem ser omitidos com aviso; não se presume que todo favorito persistido seja exibido/removível pela tela.

## Estados transversais

Carregamento, vazio, falha, sessão ausente e conteúdo indisponível são estados distintos. Campos inválidos recebem indicação e foco conforme o formulário. Operações em andamento bloqueiam ações concorrentes relevantes; perda de sessão limpa conteúdo privado.

Os links preservam `datasource` quando reconhecido, mas o formato de rota tem limitações conhecidas em servidores com redirecionamento de `.html`. Não há garantia geral de adaptação a rotas limpas. Consulte [12-Deploy-e-Ambientes.md](12-Deploy-e-Ambientes.md) e [10-Testes.md](10-Testes.md).
