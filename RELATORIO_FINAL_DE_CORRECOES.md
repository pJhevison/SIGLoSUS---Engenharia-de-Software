# SIGLoSUS — Relatório final de correções

**Projeto:** Sistema Inteligente de Gestão Logística e Distribuição de Medicamentos do SUS
**Disciplina:** Engenharia de Software B — Prof. Walter Jonas (UFAM/ICET)
**Versão do software:** 2.1.0 (branch `develop`)
**Data da auditoria e das correções:** 12/11/2026
**Escopo auditado:** código do backend (`pasta 02/siglosus/backend`), front-end (`pasta 02/siglosus/frontend`), documentação (`pasta 02/docs`), diagramas (`pasta 01/SIGLoSUS/diagramas`), versionamento (Git) e integração contínua (`.github`).

---

## 1. Resumo do estado original

O projeto já possuía uma base sólida: arquitetura em camadas separando domínio, aplicação, infraestrutura e apresentação; 22 requisitos funcionais, 13 não funcionais e 9 regras de negócio documentados; os cinco padrões GoF implementados; as telas consumindo a API REST real; e uma suíte automatizada com 45 testes em 4 arquivos.

A auditoria externa recebida apontava, corretamente, que **o código, a documentação em Markdown e o PDF não estavam totalmente alinhados**, que **as rotas não exigiam autenticação** e que **os requisitos RF02 a RF06 estavam apenas parcialmente implementados**. O estado inicial verificado nesta auditoria foi:

- senhas gravadas com **SHA-256 simples**, sem salt;
- token de sessão em **Base64**, sem assinatura;
- nenhuma rota privada autenticada e identificadores de usuário (`usuarioId`) enviados pelo cliente;
- ausência de recuperação de senha (RF02), de logout (RF03), de edição de usuários (RF04) e de manutenção de unidades (RF05) e medicamentos (RF06);
- dados mantidos **apenas em memória**, perdidos a cada reinício do backend;
- frontend inserindo dados da API diretamente no HTML, sem escapamento;
- divergência entre README, `LICENSE` e `package.json` quanto à licença.

## 2. Problemas identificados

| ID | Severidade | Categoria | Evidência | Correção executada |
|---|---|---|---|---|
| A01 | Crítica | Segurança | `Usuario.hashSenha` usava `crypto.createHash('sha256')` | bcrypt com salt individual + migração de hashes legados |
| A02 | Crítica | Segurança | `AutenticacaoService.gerarToken` devolvia Base64 | JWT assinado (HMAC-SHA256), com expiração, emissor e `jti` |
| A03 | Crítica | Segurança/Autorização | `App.ts` montava as rotas sem middleware; corpos com `usuarioId` | Middleware de autenticação + autorização por perfil; identidade extraída do token |
| A04 | Alta | Requisito | RF02 sem implementação | `RecuperacaoSenhaService` com token temporário de uso único e expiração |
| A05 | Alta | Requisito | RF03 sem implementação | `POST /api/auth/logout` com revogação do token no servidor |
| A06 | Alta | Requisito | RF04 sem edição | `PATCH /api/usuarios/:id`, ativação e inativação com regras por perfil |
| A07 | Alta | Requisito | RF05/RF06 somente leitura | `UnidadeService` e `MedicamentoService` com cadastro e manutenção |
| A08 | Alta | Dados | `DatabaseMemoria` sem persistência | `PersistenciaJSON` com gravação atômica e restauração no arranque |
| A09 | Alta | Segurança (front-end) | `innerHTML` com dados da API | Função `esc()` aplicada a todos os valores oriundos da API |
| A10 | Média | Segurança | CORS irrestrito, sem limite de requisições | CORS por lista configurável, limitação por IP (429), cabeçalhos de segurança |
| A11 | Média | Requisito | RF16 sem acompanhamento de posição | `PosicaoService` com registro e consulta de posições |
| A12 | Média | Documentação | RNF e RF afirmados sem evidência | Quadro de situação dos RF e dos RNF, com o que é meta não verificada |
| A13 | Média | UML | Diagrama sem `EntregaItem`, `TokenRecuperacaoSenha` e `PosicaoRota` | Diagrama atualizado e re-renderizado (PNG e SVG) |
| A14 | Média | Organização | Licenças divergentes (MIT × Apache-2.0) | `package.json` e README alinhados ao `LICENSE` (Apache-2.0) |
| A15 | Média | Qualidade | Sem `tsconfig.build.json`, CI sem compilação | Build separado e CI com `typecheck`, `test` e `build` |

