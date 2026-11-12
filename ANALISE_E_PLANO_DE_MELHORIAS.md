# SIGLoSUS — Análise técnica, conformidade e plano de melhorias

**Projeto:** Sistema Inteligente de Gestão Logística e Distribuição de Medicamentos do SUS
**Disciplina:** Engenharia de Software B — Prof. Walter Jonas (UFAM/ICET)
**Documento analisado:** `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.md` (versão consolidada, Partes 1 e 2)
**Software analisado:** `pasta 02/siglosus/backend` (Node.js + TypeScript + Express) e `pasta 02/siglosus/frontend`
**Data da análise:** 12/11/2026

---

## 1. Resumo executivo

O trabalho está em um nível acima da média: a documentação cobre as seis seções exigidas, tem 17 figuras, os diagramas UML são coerentes entre si, os **33 testes automatizados passam** (4 arquivos, exatamente como o documento afirma) e as telas consomem a API real — não são mockups estáticos.

O risco não está no volume de documentação, e sim em **três pontos em que o documento promete um comportamento que o software não executa**. Como 8,0 dos 10,0 são atribuídos justamente à compatibilidade documentação ↔ software, esses pontos concentram o risco da nota:

| # | Risco | Onde | Impacto |
|---|---|---|---|
| 1 | Aprovar transferência **não movimenta estoque** e não gera entrega | `TransferenciaService.aprovar` / doc, pós-condição do UC14 | Alto |
| 2 | Confirmar recebimento pela tela **não dá entrada no estoque** (a tela não envia `itens`) | `entregas.js` + `EntregaService` | Alto |
| 3 | RN05, RN06 e RN09 existem só como método estático + teste; **nenhum fluxo real as aplica** | `RegrasNegocio.ts` / Tabela 10 | Alto |
| 4 | Não existe **nenhum Pull Request** no GitHub, nem CI, nem CHANGELOG/Release | repositório | Médio-alto (vale 2,0) |

Somando os ajustes P0 (seção 6), o esforço estimado é de **2 a 4 dias de trabalho**, compatível com o prazo de 01/12/2026.

---

## 2. Como o trabalho será avaliado (e o que isso implica)

| Critério | Peso | O que o professor vai verificar |
|---|---|---|
| Compatibilidade documentação ↔ software | **8,0** | Se cada RF, RN, caso de uso, padrão e tela descritos existem e funcionam no código |
| Práticas de versionamento | **2,0** | `.gitignore`, branches, commits semânticos, **PRs**, tags/releases, histórico no GitHub |

**Consequência prática:** não basta o código funcionar — o comportamento precisa ser **demonstrável** e o histórico precisa ser **visível no GitHub**. Um recurso implementado mas não documentado não pontua; um recurso documentado mas não implementado **desconta**.

---

## 3. Matriz de conformidade com o enunciado

### 3.1 Estrutura do documento

| Item exigido | Situação | Observação |
|---|---|---|
| 1.1 Descrição Geral do Sistema | ✅ | Boa; falta declarar explicitamente o que **não** foi implementado (ver 3.3) |
| 1.2 Descrição dos Usuários | ✅ | Perfis e responsabilidades bem definidos |
| 2.1 Requisitos Funcionais (RF01–RF22) | ⚠️ | 22 RFs, mas 6 não têm implementação correspondente |
| 2.2 Requisitos Não-Funcionais | ⚠️ | Vários são aspiracionais (RNF13 offline, RNF07 FHIR, RNF01 TLS) |
| 2.3 Regras de Negócio (RN01–RN09) | ⚠️ | 3 das 9 não são aplicadas em nenhum fluxo |
| 3.1 Diagrama de Casos de Uso | ✅ | Atores, includes/extends e vínculo com RFs |
| 3.2 Especificação dos Casos de Uso | ✅ | 7 UCs completos — mas a pós-condição do UC14 não se verifica |
| 3.3 Diagramas de Sequência | ✅ | 4 diagramas |
| 3.4 Diagramas de Atividades | ✅ | 3 diagramas |
| 3.5 Diagrama de Classes | ⚠️ | Divergências de métodos e de associação (ver 5.4) |
| 4. Arquitetura | ✅ | Camadas, componentes e rastreabilidade bem explicados |
| 5. Padrões de Projeto | ⚠️ | Os 5 padrões existem, mas 2 são "decorativos" (ver 5.5) |
| 6. Prototipação das Telas | ✅ | 10 telas navegáveis, capturas atualizadas |
| Repositório GitHub | ⚠️ | Git Flow e tags OK; faltam PRs, CI e Release |

