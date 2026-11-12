# SIGLoSUS — Sistema Inteligente de Gestão Logística e Distribuição de Medicamentos do SUS

> *"Logística que salva vidas."*

Projeto de Engenharia de Software (UFAM/ICET) que propõe um sistema para **reduzir a falta de medicamentos nas farmácias do SUS**.

## O problema

A falta de medicamentos nas unidades de saúde do SUS decorre, em grande parte de:

- ausência de uma **visão consolidada de estoque** entre as unidades;
- **processos manuais e descentralizados**;
- dificuldade de **prever a demanda**;
- **rotas de distribuição ineficientes**.

## A proposta

O SIGLoSUS **integra-se aos sistemas já existentes** (e-SUS APS, HÓRUS/SNA, BNAFAR) para dar visão em tempo real do estoque e, a partir dela, **agir de forma proativa**: prever demanda, alertar sobre risco de desabastecimento, sugerir transferências entre unidades e **gerar rotas de distribuição otimizadas** — para que o medicamento chegue mais rápido e onde é necessário.

O objetivo não é apenas uma gestão de estoque eficiente: é **salvar vidas**.

## Organização do repositório

O trabalho está organizado por partes (entregas). Cada parte fica em sua própria pasta.

```
SIGLoSUS---Engenharia-de-Software/
├── README.md                               # Este arquivo
├── CONTRIBUTING.md                         # Práticas de versionamento (Git Flow, commits semânticos)
├── CHANGELOG.md                            # Histórico de versões (Keep a Changelog)
├── .github/                                # CI (GitHub Actions) e template de pull request
├── .gitignore
├── pasta 01/                               # Parte 1 — Modelagem UML (seções 1 a 3.5)
│   ├── Projeto_SUSLog.md                   # Escopo inicial do projeto
│   └── SIGLoSUS/
│       ├── diagramas/                      # Fontes Mermaid das figuras 01–09 + gerador do caso de uso
│       └── imagens/                        # Versões vetoriais (SVG) das figuras 01–09
└── pasta 02/                               # Parte 2 — Arquitetura, Padrões e Prototipação (seções 4 a 6)
    ├── docs/                               # Documentação completa consolidada (md, html, pdf)
    ├── diagramas/                          # Fontes Mermaid das seções 4 e 5
    ├── imagens/                            # Figuras 01–17 + telas/ (capturas da seção 6)
    └── siglosus/
        ├── backend/                        # API REST em Node.js + TypeScript (ver README)
        └── frontend/                       # Telas navegáveis (seção 6) (ver README)
```

## Documentação

### Parte 1 — Introdução, Requisitos e Diagramas UML (seções 1 a 3.5)

1. **Introdução** — 1.1 Descrição Geral do Sistema · 1.2 Descrição dos Usuários
2. **Requisitos Gerais do Sistema** — 2.1 Requisitos Funcionais (22) · 2.2 Requisitos Não-Funcionais (13) · 2.3 Regras de Negócio (9)
3. **Diagramas UML** — 3.1 Casos de Uso · 3.2 Especificação dos Casos de Uso (7) · 3.3 Sequência (4) · 3.4 Atividades (3) · 3.5 Classes

### Parte 2 — Arquitetura, Padrões e Prototipação (seções 4 a 6)

4. **Arquitetura** — visão em camadas (Apresentação, Aplicação, Domínio, Infraestrutura), diagramas de componentes e de implantação, padrão Repository e injeção de dependência, rastreabilidade requisitos × componentes
5. **Padrões de Projeto** — **Singleton**, **Factory Method**, **Adapter**, **Observer** e **Strategy**, cada um com diagrama, código e rastreabilidade
6. **Prototipação das Telas** — 10 telas navegáveis que consomem a API REST real

O **documento consolidado** (seções 1 a 6) está em `pasta 02/docs/`:

- `Documentacao_SIGLoSUS_Parte2.pdf` — **documento final para entrega** (ABNT, 27 figuras, 10 tabelas)
- `Documentacao_SIGLoSUS_Parte2.html` — versão navegável
- `Documentacao_SIGLoSUS_Parte2.md` — fonte

## Como executar o software

O backend (API REST + telas) usa **Node.js 20+**:

```bash
cd "pasta 02/siglosus/backend"
npm install
cp .env.example .env      # ajuste o JWT_SECRET (obrigatório em produção)
npm start                  # API e telas em http://localhost:3000
npm test                   # 71 testes automatizados
npm run build              # compilação TypeScript para dist/
```

Acesse `http://localhost:3000/` no navegador. Usuários de demonstração (senha `siglosus123`):
`gestor@siglosus.gov.br`, `farmaceutico@siglosus.gov.br`, `almoxarife@siglosus.gov.br`,
`motorista@siglosus.gov.br`, `admin@siglosus.gov.br`.

### Variáveis de ambiente

Todas as variáveis estão documentadas em `pasta 02/siglosus/backend/.env.example`. As principais:

