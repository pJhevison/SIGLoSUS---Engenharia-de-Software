# SIGLoSUS — Relatório técnico da revisão de 12/11/2026

**Versão preparada:** 2.1.1 (local, ainda não publicada no GitHub).  
**Fonte utilizada:** `Projeto de ES(2).zip` disponibilizado pelo responsável pelo projeto.  
**Disciplina:** Engenharia de Software B — UFAM / ICET.  
**Prazo informado:** 01/12/2026.  
**Atenção:** os resultados abaixo são desta auditoria. Declarações de sucesso em relatórios anteriores não substituem estes resultados.

## 1. Resumo

Foram mantidas as seis seções exigidas para a avaliação: (1) Introdução; (2) Requisitos Gerais; (3) Diagramas UML; (4) Arquitetura; (5) Padrões de Projeto; (6) Prototipação das Telas. A documentação consolidada foi revisada, o PDF refeito com **48 páginas e 27 figuras** e o código foi alterado em pontos de segurança e funcionamento offline. Os 14 RF originais permanecem rastreados para os 22 RF consolidados.

## 2. Correções efetivamente implementadas

| Problema | Correção | Evidência direta |
|---|---|---|
| Cache de idempotência anterior à autenticação | Middleware retirado de `App.ts` e inserido após `autorizar()` nas rotas privadas pertinentes | `src/infrastructure/http/routes.ts` |
| Replay de operação por outro usuário | Chave isolada por `usuarioId` autenticado | `src/infrastructure/http/middleware/idempotencia.ts`; `SegurancaRepository.ts` |
| Reutilização de chave para operação diferente | Hash SHA-256 do método, caminho completo e JSON da requisição; divergência responde HTTP 409 | `ResultadoIdempotencia.ts`; `idempotencia.ts` |
| Registros legados sem escopo autenticado | Rejeição segura com HTTP 409 | `SegurancaRepository.ts` |
| Fila offline com chave fixa para cada rota | UUID aleatório único por operação; reenvio usa a mesma chave | `frontend/assets/js/api.js` |
| Risco de enviar fila de uma conta por outra | Identidade da conta é associada à fila; reenvio de conta diferente é bloqueado | `frontend/assets/js/api.js` |
| Seed de demonstração disponível em produção | Bloqueio explícito em `production` mesmo com `forcarSeed` ou `SIGLOSUS_SEED_DEMO` | `src/application/Container.ts` |
| Falta de método para instalar primeiro administrador | Comando `npm run bootstrap:admin` restrito ao ambiente de produção e banco sem contas | `src/bootstrap-admin.ts` |
| Origens CORS padrão em produção | Sem `CORS_ORIGINS`, nenhuma origem *cross-site* é liberada | `src/infrastructure/http/App.ts` |
| Recuperação de senha prometia e-mail não implementado | Mensagem pública reescrita para refletir a dependência do serviço externo | `routes.ts` |
| Erros de nomenclatura no `.env.example` | Padronização de `TOKEN_RECUPERACAO_VALIDADE_MIN` | `.env.example` |

## 3. Verificação executada

| Verificação | Comando | Resultado observado |
|---|---|---|
| Tipagem TypeScript | `node node_modules/typescript/bin/tsc --noEmit` | **Aprovado** (saída 0) |
| Compilação | `node node_modules/typescript/bin/tsc -p tsconfig.build.json` | **Aprovado** (saída 0) |
| Regressão de segurança (10 verificações) | `npm run test:smoke` | **Aprovado** (10 verificações) |
| Suíte completa Vitest (76 casos definidos / 8 arquivos) | `npm test` | **Não reproduzida**: executáveis e dependência nativa do Rollup inadequados na cópia original para Linux |
| Instalação limpa | `npm ci --no-audit --no-fund --prefer-offline` | **Não concluída**: prazo limite atingido no ambiente de auditoria |
| PDF | conversão HTML gerado do Markdown com WeasyPrint | **Gerado**, 48 páginas, 27 imagens verificadas |

**Não foram declarados 76 testes aprovados.** Recomenda-se repetir `npm ci && npm test && npm run build` no ambiente de desenvolvimento do grupo e verificar o resultado no GitHub Actions antes de entregar. `npm run test:smoke` fornece verificação complementar, mas não substitui toda a suíte Vitest.

## 4. Conformidade acadêmica e rastreabilidade

| Critério do professor | Material para evidenciar | Situação |
|---|---|---|
| 1. Introdução: 1.1/1.2 | Documento e PDF | Presente |
| 2. Requisitos: 2.1/2.2/2.3 | RF01–RF22, RNF e RN01–RN09 | Presente; limitações descritas |
| 3. UML: 3.1–3.5 | Casos de uso, especificações, sequências, atividades e classes | Diagramas incorporados (fontes em `.mmd`) |
| 4. Arquitetura | Organização em camadas, componentes, implantação, autenticação, banco e rastreabilidade | Atualizada |
| 5. Padrões | Singleton, Factory Method, Adapter, Observer e Strategy | Implementações e diagramas presentes |
| 6. Prototipação | 10 capturas e telas navegáveis | Presente |
| Versionamento (2 pontos) | `.gitignore`, `CHANGELOG`, Git Flow, commits semânticos, PR, CI e tags | Material preparado; **publicação da revisão pendente** |

## 5. Limitações técnicas que permanecem

1. A persistência em JSON não substitui um banco transacional de produção.
2. Integrações oficiais e-SUS APS, HÓRUS/SNA e BNAFAR ainda usam adaptadores demonstrativos e não estão conectadas a serviços oficiais.
3. O rastreamento usa posições reportadas por dispositivo; GPS contínuo não foi validado.
4. A fila offline funciona no navegador com `localStorage`; não equivale a aplicativo móvel nativo.
5. O envio de e-mail para recuperação de senha requer integração adicional; o protótipo não deve afirmar que o e-mail foi entregue.
6. Não foram reproduzidos ensaios formais de carga, SLA, interoperabilidade HL7/FHIR ou conformidade WCAG.
7. A comprovação integral da suíte Vitest e a publicação das alterações no remoto permanecem pendentes.

## 6. Controle de versão e próximos passos

As mudanças foram preparadas para a branch local `feature/correcao-final-2026`, com separação por segurança, testes, documentação e diagramas; consulte o arquivo `GUIA_PUBLICACAO_GIT.md` para publicar os commits no repositório de origem.

Repositório histórico conhecido: https://github.com/pJhevison/SIGLoSUS---Engenharia-de-Software

**Não foi realizado push ao GitHub nesta revisão.** Só indique o link acima como entrega da **versão revisada** depois de confirmar que o branch/PR/merge remoto contém os arquivos finais e o PDF atualizado.

## 7. Arquivos principais

- `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.md` — fonte consolidada.
- `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.pdf` — documento PDF exigido.
- `pasta 02/docs/Documentacao_SIGLoSUS_Parte2.html` — cópia HTML navegável.
- `pasta 02/siglosus/backend/` — código, testes, configurações e API.
- `pasta 02/siglosus/frontend/` — protótipos e fila offline.
- `GUIA_PUBLICACAO_GIT.md` — processo de versionamento e entrega.

**Conclusão:** correções críticas implementadas e verificadas de modo direcionado. O pacote está pronto para revisão pelo grupo e publicação autenticada, mas **não deve ser descrito como entregue ao GitHub ou integralmente testado até comprovação desses passos**.
