/**
 * Erros de aplicação com semântica HTTP explícita.
 *
 * A camada de apresentação (App.ts) traduz cada tipo para o status correto,
 * evitando que situações distintas (recurso ausente, conflito de estado,
 * credencial inválida) respondam todas com o mesmo código.
 */
export class ErroNaoEncontrado extends Error {
  readonly status = 404;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroNaoEncontrado';
  }
}

export class ErroConflito extends Error {
  readonly status = 409;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroConflito';
  }
}

export class ErroValidacao extends Error {
  readonly status = 400;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroValidacao';
  }
}

/** Falta de credencial válida ou credencial expirada/adulterada (HTTP 401). */
export class ErroNaoAutenticado extends Error {
  readonly status = 401;

  constructor(mensagem: string = 'Autenticação necessária.') {
    super(mensagem);
    this.name = 'ErroNaoAutenticado';
  }
}

/** Excesso de requisições (HTTP 429 — proteção contra força bruta). */
export class ErroLimiteExcedido extends Error {
  readonly status = 429;

  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroLimiteExcedido';
  }
}

/** Usuário autenticado, porém sem permissão para a operação (HTTP 403). */
export class ErroNaoAutorizado extends Error {
  readonly status = 403;

  constructor(mensagem: string = 'Operação não permitida para o seu perfil.') {
    super(mensagem);
    this.name = 'ErroNaoAutorizado';
  }
}
