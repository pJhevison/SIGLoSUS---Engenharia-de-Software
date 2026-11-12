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
    public justificativa: string = '',
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

  rejeitar(justificativa: string = ''): void {
    this.status = StatusRequisicao.REJEITADA;
    this.justificativa = justificativa;
  }

  atender(): void {
    this.status = StatusRequisicao.ATENDIDA;
  }

  estaPendente(): boolean {
    return this.status === StatusRequisicao.PENDENTE;
  }
}
