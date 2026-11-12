import { StatusTransferencia } from '../enums';

/**
 * Transferência de medicamento entre unidades. (RF13, RF14)
 */
export class Transferencia {
  constructor(
    public readonly id: number,
    public medicamentoId: number,
    public unidadeOrigemId: number,
    public unidadeDestinoId: number,
    public quantidade: number,
    public status: StatusTransferencia = StatusTransferencia.SUGERIDA,
    public solicitadaEm: Date = new Date(),
    public justificativa: string = '',
  ) {}

  aprovar(): void {
    this.status = StatusTransferencia.APROVADA;
  }

  rejeitar(justificativa: string): void {
    this.status = StatusTransferencia.REJEITADA;
    this.justificativa = justificativa;
  }

  concluir(): void {
    this.status = StatusTransferencia.CONCLUIDA;
  }

  estaPendente(): boolean {
    return this.status === StatusTransferencia.SUGERIDA;
  }
}