## 3. Correções realizadas

### 3.1 Segurança de credenciais

- Novo módulo `src/domain/security/Senha.ts`: `gerarHashSenha` (bcrypt, custo configurável por `BCRYPT_COST`), `verificarSenha` (bcrypt **ou** SHA-256 legado), `compararSeguro` (comparação em tempo constante), `gerarTokenTemporario` e `hashToken`.
- `Usuario` deixou de ter `hashSenha` próprio: passa a delegar ao módulo de segurança e ganha `verificarSenha`, `senhaLegada`, `definirSenha` e `versaoToken`.
- **Migração transparente:** contas com hash SHA-256 legado continuam autenticando e são reescritas em bcrypt no primeiro login bem-sucedido (com registro na auditoria).

### 3.2 Autenticação e autorização

- `src/infrastructure/security/GerenciadorJWT.ts`: emissão e validação de JWT (HS256), verificação de assinatura, emissor, expiração (`exp`) e identidade (`sub`), com identificador único (`jti`).
- `AutenticacaoService`: emissão do token no login, validação com checagem de revogação e de `versaoToken`, `encerrarSessao` (logout) e registro de auditoria.
- `src/infrastructure/http/middleware/autenticacao.ts`: `autenticar` (401), `autorizar(...perfis)` (403) e `usuarioDaRequisicao`.
- `src/infrastructure/http/middleware/seguranca.ts`: `limiteRequisicoes` (429) e `cabecalhosSeguranca`.
- `src/domain/errors.ts`: `ErroNaoAutenticado` (401), `ErroNaoAutorizado` (403) e `ErroLimiteExcedido` (429), em conjunto com `ErroNaoEncontrado` (404), `ErroConflito` (409) e `ErroValidacao` (400).
- `ConfiguracaoSistema`: leitura de `JWT_SECRET` (obrigatório em produção), validade do token, limite de login, origens do CORS e caminho de persistência.

### 3.3 Requisitos funcionais completados

| Requisito | Implementação |
|---|---|
| RF02 | `RecuperacaoSenhaService`: solicitação, token temporário aleatório (apenas o hash é gravado), expiração de 30 minutos, redefinição, troca de senha pelo titular e invalidação das sessões abertas |
| RF03 | `POST /api/auth/logout`, com revogação do token e limpeza da sessão local no front-end |
| RF04 | `UsuarioService.atualizar`, `ativar` e `inativar`, com regras: administrador gerencia qualquer conta, gestor gerencia perfis operacionais, usuário edita a própria conta e não altera o próprio perfil |
| RF05 | `UnidadeService.criar/atualizar` com validação de CNES (7 dígitos) e unicidade |
| RF06 | `MedicamentoService.criar/atualizar` com validação de código CATMAT, nome, princípio ativo e indicação de controlado |
| RF16 | `PosicaoService.registrar/listar` com validação de coordenadas, vinculado à rota em andamento |

### 3.4 Persistência

- `src/infrastructure/database/PersistenciaJSON.ts`: serialização do estado completo com marcadores de data, restauração com os protótipos originais das entidades e gravação atômica (arquivo temporário + renomeação).
- `Container` recebe a opção `arquivoPersistencia`; `server.ts` usa `SIGLOSUS_ARQUIVO_PERSISTENCIA` e grava o estado no encerramento gracioso (SIGINT/SIGTERM).
- A camada HTTP grava o estado após cada escrita bem-sucedida.

### 3.5 Front-end

- `assets/js/api.js`: envio do token JWT, tratamento de 401 (encerra a sessão local), **função `esc()`** de escapamento, e **fila offline** com identificador de idempotência e sincronização automática no evento `online`.
- Telas atualizadas para usar `esc()` em todos os valores oriundos da API e para **não enviar mais `usuarioId` no corpo** das requisições.
- `index.html`: fluxo de recuperação de senha (RF02).
- `cadastros.html` e `cadastros.js`: formulários de cadastro de unidades (RF05) e de medicamentos (RF06), edição de contas e ativação/inativação (RF04).