### 3.2 Situação por requisito funcional

| RF | Descrição resumida | Situação real |
|---|---|---|
| RF01 | Login | ✅ Implementado |
| RF02 | Recuperar senha | ❌ Ausente (documentado como se existisse) |
| RF03 | Logout | 🟡 Apenas no cliente (`Sessao.sair()`); sem endpoint |
| RF04 | Cadastrar/editar/inativar usuários | 🟡 Cadastro e inativação OK; **edição ausente** |
| RF05 | Cadastrar/manter unidades | 🟡 Só `GET /api/unidades` (sem criar/editar) |
| RF06 | Cadastrar/manter medicamentos | 🟡 Só `GET /api/medicamentos` |
| RF07 | Integrar com e-SUS/HÓRUS/BNAFAR | ✅ Adapters (dados simulados) |
| RF08 | Registrar movimentações | ✅ Com ressalva no `AJUSTE` (ver 4.4) |
| RF09 | Estoque consolidado | ✅ |
| RF10 | Níveis mínimo/segurança | ✅ |
| RF11 | Alertas automáticos | ✅ (gera duplicados — ver 4.5) |
| RF12 | Previsão de demanda | ✅ Média móvel de 90 dias |
| RF13 | Sugerir transferências | ✅ (duplica ao repetir o clique) |
| RF14 | Aprovar/rejeitar transferências | 🟡 Aprova, mas **não movimenta estoque** |
| RF15 | Gerar rotas otimizadas | ✅ Strategy (com falha na capacidade — 4.6) |
| RF16 | Despachar rota | ✅ (sem guarda de status) |
| RF17 | Confirmar recebimento | 🟡 Backend pronto; **tela não envia itens** |
| RF18 | Lotes e validade (FEFO) | 🟡 FEFO na saída; `AJUSTE` desalinha lotes |
| RF19 | Dispensação ao paciente | ❌ Só entidade + repositório ("domínio") |
| RF20 | Requisições de medicamentos | ❌ Só entidade + repositório ("domínio") |
| RF21 | Relatórios e painéis | ✅ |
| RF22 | Auditoria | 🟡 Registra, mas o `usuarioId` vem do corpo da requisição |

### 3.3 Requisitos não-funcionais

| RNF | Situação | Comentário |
|---|---|---|
| RNF01 (senhas/dados sensíveis) | 🟡 | SHA-256 **sem salt**; `senhaHash` vaza na API; sem TLS no protótipo |
| RNF06 (WCAG AA) | 🟡 | Melhorou com ícones `aria-hidden`; faltam foco visível e `aria-live` no toast |
| RNF07 (REST + HL7 FHIR) | 🟡 | REST OK; FHIR não implementado |
| RNF09 (transações tudo-ou-nada) | ❌ | Banco em memória, sem atomicidade |
| RNF12 (modularidade/testes) | ✅ | 33 testes, camadas bem separadas |
| RNF13 (offline do motorista) | ❌ | Não implementado |

**Recomendação:** transformar essa tabela em um **Anexo de conformidade** dentro do PDF. Declarar o que é protótipo e o que é aspiracional **protege a nota** — o professor prefere um escopo honesto a uma promessa não cumprida.

---

## 4. Achados críticos de compatibilidade (P0)

### 4.1 Aprovar transferência não movimenta estoque (RF14 / UC14)

