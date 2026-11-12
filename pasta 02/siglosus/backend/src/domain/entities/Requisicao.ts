import { StatusRequisicao } from '../enums';

/**
 * Requisição de medicamentos enviada por uma unidade ao centro de distribuição. (RF20)
 */
export class Requisicao {
  constructor(
    public readonly id: number,
    public unidadeSolicitanteId: number,
    public medicamentoId: number,
    public quantidade: number,
    public valorEstimado: number,
    public status: StatusRequisicao = StatusRequisicao.PENDENTE,
    public data: Date = new Date(),
  ) {}

  /**
   * RN09: requisições acima do limite de valor definido pela gestão exigem
   * aprovação do gestor de assistência farmacêutica.
   */
  exigeAprovacaoGestor(limiteValor: number): boolean {
    return this.valorEstimado > limiteValor;
  }

  aprovar(): void {
    this.status = StatusRequisicao.APROVADA;
  }
}
