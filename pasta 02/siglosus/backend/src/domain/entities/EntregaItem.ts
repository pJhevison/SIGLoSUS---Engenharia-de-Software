/**
 * Item previsto em uma entrega. (RF16, RF17)
 *
 * O item nasce de uma transferência aprovada no momento do despacho da rota.
 * Ao confirmar o recebimento, a quantidade é creditada no estoque da unidade
 * de destino e a transferência de origem é concluída.
 */
export class EntregaItem {
  constructor(
    public readonly id: number,
    public medicamentoId: number,
    public quantidade: number,
    public transferenciaId: number | null = null,
    public quantidadeRecebida: number | null = null,
  ) {}
}