**Evidência:** `backend/src/application/services/TransferenciaService.ts:95-111` valida RN01/RN03, chama `transferencia.aprovar()` e retorna. O método `Transferencia.concluir()` (`domain/entities/Transferencia.ts:27`) **nunca é chamado**; nenhum `EstoqueService` é injetado no serviço.

**O documento promete** (linha 323): *"Aprovada, a transferência é registrada e passa a compor as entregas a serem roteirizadas."*

**Correção mínima** (fecha RF14 e a pós-condição do UC14):

```ts
// TransferenciaService: injetar EstoqueService no construtor
aprovar(id: number, usuarioId: number): Transferencia {
  const t = this.obterSugerida(id);
  const origem = this.estoques.buscarPorUnidadeEMedicamento(t.unidadeOrigemId, t.medicamentoId);
  if (!origem) throw new RegraNegocioError('RN01', 'Estoque de origem não encontrado.');
  RegrasNegocio.validarRN01_OrigemAcimaDoSeguranca(origem, t.quantidade);
  if (!this.temLoteTransferivel(origem.lotes)) {
    throw new RegraNegocioError('RN03', 'A origem não possui lote com validade ≥ 90 dias.');
  }

  // Saída na origem (aplica FEFO via RN02)
  this.estoqueService.registrarMovimentacao({
    estoqueId: origem.id, tipo: TipoMovimentacao.TRANSFERENCIA,
    quantidade: t.quantidade, usuarioId,
    observacao: `Transferência ${id} → unidade ${t.unidadeDestinoId}`,
  });

  // Entrada no destino
  const destino = this.estoques.buscarPorUnidadeEMedicamento(t.unidadeDestinoId, t.medicamentoId);
  if (destino) {
    this.estoqueService.registrarMovimentacao({
      estoqueId: destino.id, tipo: TipoMovimentacao.ENTRADA,
      quantidade: t.quantidade, usuarioId, observacao: `Transferência ${id} recebida`,
    });
  }

  t.aprovar();
  t.concluir();
  this.auditoria.registrar(usuarioId, 'APROVAR_TRANSFERENCIA', 'transferencia', `Transferência ${id}`, true);
  return t;
}
```

Adicionar teste em `tests/servicos.test.ts`: aprovar → `origem.quantidadeAtual` cai, `destino.quantidadeAtual` sobe, lote mais próximo do vencimento é debitado.

### 4.2 Confirmar recebimento pela tela não dá entrada no estoque (RF17 / UC18)

**Evidência:** `EntregaService.confirmarRecebimento` (`EntregaService.ts:60-83`) só movimenta estoque se receber `dados.itens`. A tela (`frontend/assets/js/paginas/entregas.js:31-37`) envia apenas `{ usuarioId, divergencia, observacao }` — ou seja, **`itens` é sempre vazio**.

**O documento promete** (linha 784): *"Ao confirmar, o estoque da unidade de destino é atualizado."*

**Correção:** modelar os itens da entrega.

1. Criar `EntregaItem` (`estoqueId`, `quantidade`, `loteId?`) e associar `Entrega` → `EntregaItem[]` — isso também resolve a associação `Entrega "1" --> "0..*" Lote` do diagrama de classes, hoje inexistente no código.
2. Em `despachar()`, gerar os itens a partir das transferências aprovadas da rota (ou de um payload).
3. Expor `GET /api/entregas/:id` (ou incluir `itens` em `GET /api/entregas`).
4. Na tela, montar o formulário de conferência com os itens e enviar `itens` no `confirmar` (quantidade conferida por item; divergência = diferença).

Alternativa mais barata para a entrega: exibir os itens e enviar a lista, mantendo a quantidade prevista editável.

### 4.3 RN05, RN06 e RN09 não são aplicadas (só testadas)