### 3.6 Documentação, diagramas e PDF

- Seções novas na documentação: **4.7 Segurança, Autenticação e Autorização** e **4.8 Persistência de Dados**; renumeração da rastreabilidade para 4.9.
- Quadros de situação de implementação dos **RF** (19 implementados, 3 parciais, 0 ausentes) e de atendimento dos **RNF** (o que é parcial e o que é meta não verificada).
- Tabelas de rastreabilidade de endpoints atualizadas; tabela de testes atualizada (71 testes em 7 arquivos).
- Diagrama de classes atualizado (`EntregaItem`, `TokenRecuperacaoSenha`, `PosicaoRota`, `Usuario.versaoToken`) e re-renderizado em PNG e SVG.
- PDF regenerado a partir do HTML atualizado: **41 páginas**, 27 figuras e 10 tabelas, com a ficha técnica da capa conferida.

## 4. Arquivos modificados

**Backend (criados):** `src/domain/security/Senha.ts`, `src/domain/errors.ts` (revisado), `src/domain/entities/EntregaItem.ts`, `src/domain/entities/TokenRecuperacaoSenha.ts`, `src/domain/entities/PosicaoRota.ts`, `src/infrastructure/security/GerenciadorJWT.ts`, `src/infrastructure/http/middleware/autenticacao.ts`, `src/infrastructure/http/middleware/seguranca.ts`, `src/infrastructure/repositories/SegurancaRepository.ts`, `src/infrastructure/database/PersistenciaJSON.ts`, `src/application/services/RecuperacaoSenhaService.ts`, `src/application/services/UnidadeService.ts`, `src/application/services/MedicamentoService.ts`, `src/application/services/PosicaoService.ts`, `tests/seguranca.test.ts`, `tests/requisitos.test.ts`, `tests/persistencia.test.ts`, `tests/helpers.ts`, `tests/setup.ts`, `vitest.config.ts`, `tsconfig.build.json`, `.env.example`.

**Backend (revisados):** `src/domain/entities/Usuario.ts`, `Requisicao.ts`, `Entrega.ts`, `Dispensacao.ts`, `index.ts`, `src/domain/rules/RegrasNegocio.ts`, `src/application/services/AutenticacaoService.ts`, `UsuarioService.ts`, `TransferenciaService.ts`, `EntregaService.ts`, `EstoqueService.ts`, `RotaService.ts`, `RequisicaoService.ts`, `DispensacaoService.ts`, `src/application/Container.ts`, `src/infrastructure/http/routes.ts`, `App.ts`, `src/infrastructure/database/DatabaseMemoria.ts`, `src/infrastructure/repositories/DistribuicaoRepository.ts`, `src/patterns/singleton/ConfiguracaoSistema.ts`, `src/server.ts`, `package.json`, `README.md`, `tests/api.test.ts`, `tests/servicos.test.ts`.

**Front-end:** `assets/js/api.js` (reescrito), `assets/js/layout.js`, `assets/js/paginas/*.js` (nove arquivos), `index.html`, `cadastros.html`, `cadastros.js`, `README.md`.

**Documentação e repositório:** `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.md`, `.html` e `.pdf`; `pasta 01/SIGLoSUS/diagramas/09-classes.mmd`; `pasta 01/SIGLoSUS/imagens/09-classes.png|.svg`; `pasta 02/imagens/09-classes.png`; `README.md`; `CHANGELOG.md`; `ANALISE_E_PLANO_DE_MELHORIAS.md`; `.gitignore`; `.github/workflows/ci.yml`.

## 5. Funcionalidades implementadas

RF01, RF03, RF04, RF05, RF06, RF08, RF09, RF10, RF11, RF12, RF13, RF14, RF15, RF17, RF18, RF19, RF20, RF21 e RF22 — integralmente, com teste automatizado e endpoint documentado.

## 6. Funcionalidades que permanecem parciais

