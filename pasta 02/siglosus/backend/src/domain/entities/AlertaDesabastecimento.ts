import { NivelRisco, StatusAlerta } from '../enums';

/**
 * Alerta de risco de desabastecimento. (RF11)
 */
export class AlertaDesabastecimento {
  constructor(
    public readonly id: number,
    public estoqueId: number,
    public unidadeId: number,
    public medicamentoId: number,
    public nivelRisco: NivelRisco,
    public geradoEm: Date = new Date(),
    public status: StatusAlerta = StatusAlerta.ABERTO,
  ) {}

  resolver(): void {
    this.status = StatusAlerta.RESOLVIDO;
  }

  static classificarRisco(quantidadeAtual: number, nivelMinimo: number): NivelRisco {
    if (nivelMinimo <= 0) return NivelRisco.BAIXO;
    const proporcao = quantidadeAtual / nivelMinimo;
    if (proporcao <= 0) return NivelRisco.CRITICO;
    if (proporcao < 0.5) return NivelRisco.ALTO;
    if (proporcao < 1) return NivelRisco.MEDIO;
    return NivelRisco.BAIXO;
  }
}