**Evidência:** `domain/rules/RegrasNegocio.ts:75-123` define `validarRN05_ConferenciaDupla`, `prioridadeRENAME` e `validarRN09_AprovacaoGestor`. Um `grep` no `src` mostra que **só os testes as chamam**. A Tabela 10 (linha 831) mapeia a tela de Cadastros para RN05/RN06, o que não se sustenta.

**Opções (escolha uma e alinhe o documento):**

- **A — Implementar de verdade (recomendado para RN09 e RN06):**
  - RN09: em `TransferenciaService.aprovar` (ou em um futuro fluxo de requisição), calcular o valor (`quantidade × custoUnitario`) e exigir perfil `GESTOR` acima do limite configurado. Hoje **não há middleware de perfil**, então isso exige também o item 5.2.
  - RN06: em `RotaService.calcularPrioridade`, somar um bônus para medicamentos `rename === true`, de modo que a ordenação por prioridade reflita a política.
  - RN05: depende de RF19 (dispensação). Sem RF19, **não há onde aplicar**.
- **B — Reduzir o escopo declarado:** mover RN05 para "prevista (v2.1)" na tabela 2.3, remover RN05/RN06 da Tabela 10 e explicar na seção 1.1. Custa menos e é honesto.

> **Sugestão forte:** adotar A para RN06 e RN09 (poucas linhas, alto impacto na demonstração) e B para RN05.

### 4.4 `AJUSTE` quebra o FEFO

**Evidência:** `EstoqueService.ts:131-133` — `AJUSTE` sobrescreve `quantidadeAtual` sem tocar em `estoque.lotes`. Como a sincronização externa usa `AJUSTE` (`IntegracaoService.ts:84-90`), após sincronizar, a soma dos lotes ≠ `quantidadeAtual`, e a próxima saída FEFO debita lotes errados.

**Correção:** aplicar o ajuste proporcionalmente aos lotes (ou registrar a diferença como entrada/saída), e validar `quantidade >= 0` e `Number.isFinite`. Exemplo:

```ts
case TipoMovimentacao.AJUSTE: {
  const delta = dados.quantidade - estoque.quantidadeAtual;
  if (delta > 0) {
    // cria/atualiza lote informado ou lote "ajuste" com validade padrão
  } else if (delta < 0) {
    this.baixarLotesFEFO(estoque, Math.abs(delta));
  }
  estoque.quantidadeAtual = dados.quantidade;
  break;
}
```

### 4.5 Alertas duplicados e sugestões duplicadas

- `AlertaService.tratar` (`AlertaService.ts:15-27`) sempre cria um alerta novo. Cada nova saída abaixo do mínimo gera outro alerta do mesmo estoque. **Correção:** antes de salvar, verificar se já existe alerta `ABERTO` para `estoqueId`; se existir, atualizar o nível de risco. Bônus: resolver automaticamente quando o estoque voltar acima do mínimo.
- `TransferenciaService.sugerir` (`:37-92`) não verifica sugestões `SUGERIDA` já existentes. Clicar duas vezes duplica tudo. **Correção:** ignorar pares (origem, destino, medicamento) que já tenham sugestão pendente.

### 4.6 Capacidade do veículo "nunca falha" (RF15 / RN07)

**Evidência:** `patterns/strategy/EstrategiaRoteirizacao.ts:67-82` — `RotaCapacidadeVeiculo.ordenar` **descarta silenciosamente** os pontos que não cabem. Depois, `RotaService.ts:104-105` valida RN07 apenas sobre os pontos que sobraram, então a validação nunca dispara. O usuário seleciona 6 unidades e recebe uma rota com 2, sem aviso.

**Correção:** a estratégia deve devolver também os pontos não atendidos (ou lançar `RegraNegocioError('RN07', ...)`), e o serviço deve informar na resposta quais destinos ficaram de fora. Assim a RN07 passa a ser demonstrável.

### 4.7 IDs de parada consumindo a sequência de rotas

