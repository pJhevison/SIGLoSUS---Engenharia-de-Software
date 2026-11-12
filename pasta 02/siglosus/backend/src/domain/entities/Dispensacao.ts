/**
 * Registro da dispensação de um medicamento ao paciente. (RF19)
 */
export class Dispensacao {
  constructor(
    public readonly id: number,
    public unidadeId: number,
    public medicamentoId: number,
    public loteId: number,
    public quantidade: number,
    public dataHora: Date = new Date(),
  ) {}
}
