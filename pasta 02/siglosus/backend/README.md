# SIGLoSUS — Backend (API REST)

> *"Logística que salva vidas."*

Backend do **SIGLoSUS — Sistema Inteligente de Gestão Logística e Distribuição de Medicamentos do SUS**.
Implementa o **domínio**, as **9 regras de negócio (RN01–RN09)**, os **5 padrões de projeto** e os
**serviços de aplicação** que sustentam as telas da seção 6 da documentação.

- **Stack:** Node.js 20+ · TypeScript · Express · Vitest + Supertest · bcryptjs · jsonwebtoken
- **Versão:** 2.1.0
- **Porta padrão:** 3000

## Como executar

```bash
npm install
cp .env.example .env      # ajuste o JWT_SECRET (obrigatório em produção)
npm start        # sobe a API e as telas em http://localhost:3000
npm run dev      # modo watch (tsx watch)
npm test         # executa os 71 testes automatizados
npm run typecheck
npm run build     # compila para dist/
```

Usuários de demonstração (senha `siglosus123`): `gestor@siglosus.gov.br`,
`farmaceutico@siglosus.gov.br`, `almoxarife@siglosus.gov.br`, `motorista@siglosus.gov.br`,
`admin@siglosus.gov.br`.

## Arquitetura em camadas

```
src/
├── domain/           # Entidades, enums, erros tipados, segurança de senha e regras de negócio
│   ├── entities/
│   ├── security/Senha.ts      # bcrypt + migração de hash legado
│   ├── rules/RegrasNegocio.ts
│   └── enums.ts
├── patterns/         # Padrões de projeto (GoF)
│   ├── singleton/    # ConfiguracaoSistema
│   ├── factory/      # NotificacaoFactory + produtos
│   ├── adapter/      # SistemaSaudeAdapter (e-SUS, HÓRUS, BNAFAR)
│   ├── observer/     # EstoqueSubject + observadores
│   └── strategy/     # EstrategiaRoteirizacao + algoritmos
├── application/      # Serviços de aplicação + Container (injeção de dependência)
│   ├── services/
│   └── Container.ts
└── infrastructure/   # API REST (Express), repositórios, persistência e seed
    ├── http/         # App.ts, routes.ts, middleware/
    ├── security/     # GerenciadorJWT
    ├── repositories/
    ├── database/     # DatabaseMemoria.ts + PersistenciaJSON.ts
    └── seed/SeedData.ts
```

O fluxo de uma requisição é: **Rota → Middleware (autenticação/autorização) → Serviço → Regra de Negócio/Entidade → Repositório → Banco**.
O **domínio não conhece a infraestrutura** (dependências apontam para dentro), e a montagem
concreta ocorre em um único ponto: `application/Container.ts`.

## Segurança

| Mecanismo | Onde | Resultado na API |
|---|---|---|
| bcrypt com salt individual | `domain/security/Senha.ts` | Senhas nunca em texto puro; hashes SHA-256 legados migrados no 1º login |
| JWT assinado (HMAC-SHA256) | `infrastructure/security/GerenciadorJWT.ts` | Token com expiração; adulteração detectada |
| Autenticação das rotas | `infrastructure/http/middleware/autenticacao.ts` | 401 sem token válido |
| Autorização por perfil | `autorizar(...)` em `routes.ts` | 403 quando o perfil não permite |
| Identidade pelo token | `usuarioDaRequisicao(req)` | O corpo da requisição **não** define quem executa |
| Limitação de requisições | `middleware/seguranca.ts` | 429 no login e na recuperação de senha |
| CORS restrito e cabeçalhos | `App.ts` | `X-Content-Type-Options`, `X-Frame-Options`, CSP |
| Proteção de dados pessoais | `usuarioDTO()` em `routes.ts` | Resposta sem CPF e sem hash de senha |
| Revogação de sessão | `AutenticacaoService.encerrarSessao()` | Logout invalida o token no servidor |

**Variáveis de ambiente** (modelo em `.env.example`): `JWT_SECRET`, `TOKEN_ACESSO_VALIDADE_MIN`,
`TOKEN_RECUPERACAO_VALIDIDADE_MIN`, `BCRYPT_COST`, `CORS_ORIGENS`, `LIMITE_LOGIN_POR_MINUTO`,
`SIGLOSUS_ARQUIVO_PERSISTENCIA`, `LIMITE_APROVACAO_GESTOR`, `VALIDADE_MINIMA_TRANSFERENCIA_DIAS`.

