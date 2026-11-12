/**
 * Lote de um medicamento (com validade). (RF18)
 */
export class Lote {
  constructor(
    public readonly id: number,
    public numeroLote: string,
    public validade: Date,
    public quantidade: number,
  ) {}

  estaVencido(referencia: Date = new Date()): boolean {
    return this.validade.getTime() < referencia.getTime();
  }

  /** Dias restantes até o vencimento (negativo se já venceu). */
  diasParaVencer(referencia: Date = new Date()): number {
    return Math.ceil((this.validade.getTime() - referencia.getTime()) / 86_400_000);
  }

  /**
   * Regra RN03: medicamentos com validade inferior a 90 dias não podem ser
   * transferidos entre unidades.
   */
  podeSerTransferido(referencia: Date = new Date()): boolean {
    return this.diasParaVencer(referencia) >= 90;
  }
}
