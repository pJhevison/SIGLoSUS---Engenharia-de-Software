/**
 * Resultado armazenado para uma chave de idempotência. (RNF09)
 *
 * Permite que uma operação (por exemplo, a confirmação de uma entrega) seja
 * reenviada — inclusive após reconexão do cliente offline — sem ser executada
 * duas vezes.
 */
export class ResultadoIdempotencia {
  constructor(
    public readonly id: number,
    public readonly chave: string,
    public readonly metodo: string,
    public readonly caminho: string,
    public readonly status: number,
    public readonly corpo: unknown,
    public readonly criadoEm: Date = new Date(),
    /** Identidade autenticada que originou a operação; entradas antigas sem usuário nunca são reproduzidas. */
    public readonly usuarioId?: number,
    /** SHA-256 da requisição original: método, rota e corpo. */
    public readonly hashRequisicao?: string,
  ) {}
}
