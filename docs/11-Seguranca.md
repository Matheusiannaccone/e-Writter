# 11 — Segurança

## Modelo e fonte de evidência

O cliente é não confiável: pode alterar JavaScript, URLs, IDs e payloads ou chamar a API diretamente. No backend real, Auth identifica a conta; GRANT habilita operações e RLS/policies delimitam acesso. Constraints e triggers cuidam de integridade, conforme [05-Modelo-de-Dados.md](05-Modelo-de-Dados.md).

A matriz abaixo é a autorização **versionada nas migrations**, não uma certificação da configuração remota. Nenhum banco remoto foi modificado/inspecionado por esta auditoria.

## Autenticação e sessão

O cliente Supabase usa a configuração pública incorporada no módulo e os padrões de sessão do SDK. O frontend não possui backend próprio para operações administrativas. Chaves privilegiadas, senha de banco, connection strings administrativas e tokens não devem ser publicados ou registrados em logs/documentação.

`getCurrentUser` usa a verificação do adapter; falha de rede não deve ser confundida com visitante. A interface possui barreiras contra exibição de resultados de outra sessão, mas isso não cancela nem reverte uma operação já autorizada no servidor. O alcance entre abas e a revogação real dependem do SDK/ambiente e exigem validação integrada.

Na recuperação, o adapter verifica erros do redirect e sessão não expirada; aceita uma sessão autenticada existente, sem exigir uma marca adicional de recovery. Não há troca manual de tokens nas páginas. O prazo de espera da interface não substitui limites do Auth.

## Matriz de acesso às tabelas

Baseline de domínio: Matriz RLS 1.0 do ADR-023, complementada pelos GRANTs explícitos da migration [20261025210000_grant_mvp_table_privileges.sql](../supabase/migrations/20261025210000_grant_mvp_table_privileges.sql).

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Público | Conta autenticada, `id = auth.uid()` | Próprio perfil, com verificação antes/depois | Sem privilégio/policy direta para o cliente |
| `books` | Publicada ou do próprio autor | Autor autenticado | Autor, preservando autoria no resultado | Autor |
| `chapters` | Capítulo e obra publicados, ou autor da obra | Autor da obra | Autor da obra, também no resultado | Autor da obra |
| `genres` | Público | Sem privilégio/policy | Sem privilégio/policy | Sem privilégio/policy |
| `book_genres` | Obra publicada ou própria | Autor da obra | Sem privilégio/policy direta | Autor da obra |
| `favorites` | Próprio usuário | Próprio usuário e obra publicada | Sem privilégio/policy | Próprio usuário |

Todos os seis conjuntos possuem RLS habilitada nas migrations. `anon` recebe SELECT nas cinco tabelas públicas, sem favoritos. `authenticated` recebe SELECT nas seis; INSERT/UPDATE de perfil; INSERT/UPDATE/DELETE de obras e capítulos; INSERT/DELETE de relações de gêneros e favoritos. As operações continuam sujeitas à RLS. Não há DML de gêneros para os papéis do frontend.

As políticas seguem os grupos `profiles_*`, `books_*`, `chapters_*`, `genres_select_public`, `book_genres_*` e `favorites_*` das migrations de criação de cada tabela. `USING` limita linhas existentes e `WITH CHECK` valida o resultado da escrita quando definido.

Consequências relevantes:

- Conhecer o UUID não permite consultar rascunho alheio ou alterar conteúdo de outro autor.
- Capítulos e associações herdam a propriedade da obra.
- Obra com `author_id = NULL` pode continuar pública se publicada, mas nenhum usuário comum assume sua autoria.
- Favorito próprio pode ser removido mesmo se a obra deixou de estar publicada; a relação não é apagada pela despublicação.
- Perfil público inclui identificador, nome, username, bio, caminho de avatar e timestamps. RLS de linha não oculta colunas privadas que fossem adicionadas a essa tabela.

## RPCs e privilégios elevados

| Função | Modelo de execução e restrição |
|---|---|
| `create_book` | SECURITY INVOKER padrão: usa privilégios/RLS do chamador; exige conta e seleção válida. EXECUTE concedido a `authenticated`. |
| `set_book_genres` | SECURITY DEFINER: verifica autenticação/autoria/IDs e permite substituir relações sem conceder UPDATE direto ao cliente. |
| `unpublish_book` e `unpublish_chapter` | SECURITY DEFINER: verificam autenticação e autoria e bloqueiam registros antes das mutações transacionais. |
| `handle_new_user` | Trigger SECURITY DEFINER para criar perfil durante o cadastro, com metadata validada. Não é um endpoint de cadastro alternativo para a interface. |

Nas três RPCs SECURITY DEFINER acima, execução pública é revogada e concedida a `authenticated`. As funções usam `search_path` vazio e objetos qualificados. Estar autenticado não dispensa a checagem explícita de propriedade dentro da função elevada.