## Padrões de projeto

| Padrão | Classes | Onde |
|---|---|---|
| **Singleton** | `ConfiguracaoSistema` | `patterns/singleton/` |
| **Factory Method** | `NotificacaoFactory` (`Email`/`Sms`/`Push`) | `patterns/factory/` |
| **Adapter** | `SistemaSaudeAdapter`, `ESUSAPSAdapter`, `HorusAdapter`, `BnafarAdapter` | `patterns/adapter/` |
| **Observer** | `EstoqueSubject`, `AlertaDesabastecimentoObserver`, `NotificacaoEstoqueObserver` | `patterns/observer/` |
| **Strategy** | `EstrategiaRoteirizacao`, `RotaMenorDistancia`, `RotaPorPrioridade`, `RotaCapacidadeVeiculo`, `Roteirizador` | `patterns/strategy/` |

## Regras de negócio (RN01–RN09)

Centralizadas em `domain/rules/RegrasNegocio.ts`. Quando violadas, lançam `RegraNegocioError`,
que a camada HTTP converte em **HTTP 422**. A API também diferencia os demais casos:
**401** credenciais ausentes ou inválidas, **423** conta bloqueada, **404** recurso
inexistente, **409** conflito de estado, **429** excesso de requisições e **400** requisição inválida.

## Persistência

Sem `SIGLOSUS_ARQUIVO_PERSISTENCIA`, o estado fica apenas em memória (comportamento dos testes).
Com a variável definida, o estado completo é gravado em JSON após cada escrita e restaurado no
arranque (`infrastructure/database/PersistenciaJSON.ts`), de modo que **os dados sobrevivem ao
reinício do processo**. A gravação é atômica. Limitações: sem transações ACID, sem concorrência
entre processos e sem SQL — a migração para SGBD ocorre atrás das mesmas interfaces de repositório.

## Endpoints da API (base `/api`)

Todas as rotas, exceto `/health` e as de autenticação listadas como públicas, exigem o cabeçalho
`Authorization: Bearer <token>`.

