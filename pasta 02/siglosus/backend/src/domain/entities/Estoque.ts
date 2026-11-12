import { Lote } from './Lote';

/**
 * Posição de estoque de um medicamento em uma unidade. (RF09, RF10)
 */
export class Estoque {
  constructor(
    public readonly id: number,
    public unidadeId: number,
    public medicamentoId: number,
    public quantidadeAtual: number,
    public nivelMinimo: number,
    public nivelSeguranca: number,
    public lotes: Lote[] = [],
    public atualizadoEm: Date = new Date(),
  ) {}

  /** RF11 — dispara alerta de desabastecimento quando abaixo do nível mínimo. */
  abaixoDoMinimo(): boolean {
    return this.quantidadeAtual < this.nivelMinimo;
  }

  /** RN01 — só pode transferir quem está acima do nível de segurança. */
  acimaDoSeguranca(): boolean {
    return this.quantidadeAtual > this.nivelSeguranca;
  }

  /** Quantidade que pode ser transferida sem violar o nível de segurança (RN01). */
  excedenteSobreSeguranca(): number {
    return Math.max(0, this.quantidadeAtual - this.nivelSeguranca);
  }

  /** Déficit em relação ao nível de segurança (usado para sugerir transferências). */
  deficitParaSeguranca(): number {
    return Math.max(0, this.nivelSeguranca - this.quantidadeAtual);
  }

  /** Retorna os lotes ordenados pela validade (FEFO — RN02). */
  lotesFEFO(): Lote[] {
    return [...this.lotes].sort((a, b) => a.validade.getTime() - b.validade.getTime());
  }
}
