/**
 * Medicamento do catálogo. (RF06)
 */
export class Medicamento {
  constructor(
    public readonly id: number,
    public nome: string,
    public principioAtivo: string,
    public apresentacao: string,
    public codigoCATMAT: string,
    public controlado: boolean = false,
    public rename: boolean = false,
  ) {}

  /**
   * Medicamentos controlados exigem rastreabilidade por lote e conferência
   * por dois responsáveis (RN05).
   */
  exigeConferenciaDupla(): boolean {
    return this.controlado;
  }

  /** Medicamentos da RENAME têm prioridade no abastecimento (RN06). */
  temPrioridadeAbastecimento(): boolean {
    return this.rename;
  }
}
