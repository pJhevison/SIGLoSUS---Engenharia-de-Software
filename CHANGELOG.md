## [2.1.1] - 2026-11-12 (revisão local, publicação pendente)

### Corrigido
- Idempotência aplicada após autenticação e autorização, isolada por usuário, método, rota e conteúdo; conflito 409.
- Chave única por operação no navegador; reenvio offline com a chave original e isolamento entre contas.
- Proibição de seed de demonstração em produção mesmo quando explicitamente solicitado.
- Bootstrap seguro do administrador inicial sem contas ou senhas públicas.
- Correções na documentação, variáveis de ambiente e instruções de versionamento Git Flow.

### Verificação
- TypeScript: typecheck e build locais aprovados.
- 10 verificações funcionais direcionadas aprovadas; suíte Vitest completa ainda não reproduzida nesta máquina.

# Changelog

Todas as mudanças relevantes do SIGLoSUS são registradas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

## [2.1.0] - 2026-11-12

### Adicionado

- **Autenticação por JWT assinado** (HMAC-SHA256), com expiração, emissor
  verificado, revogação individual no logout e segredo por variável de ambiente
  (`JWT_SECRET`), obrigatório em produção.
- **Autorização por perfil em todas as rotas privadas**, com identidade obtida do
  token (nunca do corpo da requisição) e respostas 401/403.
- **Recuperação de senha (RF02)**: token temporário de uso único com expiração,
  redefinição da senha e invalidação das sessões abertas.
- **Logout (RF03)** com revogação do token no servidor.
- **Edição, ativação e inativação de usuários (RF04)**, com regras de permissão
  por perfil.
- **Cadastro e manutenção de unidades de saúde (RF05) e do catálogo de
  medicamentos (RF06)**, com validações de unicidade (CNES, CATMAT, e-mail, CPF).
- **Persistência em arquivo JSON** (`PersistenciaJSON`): os dados sobrevivem ao
  reinício do processo; configurada por `SIGLOSUS_ARQUIVO_PERSISTENCIA`.
- **Rastreamento de rota (RF16)** por posição reportada pelo dispositivo
  (`PosicaoService`, `POST/GET /api/rotas/:id/posicoes`).
- **Fila de operações offline** no front-end, com identificador de idempotência
  e sincronização automática na reconexão.
- **Limitação de requisições** no login e na recuperação de senha (HTTP 429),
  CORS restrito e cabeçalhos de segurança nas respostas.
- **Escapamento de dados da API** no front-end (`esc()`), reduzindo a superfície
  de XSS.
- `.env.example` com todas as variáveis de ambiente do backend.
- Workflow de integração contínua em `.github/workflows/ci.yml` (instala, tipos,
  testes e compilação).
- Template de pull request em `.github/pull_request_template.md`.
- Testes de segurança, de requisitos complementares e de persistência
  (`tests/seguranca.test.ts`, `tests/requisitos.test.ts`,
  `tests/persistencia.test.ts`): a suíte passa de 45 para **72 testes**.

### Corrigido

- **Senhas**: o hash SHA-256 simples foi substituído por **bcrypt** com salt
  individual; hashes legados são aceitos na leitura e migrados no primeiro login.
- RF14: a aprovação de transferência agora dá baixa efetiva no estoque de
  origem, em vez de apenas alterar o status.
- RF17: a confirmação de recebimento credita o estoque de destino a partir dos
  itens planejados no servidor, sem confiar em quantidades enviadas pelo
  cliente; a transferência vinculada é concluída e a rota é encerrada quando
  todas as paradas terminam.
- RF19/RN05: a dispensação passa a exigir lote e dois conferentes para
  medicamentos controlados, com baixa no lote informado.
- RN06: a prioridade de roteirização passa a desempatar a favor de unidades com
  medicamentos da RENAME em déficit.
- RN09: a aprovação de requisições exige perfil GESTOR ou ADMINISTRADOR acima do
  limite de valor, com o usuário obtido do token.
- Segurança: respostas de `/api/usuarios` não expõem mais `senhaHash` nem CPF.
- HTTP: credenciais inválidas retornam 401, conta bloqueada retorna 423,
  recursos inexistentes retornam 404, conflitos de estado retornam 409 e excesso
  de requisições retorna 429.
- Roteirização: paradas passam a usar sequência de identificadores própria, sem
  consumir a sequência de rotas.
- Licença: `package.json` passa a declarar Apache-2.0, igual ao arquivo
  `LICENSE` e ao README.

### Documentação

- Documentação consolidada (seções 1 a 6) revisada: situação de implementação
  dos RF e dos RNF, nova subseção de segurança (4.7), nova subseção de
  persistência (4.8), rastreabilidade de endpoints atualizada e tabelas de
  testes revistas (72 testes em 7 arquivos).
- Diagrama de classes atualizado com `EntregaItem`, `TokenRecuperacaoSenha` e
  `PosicaoRota`.
- PDF regenerado a partir do HTML atualizado.

## [2.0.0] - 2026-11-05

### Adicionado

- Documentação consolidada da Parte 2 (arquitetura, padrões e prototipação).
- API REST em Node.js + TypeScript com banco em memória.
- Front-end navegável consumindo a API real.
- Implementação dos padrões Singleton, Factory Method, Adapter, Observer e
  Strategy.

## [1.0.0] - 2026-09-30

### Adicionado

- Documento de requisitos, regras de negócio e diagramas UML da Parte 1.
