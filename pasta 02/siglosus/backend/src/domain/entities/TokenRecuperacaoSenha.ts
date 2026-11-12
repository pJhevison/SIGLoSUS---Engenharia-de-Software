/**
 * Token temporário de recuperação de senha. (RF02)
 *
 * Apenas o **hash** do token é persistido; o valor em claro existe somente
 * no momento da entrega (e-mail) e nunca é gravado no banco.
 */
export class TokenRecuperacaoSenha {
  constructor(
    public readonly id: number,
    public readonly usuarioId: number,
    public readonly hashToken: string,
    public readonly expiraEm: Date,
    public usadoEm?: Date,
    public criadoEm: Date = new Date(),
  ) {}

  estaExpirado(referencia: Date = new Date()): boolean {
    return this.expiraEm.getTime() < referencia.getTime();
  }

  estaUsado(): boolean {
    return this.usadoEm !== undefined;
  }

  /** Um token só é válido enquanto não usado e não expirado. */
  ehValido(referencia: Date = new Date()): boolean {
    return !this.estaUsado() && !this.estaExpirado(referencia);
  }

  marcarUsado(): void {
    this.usadoEm = new Date();
  }
}
