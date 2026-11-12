/**
 * Token JWT revogado (logout). Persistido para que a revogação sobreviva ao
 * reinício do backend (RF03, RNF01).
 */
export class TokenRevogado {
  constructor(
    public readonly id: number,
    public readonly jti: string,
    public readonly usuarioId: number,
    public readonly expiraEm: number,
    public readonly revogadoEm: Date = new Date(),
  ) {}

  estaExpirado(referencia: number = Math.floor(Date.now() / 1000)): boolean {
    return this.expiraEm < referencia;
  }
}
