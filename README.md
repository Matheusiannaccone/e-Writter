# e-Writter

Plataforma acadêmica de escrita e leitura de obras organizadas em capítulos, desenvolvida para a disciplina de Web Design. Uma conta pode atuar como leitora e autora; conteúdo publicado pode ser lido sem login.

A versão do MVP em `package.json` é **1.0.0**. O histórico contém um commit documental posterior identificado como `1.0.1`; a distinção entre pacote, commit e release está em [09-Git-e-Versionamento.md](docs/09-Git-e-Versionamento.md).

## Funcionalidades disponíveis

- Cadastro, login, logout, recuperação e redefinição de senha.
- Consulta e edição do próprio nome de exibição, username e biografia.
- Criação e edição de obras com gêneros e capa opcional.
- Criação e edição de capítulos; publicação e retirada de publicação pelo ateliê.
- Catálogo público, detalhes da obra e leitura com navegação entre capítulos publicados.
- Biblioteca pessoal de favoritos e interface responsiva.

Busca, exclusão de conta e controles de exclusão de obras/capítulos não estão disponíveis na interface. Upload de avatar existe no service, mas o Perfil usa um símbolo estático. A situação de cada requisito está em [02-Requisitos.md](docs/02-Requisitos.md).

## Stack

| Área | Tecnologia |
|---|---|
| Interface | HTML5, CSS3 e JavaScript ES Modules, sem framework |
| Dados e identidade | Supabase Auth, PostgreSQL e Storage |
| Autorização | RLS e políticas de Storage |
| Demonstração local | Adapters Mock e armazenamento do navegador |
| Ferramentas | Node.js/npm, Supabase CLI e Docker para o backend local |
| Hospedagem prevista pelo projeto | Vercel |

## Executar localmente

Sirva a raiz por HTTP; abrir os HTMLs por `file://` não é o fluxo suportado. Com Git, Node.js/npm e Python 3 disponíveis:

```sh
git clone https://github.com/Matheusiannaccone/e-Writter.git
cd e-Writter
npm ci
python -m http.server 3000 --bind 127.0.0.1
```

Abra [a página inicial local](http://127.0.0.1:3000/index.html). Nesse hostname, o padrão é Mock: é possível cadastrar uma conta fictícia e demonstrar o produto na mesma origem/aba. O frontend não possui etapa de build nem script `npm start`.

Outro servidor estático pode ser usado se preservar os caminhos `.html` e os parâmetros de URL. Ambientes, Supabase local, limitações de rotas e deploy estão em [12-Deploy-e-Ambientes.md](docs/12-Deploy-e-Ambientes.md).

## Testes

```sh
npm test
```

A suíte usa o test runner do Node e simulações locais. Ela não certifica o Supabase remoto. Resultado auditado, limitações e execução dos testes de navegador: [10-Testes.md](docs/10-Testes.md).

## Documentação

| Documento | Assunto |
|---|---|
| [01-Visao-Geral.md](docs/01-Visao-Geral.md) | Produto, público e escopo entregue |
| [02-Requisitos.md](docs/02-Requisitos.md) | Requisitos identificados e situação de implementação |
| [03-Regras-de-Negocio.md](docs/03-Regras-de-Negocio.md) | Regras atuais do domínio |
| [04-Arquitetura.md](docs/04-Arquitetura.md) | Camadas, módulos e persistência Mock |
| [05-Modelo-de-Dados.md](docs/05-Modelo-de-Dados.md) | Schema, relações e integridade |
| [06-Fluxos-de-Usuario.md](docs/06-Fluxos-de-Usuario.md) | Jornadas pelas páginas existentes |
| [07-Design-System.md](docs/07-Design-System.md) | Tokens, componentes e acessibilidade |
| [08-Backlog-e-Roadmap.md](docs/08-Backlog-e-Roadmap.md) | Marcos entregues e evolução |
| [09-Git-e-Versionamento.md](docs/09-Git-e-Versionamento.md) | Colaboração, commits e releases |
| [10-Testes.md](docs/10-Testes.md) | Estratégia, evidências e regressão |
| [11-Seguranca.md](docs/11-Seguranca.md) | Autorização, RLS e uploads |
| [12-Deploy-e-Ambientes.md](docs/12-Deploy-e-Ambientes.md) | Execução, configuração e publicação |
| [13-Decisoes-Tecnicas.md](docs/13-Decisoes-Tecnicas.md) | ADRs e decisões substituídas |
| [14-Contrato-Front-Services.md](docs/14-Contrato-Front-Services.md) | API pública dos services |
| [15-Link-dos-Tutoriais.md](docs/15-Link-dos-Tutoriais.md) | Materiais de treinamento |