**Evidência:** `RotaService.ts:93` usa `this.rotas.proximoId()` para criar `ParadaRota`. Cada parada "queima" um ID de rota; as rotas passam a ter IDs 1, 3, 7, 10... Isso aparece na tela e em URLs (`/rotas/:id`).

**Correção:** contador próprio para paradas (repositório de paradas ou `proximoId('paradas')`).

### 4.8 `senhaHash` retornado pela API

**Evidência:** `routes.ts:45-52` devolve o objeto `Usuario` inteiro em `POST /api/usuarios` e em `PATCH /api/usuarios/:id/inativar`, incluindo `senhaHash`. O `GET /usuarios` já faz o mapeamento seguro — basta reutilizá-lo.

**Correção:** criar um `paraDTO(usuario)` e usar em todas as respostas. Isso também reduz o risco em LGPD (RNF02).

### 4.9 Diagrama de classes × código

**Evidência no diagrama** (`pasta 01/SIGLoSUS/diagramas/09-classes.mmd`):

| Diagrama | Código real | Ajuste |
|---|---|---|
| `Usuario.encerrarSessao()` (L13) | não existe | criar método ou remover do diagrama |
| `Rota.calcularOtimizacao()` (L109) | `Rota.recalcularDistancia()` | renomear no diagrama |
| `IntegracaoExterna.sincronizar()` (L141) | `registrarSincronizacao()` + `IntegracaoService.sincronizar()` | renomear/realocar |
| `Relatorio.gerar()` (L155) | `RelatorioService.gerar()` | mover no diagrama |
| `Entrega "1" --> "0..*" Lote` (L218) | associação inexistente | implementar (item 4.2) ou remover |

**No texto** (linha 448): *"A implementação em TypeScript materializa exatamente estas classes"*. Substituir por: *"implementa as classes a seguir; a Tabela X registra os métodos renomeados ou realocados para as camadas de aplicação"* — e incluir a tabela. Isso transforma uma imprecisão em demonstração de rigor.

---

## 5. Achados importantes (P1)

### 5.1 Nenhuma autenticação real na API

`App.ts` não tem middleware de autenticação; `api.js:8-21` nunca envia o token; todas as rotas são anônimas. Pior: o **autor da ação vem do corpo** (`usuarioId`), com valores fixos no frontend (`dashboard.js:59` usa `1`, `entregas.js:34` usa `3`). Qualquer cliente pode se declarar gestor e aprovar transferências — e a trilha de auditoria (RF22) perde valor probatório.

**Correção mínima:**
1. Middleware que lê `Authorization: Bearer <token>` e resolve o usuário.
2. `req.usuario` passa a ser a fonte do `usuarioId` (remover do corpo).
3. Verificação de perfil nas rotas sensíveis (`GESTOR` para aprovar transferência, `ADMINISTRADOR` para usuários).
4. Token assinado (JWT) em vez de base64 (`AutenticacaoService.ts:56-58`).

Se o tempo for curto, o mínimo defensável é: **middleware + usuário vindo do token**, mantendo o token simples. Documentar como "protótipo".

### 5.2 Status HTTP incorretos

`App.ts:27-30` mapeia **todo** erro de negócio para 422 e todo o resto para **400**. Consequências:
- credenciais inválidas → 400 (deveria ser **401**);
- usuário bloqueado → 400 (deveria ser **423** ou 429);
- recurso inexistente → 400 (deveria ser **404**);
- falta handler 404 para rotas desconhecidas (hoje cai no Express HTML).

**Correção:** classes de erro com `status` (`CredenciaisInvalidasError` → 401, `UsuarioBloqueadoError` → 423, `NaoEncontradoError` → 404) e um handler que respeite `err.status`.

### 5.3 Bloqueio de conta que nunca expira

`Usuario.ts:39-41`: `estaBloqueado()` retorna `tentativasFalhas >= 5` e nada zera esse contador com o tempo. O documento diz "bloqueado temporariamente". **Correção:** guardar `bloqueadoAte: Date` ou `ultimaTentativa` e liberar após N minutos. Adicionar teste.

