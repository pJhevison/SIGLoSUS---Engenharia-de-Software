# Guia de Contribuição e Versionamento — SIGLoSUS

Este documento descreve as **práticas de gerência de configuração e controle de versão**
adotadas no projeto SIGLoSUS, conforme os materiais da disciplina de Engenharia de
Software B (Prof. Walter Jonas).

## 1. Estratégia de ramificação: Git Flow

Adotamos o **Git Flow**, por ser adequado a entregas versionadas e ao trabalho com
*releases* formais (as partes 1 e 2 do trabalho).

| Branch | Papel |
|---|---|
| `main` | Código **em produção** / entregas oficiais. Só recebe *merge* de `release/*` e `hotfix/*`. Cada merge é marcado com uma **tag** (`vX.Y.Z`). |
| `develop` | Linha de **integração** contínua. Recebe as *features* concluídas. |
| `feature/<nome>` | Desenvolvimento de uma funcionalidade, criada a partir de `develop`. |
| `release/<versao>` | Estabilização de uma entrega, criada a partir de `develop`. |
| `hotfix/<nome>` | Correção urgente em produção, criada a partir de `main`. |

### Fluxo resumido

```
main      ──●──────────────────────────────●────────● (v2.0.0)
             \                            /        /
develop       ●──●──●──●──●──●──●──●──●──●────────●
                 \    /     \   /    \  /
feature/*         ●──●       ●─●      ●●
```

## 2. Convenção de commits (Commits Semânticos)

Todo commit segue o padrão **`tipo(escopo): descrição`**, no imperativo e em português.

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de defeito |
| `docs` | Alteração apenas de documentação |
| `test` | Adição/ajuste de testes |
| `refactor` | Refatoração sem mudança de comportamento |
| `chore` | Tarefas de build, dependências, configuração |
| `style` | Formatação (sem alterar lógica) |

Exemplos:

```
feat(estoque): implementa consulta de estoque consolidado em tempo real
feat(padroes): aplica padrão Strategy na roteirização de entregas
fix(transferencia): impede transferência de unidade abaixo do nível de segurança
test(regras): cobre as nove regras de negócio (RN01 a RN09)
docs(arquitetura): descreve a arquitetura em camadas
```

Regras complementares:
- **Commits pequenos e descritivos** (uma intenção por commit).
- Mensagem no **imperativo** ("adiciona", não "adicionado").
- Referenciar o requisito/regra quando fizer sentido (`feat(estoque): ... (RF09, RN02)`).

## 3. Boas práticas aplicadas

- **`.gitignore`** configurado para não versionar `node_modules`, `dist`, `.env` e logs.
- **Features** desenvolvidas em branches isoladas e integradas via **Pull Request**.
- **Merge Pull Request**: a integração em `develop`/`main` é feita por PR revisado,
  mantendo histórico e rastreabilidade.
- **Tags** anotadas por versão (`v1.0.0` para a Parte 1, `v2.0.0` para a Parte 2).
- **Proibido** `git push --force` em `main`/`develop`.

## 4. Comandos essenciais utilizados

```bash
# preparação do ambiente
git init
git clone https://github.com/pJhevison/SIGLoSUS---Engenharia-de-Software.git

# ciclo de trabalho
git status
git checkout -b feature/nova-funcionalidade
git add .
git commit -m "feat(escopo): descrição da mudança"
git push -u origin feature/nova-funcionalidade

# integração
git checkout develop
git merge --no-ff feature/nova-funcionalidade
git branch -d feature/nova-funcionalidade

# entrega
git checkout -b release/2.0.0 develop
git checkout main
git merge --no-ff release/2.0.0
git tag -a v2.0.0 -m "SIGLoSUS 2.0.0 - documentação completa e software"
git push origin main --tags
```

## 5. Versionamento semântico (SemVer)

As versões seguem **MAJOR.MINOR.PATCH**:

- **MAJOR** — mudança incompatível.
- **MINOR** — nova funcionalidade compatível.
- **PATCH** — correção compatível.

Tags do projeto: **`v1.0.0`** (Parte 1) e **`v2.0.0`** (Parte 2).
