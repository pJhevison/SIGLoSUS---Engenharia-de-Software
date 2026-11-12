import { TipoMovimentacao } from '../enums';

/**
 * Registro de movimentação de estoque (entrada, saída, transferência ou ajuste). (RF08)
 */
export class MovimentacaoEstoque {
  constructor(
    public readonly id: number,
    public estoqueId: number,
    public tipo: TipoMovimentacao,
    public quantidade: number,
    public usuarioId: number,
    public loteId: number | null = null,
    public dataHora: Date = new Date(),
    public observacao: string = '',
  ) {}
}