### 5.4 XSS armazenado no frontend

`cadastros.js:10` (e praticamente todas as telas) injeta dados da API via `innerHTML` sem escape:

```js
`<tr><td>${u.id}</td><td>${u.nome}</td>...`
```

Um usuário cadastrado com nome `<img src=x onerror=alert(document.cookie)>` executa script na sessão do administrador. **Correção:** um helper único em `layout.js`:

```js
function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
```

e usar em todo campo vindo da API (`${esc(u.nome)}`). É uma alteração mecânica e rápida, e rende um parágrafo forte na seção de segurança.

### 5.5 Singleton e injeção de dependência "de fachada"

- `ConfiguracaoSistema` só é lido em `server.ts` e `/health`. Os limites de RN03/RN07/RN09 usados pelos serviços são **constantes no código** — o Singleton não influencia nenhuma regra, apesar de o documento (linha 653) afirmar o contrário.
- O `Container` injeta **classes concretas** de infraestrutura nos serviços; o documento fala em "depender de abstrações" (linha 466). O DIP está parcial.

**Correção barata:** injetar `ConfiguracaoSistema` em `TransferenciaService` e `RotaService` e ler os parâmetros de lá (3 linhas por serviço). Assim o padrão deixa de ser decorativo. Para o DIP, criar interfaces `IEstoqueRepository` etc. no domínio — é mais trabalhoso; se não fizer, suavizar o texto.

### 5.6 Validação de entrada ausente

Não há validação de tipos/limites: `quantidade` negativa, `NaN` (`Number(undefined)`), `nivelMinimo > nivelSeguranca`, `unidadesDestinoIds` vazio, e-mail inválido. `express.json()` sem limite de tamanho. **Correção:** validação explícita nos serviços (ou `zod`) + testes de borda. Isso também protege a demonstração ao vivo.

### 5.7 Outros pontos de robustez

- `cors()` liberado para qualquer origem (`App.ts:15`).
- Sem `helmet`, sem rate limit no login.
- Sem paginação em `/estoque`, `/auditoria`, `/movimentacoes`.
- `GET /api/rotas/:id` devolve `undefined` (200 vazio) quando não existe.
- Frontend não tem guarda de sessão: qualquer pessoa abre `dashboard.html` diretamente.
- `localStorage` guarda o token sem expiração.

---

## 6. Gerência de configuração: como garantir os 2,0

O que já está correto: `.gitignore` consistente (175 arquivos rastreados, `node_modules` fora), 16 commits com mensagens semânticas (`feat:`, `docs:`, `chore:`, `merge(...)`), branches `main`/`develop`, tags `v1.0.0` e `v2.0.0` locais e remotas.

O que falta — e o professor **vê**:

| Evidência esperada | Situação |
|---|---|
| Pull Requests com revisão/merge no GitHub | ❌ Nenhum (`git log --all` não tem `Merge pull request`) |
| Integração contínua (Actions) | ❌ Sem `.github/` |
| CHANGELOG / Release | ❌ Inexistentes |
| Proteção de branch | ❌ (verificar em Settings → Branches) |
| Commits pequenos e descritivos | ✅ |
| Tags SemVer | ✅ |

### Plano de 1 hora para fechar essa lacuna

1. **CI** — criar `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: "pasta 02/siglosus/backend"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: "pasta 02/siglosus/backend/package-lock.json"
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
```

2. **Template de PR** — `.github/pull_request_template.md` com "O que muda", "Requisitos atendidos", "Como testar", "Checklist".

3. **Proteção de branch** — Settings → Branches → proteger `main` e `develop` exigindo o check `CI / build`.

4. **Refazer as correções P0 em branches + PRs** — mesmo trabalhando sozinho, abra o PR no GitHub e faça *squash merge*. Isso produz exatamente a evidência que o material da disciplina pede (`Merge pull request #N from ...`). Exemplo de sequência:
   - `fix/rf14-movimenta-estoque` → PR #1
   - `fix/rf17-itens-entrega` → PR #2
   - `feat/rn06-rn09-aplicadas` → PR #3
   - `fix/seguranca-api` → PR #4
   - `docs/anexo-conformidade` → PR #5

