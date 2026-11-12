# Guia de publicação no GitHub — SIGLoSUS (disciplina Engenharia de Software)

Este material complementa a **seção 4.10 da documentação** e os slides de Git Flow, commits pequenos/semânticos, Pull Requests, release e `.gitignore` apresentados pelo docente Walter Viana.

**Prazo informado pelo professor: 01/12/2026.**

## Objetivo avaliativo

- **8 pontos:** comprovar correspondência entre requisitos, regras, UML, arquitetura, padrões e telas. Apresente o PDF completo e execute uma demonstração do sistema.
- **2 pontos:** mostrar histórico real de branches, commits semânticos, Pull Requests e tags de release. Capturas sem links não substituem repositório real.

## Passos no repositório já existente

1. **Preserve o clone original** e faça backup. Não execute `git init` sobre um clone existente.
2. Confira `git status`, `git branch -a` e `git log --oneline --graph --all -15`.
3. Aplique/substitua os arquivos pela versão revisada deste pacote. O ZIP não deve conter `.git` nem `node_modules`.
4. A partir de `develop`, trabalhe na branch `feature/correcao-final-2026`; não use `force push`.
5. Separe commits semânticos por mudança, por exemplo `fix(seguranca): endurece idempotencia e bloqueia seed`, `test(seguranca): adiciona casos de regressao`, `docs(entrega): atualiza especificacao e PDF`.
6. Na pasta `pasta 02/siglosus/backend`, execute `npm ci`, `npm run typecheck`, `npm test` e `npm run build`. Se os testes falharem, corrija antes da entrega.
7. Envie a branch: `git push -u origin feature/correcao-final-2026`.
8. Abra um **Pull Request** da feature para `develop` no GitHub, peça revisão e verifique o CI. Faça merge após aprovação.
9. Prepare branch `release/v2.1.1` e, após validação final, faça o merge para `main` conforme a estratégia do grupo. Gere a tag `v2.1.1` somente na versão realmente publicada.
10. Confirme que o PDF e o código enviados correspondem ao **mesmo commit**. Registre o link da release e o commit no formulário de entrega.

## Repositório pré-existente informado

https://github.com/pJhevison/SIGLoSUS---Engenharia-de-Software

**Aviso:** estas alterações foram feitas localmente no ambiente de revisão e **não foram enviadas ao GitHub**. O link acima é o repositório histórico do projeto; o usuário deve conferir se ele já contém a revisão e efetuar a publicação autenticada.

## Demonstração ao professor

Mostre `git log --oneline --graph --all`, `git branch -a`, `git tag`, histórico de Pull Requests, `git status`, o workflow `.github/workflows/ci.yml`, os testes e um caso de uso do SIGLoSUS.
