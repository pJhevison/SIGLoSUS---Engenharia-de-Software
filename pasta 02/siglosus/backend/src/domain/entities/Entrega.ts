import { StatusEntrega } from '../enums';
import { EntregaItem } from './EntregaItem';

/**
 * Entrega de medicamentos a uma unidade de destino. (RF16, RF17)
 */
export class Entrega {
  constructor(
    public readonly id: number,
    public rotaId: number,
    public unidadeDestinoId: number,
    public dataHoraPrevista: Date,
    public status: StatusEntrega = StatusEntrega.PENDENTE,
    public dataHoraReal?: Date,
    public observacao: string = '',
    public itens: EntregaItem[] = [],
  ) {}

  despachar(): void {
    this.status = StatusEntrega.EM_TRANSITO;
  }

  /**
   * UC18 — confirma o recebimento. Havendo divergência, a entrega é registrada
   * com pendência e o gestor é notificado.
   */
  confirmarRecebimento(comDivergencia: boolean = false, observacao: string = ''): void {
    this.dataHoraReal = new Date();
    this.observacao = observacao;
    this.status = comDivergencia ? StatusEntrega.COM_DIVERGENCIA : StatusEntrega.ENTREGUE;
  }
}
