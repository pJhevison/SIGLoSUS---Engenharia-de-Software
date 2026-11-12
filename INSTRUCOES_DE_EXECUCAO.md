# SIGLoSUS — Instruções de instalação e execução

Este pacote contém o projeto **SIGLoSUS** na versão **2.1.0** (branch `develop`), com as correções
aplicadas na auditoria de 12/11/2026. O relatório completo das correções está em
`RELATORIO_FINAL_DE_CORRECOES.md`.

## 1. Pré-requisitos

- **Node.js 20+** (testado no Node 20 e no Node 22) e **npm 10+**.
- Navegador moderno (Chrome, Edge, Firefox). As telas são servidas pela própria API.
- Nenhum banco de dados externo: a persistência é feita em arquivo JSON local.

## 2. Instalação

```bash
cd "pasta 02/siglosus/backend"
npm install
```

## 3. Configuração

```bash
cp .env.example .env
```

Edite o `.env` e defina **obrigatoriamente**:

| Variável | Descrição |
|---|---|
| `JWT_SECRET` | Segredo de assinatura dos tokens (mínimo de 32 caracteres). Gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SIGLOSUS_ARQUIVO_PERSISTENCIA` | Opcional. Ex.: `./data/siglosus.json`. Sem ela, os dados ficam apenas em memória |
| `PORT` | Porta da API (padrão 3000) |
| `CORS_ORIGENS` | Origens permitidas (padrão: `http://localhost:3000,http://127.0.0.1:3000`) |
| `BCRYPT_COST` | Fator de custo do hash de senha (padrão 10) |
| `LIMITE_LOGIN_POR_MINUTO` | Tentativas de login por minuto e por IP (padrão 10) |

Todas as variáveis e seus significados estão documentados em `pasta 02/siglosus/backend/.env.example`.

## 4. Execução

```bash
npm start          # API e telas em http://localhost:3000
npm run dev        # modo watch (recompila ao salvar)
```

Acesse `http://localhost:3000/` no navegador.

**Usuários de demonstração** (senha `siglosus123`):

| E-mail | Perfil | Pode, por exemplo |
|---|---|---|
| `admin@siglosus.gov.br` | ADMINISTRADOR | tudo, inclusive inativar contas |
| `gestor@siglosus.gov.br` | GESTOR | aprovar transferências e requisições (RN09) |
| `farmaceutico@siglosus.gov.br` | FARMACEUTICO | movimentar estoque e dispensar ao paciente |
| `almoxarife@siglosus.gov.br` | ALMOXARIFE | gerar rotas e despachar entregas |
| `motorista@siglosus.gov.br` | MOTORISTA | reportar a posição da rota |

## 5. Testes e verificação

```bash
npm run typecheck   # verificação de tipos (tsc --noEmit)
npm test            # 71 testes automatizados (7 arquivos)
npm run build       # compilação para dist/
```

## 6. Documentação

- `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.pdf` — documento final (41 páginas, 27 figuras, 10 tabelas).
- `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.html` — versão navegável.
- `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.md` — fonte em Markdown.
- `pasta 01/SIGLoSUS/diagramas/` — fontes Mermaid dos diagramas UML.

## 7. Limitações conhecidas

1. A persistência é feita em arquivo JSON: não há transações ACID nem SGBD relacional.
2. A sincronização com e-SUS APS, HÓRUS/SNA e BNAFAR é simulada com dados locais.
3. O rastreamento de rota usa a posição reportada pelo dispositivo (sem hardware GPS dedicado).
4. O e-mail de recuperação de senha depende de um serviço externo, não incluído no protótipo.
5. Não foram executados ensaios de desempenho, disponibilidade, escalabilidade ou acessibilidade.

O detalhamento completo está em `RELATORIO_FINAL_DE_CORRECOES.md`.