| Método | Rota | Requisito | Acesso |
|---|---|---|---|
| GET | `/health` | — (versão, ambiente, regras e padrões) | público |
| POST | `/auth/login` | RF01 | público (limitado por IP) |
| POST | `/auth/recuperar-senha` | RF02 | público (limitado por IP) |
| POST | `/auth/redefinir-senha` | RF02 | público (token de uso único) |
| POST | `/auth/logout` | RF03 | autenticado |
| GET | `/auth/eu` | RF01 | autenticado |
| POST | `/auth/trocar-senha` | RF02 | autenticado |
| GET | `/usuarios` | RF04 | GESTOR, ADMINISTRADOR |
| POST | `/usuarios` | RF04 | GESTOR, ADMINISTRADOR |
| PATCH | `/usuarios/:id` | RF04 | o próprio usuário ou GESTOR/ADMINISTRADOR |
| PATCH | `/usuarios/:id/inativar` | RF04 | ADMINISTRADOR |
| PATCH | `/usuarios/:id/ativar` | RF04 | ADMINISTRADOR |
| GET | `/unidades` | RF05 | autenticado |
| POST | `/unidades` | RF05 | GESTOR, ADMINISTRADOR |
| PATCH | `/unidades/:id` | RF05 | GESTOR, ADMINISTRADOR |
| GET | `/medicamentos` | RF06 | autenticado |
| POST | `/medicamentos` | RF06 | GESTOR, ADMINISTRADOR |
| PATCH | `/medicamentos/:id` | RF06 | GESTOR, ADMINISTRADOR |
| GET | `/estoque` | RF09 | autenticado |
| GET | `/estoque/:id/movimentacoes` | RF08 | autenticado |
| POST | `/estoque/movimentacoes` | RF08 | FARMACEUTICO, ALMOXARIFE, GESTOR, ADMINISTRADOR |
| PATCH | `/estoque/:id/niveis` | RF10 | FARMACEUTICO, GESTOR, ADMINISTRADOR |
| GET | `/alertas` | RF11 | autenticado |
| PATCH | `/alertas/:id/resolver` | RF11 | FARMACEUTICO, GESTOR, ADMINISTRADOR |
| GET | `/previsoes` | RF12 | autenticado |
| POST | `/previsoes/gerar` | RF12 | FARMACEUTICO, GESTOR, ADMINISTRADOR |
| GET | `/transferencias` | RF13 | autenticado |
| POST | `/transferencias/sugerir` | RF13 | FARMACEUTICO, GESTOR, ADMINISTRADOR |
| POST | `/transferencias/:id/aprovar` | RF14 | GESTOR, ADMINISTRADOR |
| POST | `/transferencias/:id/rejeitar` | RF14 | GESTOR, ADMINISTRADOR |
| GET | `/dispensacoes` | RF19 | autenticado |
| POST | `/dispensacoes` | RF19 / RN05 | FARMACEUTICO, GESTOR, ADMINISTRADOR |
| GET | `/requisicoes` | RF20 | autenticado |
| POST | `/requisicoes` | RF20 | FARMACEUTICO, ALMOXARIFE, GESTOR, ADMINISTRADOR |
| POST | `/requisicoes/:id/aprovar` | RF20 / RN09 | GESTOR, ADMINISTRADOR |
| POST | `/requisicoes/:id/rejeitar` | RF20 | GESTOR, ADMINISTRADOR |
| GET | `/rotas` · `/rotas/estrategias` · `/rotas/:id` | RF15 | autenticado |
| POST | `/rotas` | RF15 | ALMOXARIFE, GESTOR, ADMINISTRADOR |
| POST | `/rotas/:id/despachar` | RF16 | ALMOXARIFE, GESTOR, ADMINISTRADOR |
| GET | `/rotas/:id/posicoes` | RF16 | MOTORISTA, ALMOXARIFE, GESTOR, ADMINISTRADOR |
| POST | `/rotas/:id/posicoes` | RF16 | MOTORISTA, ALMOXARIFE, GESTOR, ADMINISTRADOR |
| GET | `/entregas` · `/entregas/rota/:rotaId` | RF16 | autenticado |
| POST | `/entregas/:id/confirmar` | RF17 | FARMACEUTICO, ALMOXARIFE, GESTOR, ADMINISTRADOR |
| GET | `/integracoes` | RF07 | autenticado |
| POST | `/integracoes/sincronizar` | RF07 | GESTOR, ADMINISTRADOR |
| GET | `/relatorios/dashboard` · `/relatorios` | RF21 | autenticado |
| POST | `/relatorios` | RF21 | FARMACEUTICO, GESTOR, ADMINISTRADOR |
| GET | `/auditoria` | RF22 | GESTOR, ADMINISTRADOR |

## Testes

A suíte (71 testes em 7 arquivos) comprova regras, padrões, serviços, API, segurança e persistência:

| Arquivo | Cobertura | Testes |
|---|---|---|
| `tests/regras-negocio.test.ts` | RN01 a RN09 | 10 |
| `tests/padroes-projeto.test.ts` | Singleton, Factory, Adapter, Observer, Strategy | 7 |
| `tests/servicos.test.ts` | Autenticação, estoque, RF14/RF17, RF19/RN05, RN06, RN09, rotas, entregas, integração, previsão, painel | 14 |
| `tests/seguranca.test.ts` | bcrypt, migração de hash legado, JWT (assinatura, adulteração, expiração), revogação por logout | 8 |
| `tests/requisitos.test.ts` | RF02, RF03, RF04, RF05, RF06, RF16 e autorização por perfil | 11 |
| `tests/persistencia.test.ts` | Persistência em arquivo e sobrevivência dos dados ao reinício | 4 |
| `tests/api.test.ts` | Endpoints REST, RF19, RF20/RN09, ausência de `senhaHash`, 401/403/404/423 | 17 |

**Fluxo de transferência e entrega:** a aprovação da transferência (RF14) debita a
origem (mercadoria em trânsito). O despacho da rota (RF16) cria os itens da entrega a
partir das transferências aprovadas e, na confirmação de recebimento (RF17), o destino
é creditado, a transferência é concluída e a rota é encerrada.

```bash
npm test
```
