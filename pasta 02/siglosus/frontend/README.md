# SIGLoSUS — Front-end (protótipos navegáveis)

> *"Logística que salva vidas."*

Telas do **SIGLoSUS** (seção 6 — Prototipação das Telas). São **protótipos navegáveis** que
**consomem a API REST real** do backend: os dados exibidos (estoque, alertas, rotas, entregas)
são produzidos pelo servidor em execução.

- **Stack:** HTML5 · CSS3 · JavaScript (vanilla, sem framework)
- **Servido por:** o próprio backend, em `http://localhost:3000/`
- **Versão:** 2.0.0 (Parte 2)

## Como executar

O front-end é servido estaticamente pelo backend:

```bash
cd ../backend
npm install
npm start        # abre http://localhost:3000/
```

> As telas usam `assets/js/api.js`, que aponta para `/api` na mesma origem. Se você abrir os
> arquivos diretamente via `file://`, o cliente usa `http://localhost:3000/api` como fallback —
> nesse caso, mantenha o backend rodando.

## Telas

| Arquivo | Área | Casos de uso / Requisitos |
|---|---|---|
| `index.html` | Acesso (login) | UC01 · RF01, RF02, RF03 |
| `dashboard.html` | Painel gerencial | UC07, UC09 · RF21, RF09, RF11 |
| `estoque.html` | Estoque em tempo real | UC08, UC09 · RF08, RF09, RF10, RF18 |
| `alertas.html` | Alertas de desabastecimento | UC11 · RF11 |
| `redistribuicao.html` | Redistribuição entre unidades | UC13, UC14 · RF13, RF14 |
| `rotas.html` | Rotas de distribuição | UC16 · RF15, RF16 |
| `entregas.html` | Entregas | UC17, UC18 · RF16, RF17 |
| `integracoes.html` | Integrações com sistemas de saúde | UC07 · RF07 |
| `relatorios.html` | Relatórios e previsão de demanda | UC12 · RF12, RF21 |
| `cadastros.html` | Cadastros e auditoria | UC01, UC04 · RF04, RF05, RF06, RF22 |

## Estrutura

```
frontend/
├── index.html            # Login
├── dashboard.html
├── estoque.html
├── alertas.html
├── redistribuicao.html
├── rotas.html
├── entregas.html
├── integracoes.html
├── relatorios.html
├── cadastros.html
└── assets/
    ├── css/styles.css    # Layout (menu lateral, cartões, tabelas, badges)
    └── js/
        ├── api.js        # Cliente REST + sessão (localStorage)
        ├── layout.js     # Sidebar, barra superior e utilitários (toast, badges)
        └── paginas/      # Script de cada tela
```

## Acessibilidade e usabilidade

Interface responsiva, com foco no nível **AA** das diretrizes **WCAG 2.1** (RNF06): contraste
adequado, rótulos em formulários, textos legíveis e navegação consistente por menu lateral.
