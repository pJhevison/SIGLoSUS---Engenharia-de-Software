/**
 * Previsão de demanda de um medicamento em uma unidade. (RF12)
 */
export class PrevisaoDemanda {
  constructor(
    public readonly id: number,
    public unidadeId: number,
    public medicamentoId: number,
    public periodo: string,
    public quantidadePrevista: number,
    public metodo: string,
    public confianca: number,
  ) {}
}
