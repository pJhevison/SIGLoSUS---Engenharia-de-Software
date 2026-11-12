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