- **RF02** — o fluxo de recuperação existe e está testado, mas a **entrega do token por e-mail** depende de um serviço externo (não disponível no escopo). Fora do ambiente de produção, o token é devolvido na resposta para demonstração.
- **RF07** — o padrão Adapter, o contrato e o serviço de sincronização estão implementados e testados, mas a sincronização consome **dados locais de demonstração**. A conexão com e-SUS APS, HÓRUS/SNA e BNAFAR exige credenciais e homologação concedidas por terceiros.
- **RF16** — despacho, acompanhamento por situação e posição reportada pelo dispositivo estão implementados; **não há integração com hardware GPS dedicado** e, portanto, não há rastreamento geográfico real de veículos.

## 7. Funcionalidades não implementadas

Nenhum requisito funcional foi classificado como ausente nesta versão. Permanecem como **metas técnicas sem medição** os RNF de desempenho (RNF03, RNF04), disponibilidade (RNF05), acessibilidade auditada (RNF06), escalabilidade (RNF08), transações ACID em SGBD (RNF09), retenção de auditoria por cinco anos (RNF10) e portabilidade para dispositivos móveis (RNF11), além da conformidade LGPD auditada (RNF02) e do perfil HL7 FHIR (RNF07).

## 8. Correções de segurança

1. Senhas com **bcrypt** (salt individual, custo configurável), comparação em tempo constante e migração de hashes legados.
2. Sessões por **JWT assinado**, com expiração, revogação no logout e invalidação após troca de senha.
3. **Autenticação obrigatória** em todas as rotas privadas e **autorização por perfil** declarada por endpoint.
4. Identidade do usuário obtida **do token** — o corpo da requisição não define quem executa a operação.
5. Respostas de usuários **sem CPF e sem hash de senha**; nenhuma credencial é registrada em log ou auditoria.
6. **Escapamento de dados** da API antes da inserção no HTML (mitigação de XSS).
7. **Limitação de requisições** por IP no login e na recuperação de senha (429).
8. **CORS restrito** às origens configuradas e cabeçalhos de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`).
9. Segredos **nunca versionados**: `JWT_SECRET` vem de variável de ambiente e é obrigatório em produção.
10. Respostas de erro interno **não expõem detalhes** (mensagem genérica em HTTP 500).

## 9. Alterações no banco de dados

- A camada de acesso a dados permaneceu **em memória** (`DatabaseMemoria`), preservando as interfaces de repositório.
- Foi adicionada a camada `PersistenciaJSON`, que **grava e restaura o estado em arquivo JSON** — os dados agora sobrevivem ao reinício do backend, o que era uma lacuna apontada na auditoria.
- Não há SQL no projeto: portanto, não existe superfície de injeção de SQL. Não há, porém, transações ACID nem controle de concorrência; a migração para SGBD é prevista atrás das mesmas interfaces.

## 10. Testes executados

Comandos executados na pasta `pasta 02/siglosus/backend`:

```bash
npm run typecheck   # tsc --noEmit — sem erros
npm test            # vitest run
npm run build       # tsc -p tsconfig.build.json — gera dist/
```

## 11. Resultados reais dos testes

| Indicador | Resultado |
|---|---|
| Arquivos de teste | 7 |
| Testes executados | 71 |
| Testes aprovados | 71 |
| Testes reprovados | 0 |
| Testes ignorados | 0 |
| Erros de execução | 0 |
| Verificação de tipos | sem erros |
| Compilação (`npm run build`) | concluída sem erros |

Distribuição: `regras-negocio` (10), `padroes-projeto` (7), `servicos` (14), `seguranca` (8), `requisitos` (11), `persistencia` (4), `api` (17).

Além da suíte, foi executado um **teste manual de ponta a ponta** com o servidor em execução (porta 3111): `/api/health` respondeu 200; o login emitiu um JWT de 335 caracteres; uma requisição sem token recebeu **401**; uma requisição autenticada criou uma unidade (201) e o arquivo de persistência foi gravado no disco.

## 12. Situação da documentação

`pasta 02/docs/Documentacao_SIGLoSUS_Parte2.md` (fonte), `.html` (versão ABNT navegável) e `.pdf` (entrega) foram atualizados e conferidos entre si. O documento passou a declarar explicitamente o que é **implementado**, **parcial**, **meta não verificada** e **dependente de terceiros**, com o quadro de situação dos RF e dos RNF e com as subseções 4.7 (segurança) e 4.8 (persistência). A ficha técnica da capa foi conferida contra o PDF gerado.

## 13. Situação dos diagramas

O diagrama de classes (`09-classes.mmd`) foi atualizado com `EntregaItem`, `TokenRecuperacaoSenha` e `PosicaoRota`, com o atributo `Usuario.versaoToken` e os métodos de senha; PNG e SVG foram re-renderizados pelo Mermaid CLI e o PNG foi copiado para `pasta 02/imagens/`. Os demais diagramas foram conferidos e não exigiram alteração. Todos os arquivos `.mmd` permanecem renderizáveis.

## 14. Situação do PDF

PDF regenerado a partir do HTML atualizado com Chrome headless: **41 páginas**, 27 figuras e 10 tabelas. Verificação por extração de texto: presentes "71 testes", "Segurança, Autenticação e Autorização", "Persistência de Dados", "bcrypt", "JWT", `RecuperacaoSenhaService`, `PosicaoService` e `GerenciadorJWT`; última figura numerada: **Figura 27**.

## 15. Situação do Git e da CI

- Branch de trabalho: `develop`; histórico preservado, sem comandos destrutivos, sem *force push*.
- Commits semânticos descrevem cada grupo de correções (ver `CHANGELOG.md` e `git log`).
- **Publicado no GitHub** (12/11/2026): branch `develop` e branch `release/v2.1.0`, tag anotada `v2.1.0`, **Pull Request #1 mergeado em `main`** e **Release `v2.1.0` publicada**.
  - Pull Request: https://github.com/pJhevison/SIGLoSUS---Engenharia-de-Software/pull/1 (`main` ← `release/v2.1.0`, commit de merge `fd9321a`)
  - Release: https://github.com/pJhevison/SIGLoSUS---Engenharia-de-Software/releases/tag/v2.1.0
- Após o merge, a `develop` recebeu o commit de merge da `main`, mantendo o fluxo Git Flow coerente.
- `.github/workflows/ci.yml`: Node.js 20, cache de `npm`, `npm ci`, `npm run typecheck`, `npm test` e `npm run build`, com variáveis de ambiente de teste.
  - Execuções **concluídas com sucesso** (`success`) nas branches `develop` e `release/v2.1.0`: https://github.com/pJhevison/SIGLoSUS---Engenharia-de-Software/actions
- `.github/pull_request_template.md` com rastreabilidade RF/RN e checklist.

## 16. Limitações técnicas

1. Persistência em arquivo JSON: sem transações ACID, sem concorrência entre processos e sem consultas agregadas em SQL.
2. Integração com e-SUS APS, HÓRUS/SNA e BNAFAR é simulada com dados locais.
3. Rastreamento de rota depende da posição reportada pelo dispositivo (sem hardware GPS dedicado).
4. Entrega do token de recuperação de senha depende de um serviço de e-mail externo.
5. TLS não é aplicado pelo protótipo (responsabilidade do proxy de produção).
6. Não foram executados ensaios de desempenho, disponibilidade, escalabilidade ou acessibilidade.
7. A versão da auditoria foi executada em Node.js local; o pipeline de CI precisa ser observado no GitHub após o push para comprovar execução remota.

## 17. Instruções para execução

```bash
git clone https://github.com/pJhevison/SIGLoSUS---Engenharia-de-Software.git
cd SIGLoSUS---Engenharia-de-Software
cd "pasta 02/siglosus/backend"
npm install
cp .env.example .env          # defina JWT_SECRET (mínimo de 32 caracteres)
npm start                     # API e telas em http://localhost:3000
```

Verificações opcionais:

```bash
npm run typecheck
npm test
npm run build
```

Para persistir os dados entre reinícios, defina `SIGLOSUS_ARQUIVO_PERSISTENCIA=./data/siglosus.json` no arquivo `.env`.

Usuários de demonstração (senha `siglosus123`): `admin@siglosus.gov.br`, `gestor@siglosus.gov.br`, `farmaceutico@siglosus.gov.br`, `almoxarife@siglosus.gov.br`, `motorista@siglosus.gov.br`.

## 18. Pendências que dependem de terceiros

| Pendência | Dependência | Como resolver |
|---|---|---|
| Envio do e-mail de recuperação (RF02) | Serviço de e-mail (SMTP/SES) | Implementar um adapter de notificação que entregue o token |
| Integração real com e-SUS/HÓRUS/BNAFAR (RF07) | Credenciais e homologação oficial | Completar o adapter com o cliente HTTP e o contrato oficial |
| TLS e proxy de produção (RNF01) | Infraestrutura de deploying | Configurar o proxy e o certificado |
| Migração para SGBD (RNF09) | Infraestrutura de banco | Implementar um adapter de repositório sobre PostgreSQL |

**Itens de versionamento já resolvidos nesta entrega:** Pull Request #1 criado e **mergeado** em `main`,
Release `v2.1.0` publicada, tag `v2.1.0` anotada e branches `develop`/`release/v2.1.0` publicadas.

---

## Tabela final de situações

| Item | Situação anterior | Situação final | Evidência |
|---|---|---|---|
| Autenticação | Token Base64 sem assinatura; rotas abertas | **Corrigido** — JWT assinado (HS256), expiração, revogação e identidade no token | `src/infrastructure/security/GerenciadorJWT.ts`; `tests/seguranca.test.ts` (8 testes) |
| Segurança das senhas | SHA-256 simples, sem salt | **Corrigido** — bcrypt com salt, migração automática de hashes legados | `src/domain/security/Senha.ts`; `tests/seguranca.test.ts` |
| Autorização das rotas | Nenhuma; `usuarioId` vindo do cliente | **Corrigido** — autenticação obrigatória, autorização por perfil, 401/403 | `middleware/autenticacao.ts`, `routes.ts`; `tests/requisitos.test.ts` |
| Requisitos funcionais | 19 implementados, 3 parciais (RF02–RF06 incompletos), 0 ausentes | **19 implementados, 3 parciais justificadas (RF02, RF07, RF16), 0 ausentes** | `tests/requisitos.test.ts`, `tests/api.test.ts` |
| Regras de negócio | RN01–RN09 aplicadas em fluxos reais | **Mantido** — RN05 e RN09 confirmadas em fluxo; RN02 com baixa em lote específico | `tests/servicos.test.ts`, `tests/requisitos.test.ts` |
| Persistência | Somente memória (perda ao reiniciar) | **Corrigido** — arquivo JSON atômico, configurável | `src/infrastructure/database/PersistenciaJSON.ts`; `tests/persistencia.test.ts` |
| Integrações | Adapter implementado, sincronização simulada | **Mantido e declarado** — limitação documentada na seção 2.1 e 6.9 | `src/patterns/adapter/`, seção 6.9 da documentação |
| Testes | 45 testes em 4 arquivos, execução não comprovada na auditoria | **71 testes em 7 arquivos, 71 aprovados, 0 reprovados** | `npm test` executado; saída registrada |
| UML | Diagrama sem `EntregaItem` | **Atualizado** — `EntregaItem`, `TokenRecuperacaoSenha`, `PosicaoRota` | `pasta 01/SIGLoSUS/diagramas/09-classes.mmd` e imagens re-renderizadas |
| Documentação | RF/RNF afirmados sem evidência; PDF e Markdown divergentes | **Reescrita** — quadros de situação, subseções 4.7 e 4.8, tabelas e sumário revisados | `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.md` e `.html` |
| PDF | 39 páginas, desatualizado frente ao código | **Regenerado** — 41 páginas, 27 figuras, 10 tabelas, conferido | `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.pdf` |
| CI | Presente, sem execução comprovada e sem build | **Revisado e executado** — `npm ci`, `typecheck`, `test` e `build`; execuções concluídas com `success` | `.github/workflows/ci.yml`; aba Actions do repositório |

**Nada foi marcado como concluído sem evidência verificável no repositório.**
