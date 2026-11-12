# Changelog

Todas as mudanças relevantes do SIGLoSUS são registradas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado

- API de dispensação ao paciente (RF19): registro e listagem em
  `/api/dispensacoes`, com lote obrigatório e conferência dupla para controlados
  (RN05).
- API de requisições de medicamentos (RF20): criação, listagem, aprovação e
  rejeição em `/api/requisicoes`.
- Aplicação da RN09 na aprovação de requisições: valores acima de
  `limiteAprovacaoGestor` exigem perfil GESTOR ou ADMINISTRADOR.
- Itens previstos na entrega (`EntregaItem`) vinculados às transferências
  aprovadas, com rastreabilidade por `transferenciaId` (RF16/RF17).
- Testes de RF14, RF17, RN06, RN09 e dos códigos HTTP 401, 404 e 423.
- Workflow de integração contínua em `.github/workflows/ci.yml`.
- Template de pull request em `.github/pull_request_template.md`.

### Corrigido

- RF14: a aprovação de transferência agora dá baixa efetiva no estoque de
  origem, em vez de apenas alterar o status.
- RF17: a confirmação de recebimento credita o estoque de destino a partir dos
  itens planejados no servidor, sem confiar em quantidades enviadas pelo
  cliente; a transferência vinculada é concluída e a rota é encerrada quando
  todas as paradas terminam.
- RN06: a prioridade de roteirização passa a desempatar a favor de unidades com
  medicamentos da RENAME em déficit.
- Segurança: respostas de `/api/usuarios` não expõem mais `senhaHash` nem CPF.
- HTTP: credenciais inválidas retornam 401, conta bloqueada retorna 423,
  recursos inexistentes retornam 404 e conflitos de estado retornam 409.
- Roteirização: paradas passam a usar sequência de identificadores própria, sem
  consumir a sequência de rotas.

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