5. **CHANGELOG.md** no padrão *Keep a Changelog*, com 1.0.0, 2.0.0 e 2.1.0 (as correções).

6. **GitHub Release** `v2.1.0` anexando o PDF final e citando o CHANGELOG.

7. **Anexo no PDF: "Evidências de gerência de configuração"** — prints/links de: grafo de branches, lista de PRs, execuções do Actions, tags e releases. Isso converte prática em nota.

> Observação: o material da disciplina cita *gitmoji* nos commits semânticos. O projeto usa Conventional Commits puro — é aceitável e mais sóbrio, mas mantenha **um padrão só** e registre a escolha no CONTRIBUTING.

---

## 7. Plano de ação priorizado

### P0 — antes de gerar o PDF final (obrigatório)

| # | Ação | Arquivos | Esforço |
|---|---|---|---|
| 1 | Aprovar transferência movimenta estoque (RF14) | `TransferenciaService`, `Container`, testes | 3 h |
| 2 | Itens de entrega + entrada no destino (RF17) | `Entrega`, `EntregaService`, `entregas.js`, testes | 4 h |
| 3 | Aplicar RN06 e RN09; reposicionar RN05 no doc | `RotaService`, `TransferenciaService`, doc | 3 h |
| 4 | Remover `senhaHash` das respostas | `routes.ts` | 30 min |
| 5 | Corrigir status HTTP (401/423/404) + handler 404 | `App.ts`, serviços | 1 h 30 |
| 6 | Alinhar diagrama de classes e o texto "materializa exatamente" | `09-classes.mmd`, doc §3.5/§4 | 1 h 30 |
| 7 | PRs + CI + CHANGELOG + Release | `.github/`, `CHANGELOG.md` | 1 h 30 |

### P1 — se houver tempo (protege a demonstração)

| # | Ação | Esforço |
|---|---|---|
| 8 | Middleware de autenticação + `usuarioId` vindo do token | 3 h |
| 9 | Deduplicação de alertas e de sugestões; auto-resolver alerta | 2 h |
| 10 | `AJUSTE` consistente com lotes + validação numérica | 2 h |
| 11 | Contador próprio de paradas; RN07 não descarta destinos em silêncio | 1 h 30 |
| 12 | `esc()` no frontend (XSS) | 1 h |
| 13 | Hash com salt (`scrypt`) — ou declarar como limitação | 1 h |

### P2 — evolução / diferencial

| # | Ação |
|---|---|
| 14 | RF20 (requisições) de ponta a ponta — maior lacuna de RF |
| 15 | RF19 (dispensação) — habilita RN05 e RN02 na assistência |
| 16 | RF02 (recuperação de senha) — fluxo simples com token de 1 uso |
| 17 | RF05/RF06 CRUD completo (POST/PUT) |
| 18 | Interfaces de repositório (DIP real) |
| 19 | Persistência em SQLite/PostgreSQL |
| 20 | OpenAPI/Swagger + paginação |

---

## 8. Ideias que elevam a apresentação (custo baixo, impacto alto)