| Variável | Função | Padrão |
|---|---|---|
| `JWT_SECRET` | Segredo de assinatura dos tokens (obrigatório em produção, mínimo de 32 caracteres) | gerado aleatoriamente em desenvolvimento |
| `TOKEN_ACESSO_VALIDADE_MIN` | Validade do token de acesso | 60 |
| `TOKEN_RECUPERACAO_VALIDIDADE_MIN` | Validade do token de recuperação de senha | 30 |
| `BCRYPT_COST` | Fator de custo do hash de senha | 10 |
| `CORS_ORIGINS` | Origens permitidas no CORS | lista local padrão |
| `LIMITE_LOGIN_POR_MINUTO` | Tentativas de login por minuto e por IP | 10 |
| `SIGLOSUS_ARQUIVO_PERSISTENCIA` | Arquivo de persistência do estado (vazio = somente memória) | vazio |

### Segurança implementada

- Senhas com **bcrypt** (salt individual) — nunca SHA-256 simples nem texto puro; hashes legados são migrados no primeiro login.
- Sessão por **JWT assinado** (HMAC-SHA256), com expiração, revogação no logout e invalidação após troca de senha.
- **Todas as rotas privadas exigem autenticação** e **autorização por perfil**; a identidade vem do token, nunca do corpo da requisição.
- Respostas de usuário **sem CPF e sem hash**; dados da API escapados antes de irem para o HTML.
- Limitação de requisições no login (HTTP 429), CORS restrito e cabeçalhos de segurança.

### Limitações conhecidas

- A **persistência é em arquivo JSON** (garante que os dados sobrevivam ao reinício), sem transações ACID nem SGBD relacional.
- A **sincronização com e-SUS APS, HÓRUS/SNA e BNAFAR é simulada** com dados locais; a integração real depende de credenciais e homologação concedidas por terceiros.
- O **rastreamento de rota** usa a posição reportada pelo dispositivo; não há integração com hardware GPS dedicado.
- **Não foram executados ensaios** de desempenho, disponibilidade, escalabilidade ou acessibilidade (WCAG 2.1 AA): esses RNFs permanecem como metas declaradas.

Detalhes em [`pasta 02/siglosus/backend/README.md`](pasta%2002/siglosus/backend/README.md) e
[`pasta 02/siglosus/frontend/README.md`](pasta%2002/siglosus/frontend/README.md).

## Padrões de projeto implementados

| Padrão | Categoria | Problema que resolve |
|---|---|---|
| **Singleton** | Criacional | Configuração única e compartilhada da aplicação |
| **Factory Method** | Criacional | Notificações por e-mail, SMS e push sem acoplar o chamador |
| **Adapter** | Estrutural | Integrar e-SUS APS, HÓRUS/SNA e BNAFAR (formatos distintos) |
| **Observer** | Comportamental | Reagir a movimentações de estoque (alertas/notificações) |
| **Strategy** | Comportamental | Alternar algoritmos de roteirização em tempo de execução |

## Como visualizar os diagramas

- **Markdown:** abra `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.md` no VS Code (extensão Markdown Preview Mermaid) ou no GitHub.
- **HTML:** abra `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.html` no navegador.
- **Imagens:** as figuras já estão prontas em `pasta 02/imagens/` (`.png` e `.svg`).
- **Editar diagramas:** altere os arquivos `.mmd` em `pasta 02/diagramas/` e renderize com o [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) (`mmdc -i arquivo.mmd -o arquivo.png`).

## Versionamento

O projeto adota **Git Flow** (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`),
**commits semânticos** (`tipo(escopo): descrição`) e **versionamento semântico** (tags `v1.0.0`
para a Parte 1, `v2.0.0` para a Parte 2 e `v2.1.0` para a versão auditada e corrigida).
A branch `develop` é a linha de integração contínua, `main` recebe apenas merges de
`release/*` e `hotfix/*`, e branches `feature/*`, `release/*` e `hotfix/*` são temporárias.
As convenções completas estão em [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licença

Projeto distribuído sob a licença **Apache License 2.0** (arquivo `LICENSE` na raiz do repositório).

## Documentos de referência utilizados

- *Modelo de Projeto – Padrão ISO* (template da disciplina) — estrutura seguida.
- *Técnicas de Identificação e Escrita de Requisitos* — padronização de RF, RNF e RN.
- *Sintaxe de Caso de Uso* — convenções de atores, casos de uso, `<<include>>` e `<<extend>>`.
- *Revisão de Programação Orientada a Objetos* — base para o diagrama de classes.
- *Gerência de Configuração* — Git Flow, commits semânticos e SemVer.

## Entrega

O material enviado ao professor é o **documento consolidado** e o **software**:

- **Documento (seções 1 a 6, em normas ABNT):** `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.pdf`
  (41 páginas, 27 figuras e 10 tabelas), com as fontes em `.md` e `.html` na mesma pasta.
- **Software:** `pasta 02/siglosus/` — backend (API REST) e front-end (telas), com os testes automatizados.
- **Diagramas:** fontes Mermaid em `pasta 01/SIGLoSUS/diagramas/` (figuras 01–09) e `pasta 02/diagramas/`
  (figuras 10–17), com as figuras renderizadas em `pasta 02/imagens/`.
- **Relatório de auditoria e correções:** `RELATORIO_FINAL_DE_CORRECOES.md`.
- **Instruções de execução:** `INSTRUCOES_DE_EXECUCAO.md`.
