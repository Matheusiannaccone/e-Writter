# 12 — Deploy e Ambientes

## Fontes e ambientes

A decisão observada em [dataSource.js](../js/services/dataSource.js) e [supabaseClient.js](../js/services/supabaseClient.js) é:

| Endereço do frontend | Query | Fonte efetiva | Endpoint quando usa Supabase |
|---|---|---|---|
| `localhost` ou `127.0.0.1` | Sem `datasource=supabase` como primeiro valor | Mock | Não usado nas operações Mock |
| `localhost` ou `127.0.0.1` | Primeiro `datasource=supabase` | Supabase | Local, `http://127.0.0.1:54321` |
| Qualquer outro hostname | Qualquer valor, inclusive `datasource=mock` | Supabase | Projeto remoto configurado no módulo |

Previews e produção em hostnames Vercel usam o mesmo endpoint remoto incorporado ao cliente. Não há isolamento automático por branch. IP de rede local, hostname alternativo ou `::1` não são reconhecidos como Mock/local por essa regra.

A escolha do adapter ocorre na importação do módulo. Fonte e endpoint são decisões separadas; `?datasource=supabase` em localhost não seleciona o remoto. Ambos os adapters e o SDK da CDN são importados mesmo no modo Mock.

## Frontend local

Preparação curta: [README.md](../README.md). O frontend é estático, sem build ou script `npm start`. `npm ci` instala as dependências declaradas, incluindo a CLI de desenvolvimento; não configura automaticamente Auth, Docker ou um servidor HTTP.

Um servidor que preserve arquivos e query pode ser iniciado com Python 3:

```sh
python -m http.server 3000 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:3000/index.html` para Mock ou acrescentar `?datasource=supabase` para o backend local. Manter protocolo, host e porta para conservar o mesmo armazenamento Mock. Usar contas fictícias; detalhes dos armazenamentos estão em [04-Arquitetura.md](04-Arquitetura.md).

## Rotas e parâmetros

Os arquivos da aplicação usam `.html`. O helper geral preserva `datasource=mock` ou `supabase` reconhecido, mas não remove a extensão dos destinos. Apenas os editores têm adaptação específica quando já estão em caminhos de editor sem extensão.

Relatórios históricos observaram servidores redirecionando `.html` para rota limpa sem conservar a query. Não há configuração versionada que resolva isso universalmente. Preferir o servidor estático acima na demonstração local e verificar o comportamento real da hospedagem antes de assumir compatibilidade com URLs limpas. As três falhas atuais de expectativa de rota estão em [10-Testes.md](10-Testes.md).

`id` identifica obra em detalhes e capítulo no leitor; `bookId` carrega a seleção entre editores, com compatibilidade legada `book` no ateliê. Não confundir contexto de navegação com autorização.

## Configuração pública e variáveis

O cliente usa constantes de URL e chave pública/publishable em `supabaseClient.js`. Como não há build/loader de variáveis, o navegador não lê `.env` automaticamente. [.env.example](../.env.example) é um exemplo de nomes (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), não uma configuração consumida pelo módulo atual. Definir variáveis na Vercel, isoladamente, não substitui essas constantes.

Antes de usar o backend, conferir se o projeto/instância e a chave pública configurados correspondem ao ambiente autorizado. Valores privilegiados não pertencem ao frontend; ver [11-Seguranca.md](11-Seguranca.md).

## Supabase local

Requer Docker em funcionamento e a Supabase CLI instalada pelas dependências. O arquivo [config.toml](../supabase/config.toml) define PostgreSQL 17, API em 54321, banco em 54322, Studio em 54323 e servidor local de e-mail em 54324.

```sh
npx supabase start
```

Este comando é uma instrução operacional; não foi executado nesta auditoria. O bootstrap deve ser conferido antes de uma demonstração:

- Há 12 migrations versionadas, descritas em [05-Modelo-de-Dados.md](05-Modelo-de-Dados.md).
- `[db.seed]` está habilitado e aponta para `./seed.sql`, mas o arquivo não existe no repositório. Não se declara um reset/bootstrap integral validado enquanto essa divergência não for resolvida em tarefa de configuração.
- Os gêneros já são inseridos pela própria migration de criação; não precisam ser atribuídos a um seed inexistente.
- `npx supabase db reset` recria dados locais a partir da configuração/migrations e é destrutivo para essa instância; não é necessário para a demonstração Mock nem foi executado aqui.

## Auth e recuperação

Na configuração local versionada, `site_url` é `http://127.0.0.1:3000`, `additional_redirect_urls` contém `https://127.0.0.1:3000`, confirmação de e-mail está desabilitada, senha mínima é 6 e o limite de envio configurado é 2 e-mails/hora. Esses valores não comprovam a configuração remota.

O adapter constrói um redirect para `redefinir-senha.html` no diretório atual e propaga `datasource=supabase` quando presente. Conferir no ambiente autorizado a permissão da URL efetiva completa, com protocolo, host, porta e caminho, inclusive previews. Não presumir que a lista versionada autorize toda combinação.

O prazo de 60s da interface é independente dos limites do provedor. E-mails do ambiente local são capturados pelo serviço local de teste; entrega real e provedor remoto exigem verificação própria.

## Vercel e publicação

A Vercel é a hospedagem escolhida no ADR-005. Não há `vercel.json`, definição versionada de rewrites/redirects nem pipeline de deploy neste checkout. A conexão com GitHub, projeto, domínio, branch de produção e configurações efetivas precisam ser confirmados no painel autorizado; não foram auditados remotamente.

A convenção é revisar a branch por PR e integrar à `main` antes da publicação de produção. Previews podem acessar o mesmo banco remoto, portanto devem ser tratados como clientes reais desse ambiente. Esta auditoria não executa deploy nem alterações remotas.

## Checklist de publicação

1. Confirmar commit, branch de produção, versão do pacote e identificação de tag/release conforme [09-Git-e-Versionamento.md](09-Git-e-Versionamento.md).
2. Executar a regressão de [10-Testes.md](10-Testes.md), registrando as falhas abertas e o aceite; não declarar 133/133 aprovados sem nova evidência.
3. Verificar as garantias e os testes de autorização de [11-Seguranca.md](11-Seguranca.md) contra o ambiente efetivamente aplicado.
4. Conferir endpoint/chave pública, redirects de Auth, e-mail, buckets e compatibilidade das migrations.
5. Testar links e query após redirects, recursos da CDN, leitura anônima e uso de contas de teste.
6. Revisar ausência de segredos e manter documentação da versão publicada compatível.

Não há página 404 própria para incluir como funcionalidade entregue; conferir o tratamento do host para caminhos inexistentes.

## Rollback

No frontend, identificar o último commit/deploy validado e usar o mecanismo de restauração do host ou uma reversão revisada que gere novo deploy. Conferir que o frontend restaurado continua compatível com o banco atual.

Rollback de frontend não reverte migrations nem dados. Mudanças de banco exigem análise de compatibilidade, preservação de dados e procedimento autorizado específico; não editar uma migration aplicada para simular reversão. Manter conhecimento de publicação/restauração compartilhado pela equipe, sem depender de caminhos ou credenciais de uma máquina.