A versão final de integridade da despublicação não depende de configuração de sessão para liberar escrita: usa constraint trigger adiada. A sequência de substituição está em [05-Modelo-de-Dados.md](05-Modelo-de-Dados.md).

## Storage e paths

A migration [20260913201958_storage.sql](../supabase/migrations/20260913201958_storage.sql) define buckets públicos `avatars` e `covers`.

| Bucket | Objeto dentro do bucket | Escrita autenticada |
|---|---|---|
| `avatars` | `{user_id}/avatar.webp` | Apenas quando o ID e o nome exato correspondem a `auth.uid()` |
| `covers` | `{book_id}/cover.webp` | Apenas quando o prefixo/nome correspondem à obra cuja autoria é de `auth.uid()` |

As referências no banco incluem o bucket: `avatars/{user_id}/avatar.webp` e `covers/{book_id}/cover.webp`. A autorização do objeto distingue INSERT, UPDATE e DELETE. As policies SELECT de objeto próprio suportam operações como upsert; a leitura pública de arquivos decorre dos buckets públicos.

Uma capa de rascunho é acessível a quem possuir sua URL direta. Isso não libera os registros/chapítulos privados. UUID não é medida de confidencialidade. Excluir uma obra não limpa automaticamente seu arquivo de capa, e as referências textuais `avatar_path`/`cover_path` não possuem CHECK de formato no schema; as policies protegem objetos, não validam o conteúdo dessas colunas.

## Uploads do backend real

| Regra | Avatar | Capa |
|---|---|---|
| Entrada aceita pelo adapter | JPEG, PNG ou WebP | JPEG, PNG ou WebP |
| Tamanho máximo de entrada e saída | 2 MiB (`2097152` bytes) | 5 MiB (`5242880` bytes) |
| Limites de dimensão no cliente | 512 × 512 | 1600 × 2400 |
| Persistência no bucket | WebP | WebP |

O adapter decodifica, reduz proporcionalmente sem ampliar, converte por canvas com qualidade 0,85 e confere o tamanho convertido. Buckets também restringem MIME a `image/webp` e tamanho. SVG/GIF não são aceitos pelo pipeline.

Conversão no cliente é otimização/UX, não uma fronteira de segurança. Não há scanner de arquivos ou validação server-side de dimensões definida nessas migrations. Upload/remoção de objeto e atualização da referência na tabela são operações separadas; falha parcial não implica rollback conjunto.

A capa possui fluxo na interface. Operações de avatar estão disponíveis no service, mas sem upload/exibição integrado ao Perfil atual.

## Conteúdo e mensagens

Títulos, sinopses, nomes e capítulos de usuário são apresentados como texto nos fluxos inspecionados; os usos de `innerHTML` de layout/indicador são marcação controlada. Não há suporte a HTML arbitrário no capítulo. Isso não equivale a auditoria exaustiva de XSS ou conformidade de segurança de toda a plataforma.

Códigos e mensagens normalizados pertencem ao [14-Contrato-Front-Services.md](14-Contrato-Front-Services.md). Não se garante que toda recusa RLS vire `FORBIDDEN`: vários adapters ainda produzem `UNKNOWN`. A autorização permanece válida mesmo quando o feedback é genérico.

## Proteção e limites do Mock

O Mock é para dados fictícios: armazenamento e sessão são alteráveis pelo usuário/scripts da origem e não oferecem segurança equivalente ao backend.

Verificadores de senha usam PBKDF2/SHA-256, 210.000 iterações, salt aleatório de 16 bytes e resultado de 256 bits. Não se serializam senhas originais dos fixtures; fixtures sem verificador ainda utilizam suas credenciais públicas de demonstração. Isso não impede tentativa offline de adivinhação.

A identidade só confirma escrita após persistir; corrupção, versão incompatível e falha de armazenamento retornam erro sem reset silencioso. Sessão Mock usa a aba, expira após uma hora nas novas gravações e é verificada por consulta, sem renovação automática ou monitor de expiração ociosa. Abas duplicadas podem herdar uma cópia de `sessionStorage`; logout global entre abas não é garantia do Mock.

Web Crypto requer contexto seguro. Contas sobrevivem à navegação na mesma origem; limpar dados da origem as remove. Detalhes de persistência e falhas distintas de catálogo/favoritos: [04-Arquitetura.md](04-Arquitetura.md).

## Verificação antes de publicação

Conferir, em ambiente autorizado, o SQL realmente aplicado, privilégios efetivos, autor A versus usuário B, leitura anônima, favoritos privados, escrita em paths alheios, limites dos buckets, recuperação real e saída com falha. Não há implementação de exclusão administrativa de conta para certificar.

O roteiro e as lacunas de evidência ficam em [10-Testes.md](10-Testes.md); configurações e publicação, em [12-Deploy-e-Ambientes.md](12-Deploy-e-Ambientes.md).
