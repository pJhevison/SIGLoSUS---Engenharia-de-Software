# SIGLoSUS — Backend (API REST)

> *"Logística que salva vidas."*

Backend do **SIGLoSUS — Sistema Inteligente de Gestão Logística e Distribuição de Medicamentos do SUS**.
Implementa o **domínio**, as **9 regras de negócio (RN01–RN09)**, os **5 padrões de projeto** e os
**serviços de aplicação** que sustentam as telas da seção 6 da documentação.

- **Stack:** Node.js 20+ · TypeScript · Express · Vitest + Supertest
- **Versão:** 2.0.0 (Parte 2)
- **Porta padrão:** 3000

## Como executar

```bash
npm install
npm start        # sobe a API e as telas em http://localhost:3000
npm run dev      # modo watch (tsx watch)
npm test         # executa os 45 testes automatizados
npm run typecheck
```

Usuários de demonstração (senha `siglosus123`): `gestor@siglosus.gov.br`,
`farmaceutico@siglosus.gov.br`, `almoxarife@siglosus.gov.br`, `motorista@siglosus.gov.br`,
`admin@siglosus.gov.br`.

## Arquitetura em camadas

```
src/
├── domain/           # Entidades, enums e regras de negócio (RN01–RN09) — não depende de nada
│   ├── entities/
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
└── infrastructure/   # API REST (Express), repositórios, banco em memória e seed
    ├── http/         # App.ts, routes.ts
    ├── repositories/
    ├── database/DatabaseMemoria.ts
    └── seed/SeedData.ts
```

O fluxo de uma requisição é: **Rota → Serviço → Regra de Negócio/Entidade → Repositório → Banco**.
O **domínio não conhece a infraestrutura** (dependências apontam para dentro), e a montagem
concreta ocorre em um único ponto: `application/Container.ts`.

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
**401** para credenciais inválidas, **423** para conta bloqueada, **404** para recurso
inexistente, **409** para conflito de estado e **400** para requisição inválida.

## Endpoints da API (base `/api`)

| Método | Rota | Requisito |
|---|---|---|
| GET | `/health` | — (versão, ambiente, regras e padrões) |
| POST | `/auth/login` | RF01 |
| GET | `/usuarios` | RF04 |
| POST | `/usuarios` | RF04 |
| PATCH | `/usuarios/:id/inativar` | RF04 |
| GET | `/unidades` | RF05 |
| GET | `/medicamentos` | RF06 |
| GET | `/estoque` | RF09 |
| GET | `/estoque/:id/movimentacoes` | RF08 |
| POST | `/estoque/movimentacoes` | RF08 |
| PATCH | `/estoque/:id/niveis` | RF10 |
| GET | `/alertas` | RF11 |
| PATCH | `/alertas/:id/resolver` | RF11 |
| GET | `/previsoes` | RF12 |
| POST | `/previsoes/gerar` | RF12 |
| GET | `/transferencias` | RF13 |
| POST | `/transferencias/sugerir` | RF13 |
| POST | `/transferencias/:id/aprovar` | RF14 |
| POST | `/transferencias/:id/rejeitar` | RF14 |
| GET | `/dispensacoes` | RF19 |
| POST | `/dispensacoes` | RF19 / RN05 |
| GET | `/requisicoes` | RF20 |
| POST | `/requisicoes` | RF20 |
| POST | `/requisicoes/:id/aprovar` | RF20 / RN09 |
| POST | `/requisicoes/:id/rejeitar` | RF20 |
| GET | `/rotas` · `/rotas/estrategias` · `/rotas/:id` | RF15 |
| POST | `/rotas` | RF15 |
| POST | `/rotas/:id/despachar` | RF16 |
| GET | `/entregas` · `/entregas/rota/:rotaId` | RF16 |
| POST | `/entregas/:id/confirmar` | RF17 |
| GET | `/integracoes` | RF07 |
| POST | `/integracoes/sincronizar` | RF07 |
| GET | `/relatorios/dashboard` · `/relatorios` | RF21 |
| POST | `/relatorios` | RF21 |
| GET | `/auditoria` | RF22 |

## Testes

A suíte (45 testes) comprova regras, padrões, serviços, API e status HTTP:

| Arquivo | Cobertura |
|---|---|
| `tests/regras-negocio.test.ts` | RN01 a RN09 |
| `tests/padroes-projeto.test.ts` | Singleton, Factory, Adapter, Observer, Strategy |
| `tests/servicos.test.ts` | Autenticação, estoque, RF14/RF17, RF19/RN05, RN06, RN09, rotas, entregas, integração, previsão, painel |
| `tests/api.test.ts` | Endpoints REST, RF20/RN09, ausência de `senhaHash`, 401/404/423 |

**Fluxo de transferência e entrega:** a aprovação da transferência (RF14) debita a
origem (mercadoria em trânsito). O despacho da rota (RF16) cria os itens da entrega a
partir das transferências aprovadas e, na confirmação de recebimento (RF17), o destino
é creditado, a transferência é concluída e a rota é encerrada.

```bash
npm test
```