1. **Anexo de conformidade requisito → evidência.** Uma tabela com 4 colunas: RF/RN, onde está no código (arquivo:linha), endpoint/tela, teste que comprova. É o argumento mais direto para os 8,0.
2. **Roteiro de demonstração de 6 passos** (2 páginas): login → estoque crítico → gerar sugestões → aprovar (mostrar estoque mudando) → gerar rota e despachar → confirmar entrega (mostrar entrada). Ensina o professor a ver o sistema funcionando.
3. **Script de captura de telas** (`npm run telas`) com Playwright: as 10 imagens passam a ser reproduzíveis, e o PDF nunca fica defasado do software.
4. **ADRs curtos** (3 registros: arquitetura em camadas, escolha do Git Flow, padrões). Custa 1 página e demonstra maturidade de projeto.
5. **Seed determinístico + `POST /api/demo/reset`** para reiniciar o cenário antes da apresentação (evita "na minha máquina estava diferente").
6. **Mostrar FEFO na interface** (`GET /api/estoque/:id/lotes`): hoje o FEFO é invisível para o usuário; exibir lotes e validade valoriza RN02 e RF18.
7. **Acessibilidade**: foco visível, `aria-live="polite"` no toast, `label` em todos os campos, contraste AA. Rende um parágrafo verificável em RNF06.
8. **Requisições (RF20)** como próxima tela: fecha a maior lacuna funcional e cria o fluxo natural para RN09 (aprovação acima do limite).
9. **Diagrama de implantação** (mesmo que simples: navegador → API → banco) — o enunciado não pede, mas arquitetura fica completa.
10. **Vídeo de 3 minutos** (opcional) como backup da demonstração ao vivo.

---

## 9. Checklist final de entrega

- [ ] PDF com seções 1 a 6 completas e sumário atualizado
- [ ] Anexo de conformidade (RF/RN → código → teste)
- [ ] Anexo de evidências de versionamento (PRs, tags, Actions, Release)
- [ ] Nenhuma promessa no texto sem contrapartida no código (ou declarada como fora de escopo)
- [ ] `npm test` verde (33+ testes) e `npm run typecheck` limpo
- [ ] 10 capturas de tela atualizadas (feito nesta sessão)
- [ ] `main` com a versão final, tag anotada e Release publicada
- [ ] `develop` sincronizada com `main`
- [ ] Repositório público e README com instruções de execução
- [ ] Nenhum emoji em código/UI (feito nesta sessão)

---

## 10. O que já foi alterado nesta sessão

**Objetivo:** remover os emojis "de IA" da interface, substituindo-os por ícones vetoriais profissionais, sem perder informação nem acessibilidade.

| Arquivo | Mudança |
|---|---|
| `frontend/assets/js/layout.js` | Novo conjunto `ICONES` com 17 SVGs inline (traço, `currentColor`, `aria-hidden`); menu lateral e botão Sair usam `iconeSvg()` |
| `frontend/assets/js/paginas/dashboard.js` | KPIs com ícones SVG (`hospital`, `estoque`, `aviso`, `alertas`); removido o `👍` do estado vazio |
| `frontend/assets/js/paginas/integracoes.js` | `✅` substituído por ícone de check em `<span class="linha-ok">` |
| `frontend/dashboard.html` | Títulos sem emoji (crítico, alertas, integrações) |
| `frontend/cadastros.html` | Títulos sem emoji (usuários, novo usuário, unidades, medicamentos, auditoria) |
| `frontend/integracoes.html` | Título sem emoji |
| `frontend/relatorios.html` | Título sem emoji |
| `frontend/assets/css/styles.css` | Regras de dimensionamento dos SVGs, alinhamento de `.rotulo` e `.linha-ok` |
| `pasta 02/imagens/telas/*.png` | As 10 capturas foram regeradas com a nova interface |

**Validação:** `npm test` → **33/33 testes aprovados**; `node --check` nos três arquivos JS; renderização conferida em navegador headless (1440×1000).

**Como conferir:** subir o backend (`cd "pasta 02/siglosus/backend"; npm start`) e abrir `http://localhost:3000/`.

---

## 11. Conclusão

A base do trabalho é sólida e o esforço maior já foi feito. O que separa o projeto de uma nota máxima não é "mais documentação", e sim **fechar o ciclo promessa → implementação → teste → evidência** em quatro frentes: RF14, RF17, RN05/06/09 e versionamento visível no GitHub. As correções P0 são pontuais (nenhuma exige reescrever a arquitetura) e, feitas via Pull Request com CI, geram simultaneamente os 8,0 da compatibilidade e os 2,0 da gerência de configuração.
