import { Entrega } from '../../domain/entities';
import { TipoMovimentacao } from '../../domain/enums';
import { EntregaRepository, RotaRepository } from '../../infrastructure/repositories';
import { AuditoriaService } from './AuditoriaService';
import { EstoqueService } from './EstoqueService';

export interface ItemRecebimento {
  estoqueId: number;
  quantidade: number;
}

export interface DadosRecebimento {
  usuarioId: number;
  divergencia?: boolean;
  observacao?: string;
  itens?: ItemRecebimento[];
}

/**
 * Serviço de entregas (RF16, RF17 — UC17/UC18).
 */
export class EntregaService {
  constructor(
    private readonly entregas: EntregaRepository,
    private readonly rotas: RotaRepository,
    private readonly estoqueService: EstoqueService,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(): Entrega[] {
    return this.entregas.listar();
  }

  listarPorRota(rotaId: number): Entrega[] {
    return this.entregas.listarPorRota(rotaId);
  }

  /** UC17 — despacha a rota, gerando as entregas previstas. */
  despachar(rotaId: number, usuarioId: number): Entrega[] {
    const rota = this.rotas.buscarPorId(rotaId);
    if (!rota) throw new Error('Rota não encontrada.');
    if (rota.paradas.length === 0) throw new Error('A rota não possui paradas.');

    const entregas: Entrega[] = [];
    for (const parada of rota.paradas) {
      const entrega = new Entrega(this.entregas.proximoId(), rota.id, parada.unidade.id, new Date());
      entrega.despachar();
      this.entregas.salvar(entrega);
      entregas.push(entrega);
    }
    rota.iniciar();
    this.auditoria.registrar(usuarioId, 'DESPACHAR_ROTA', 'entrega', `Rota ${rotaId}`, true);
    return entregas;
  }

  /**
   * UC18 — confirma o recebimento na unidade de destino.
   * Atualiza o estoque (entrada) e trata divergências.
   */
  confirmarRecebimento(entregaId: number, dados: DadosRecebimento): Entrega {
    const entrega = this.entregas.buscarPorId(entregaId);
    if (!entrega) throw new Error('Entrega não encontrada.');

    for (const item of dados.itens ?? []) {
      this.estoqueService.registrarMovimentacao({
        estoqueId: item.estoqueId,
        tipo: TipoMovimentacao.ENTRADA,
        quantidade: item.quantidade,
        usuarioId: dados.usuarioId,
        observacao: `Recebimento da entrega ${entregaId}`,
      });
    }

    entrega.confirmarRecebimento(dados.divergencia ?? false, dados.observacao ?? '');
    this.auditoria.registrar(
      dados.usuarioId,
      'CONFIRMAR_RECEBIMENTO',
      'entrega',
      `Entrega ${entregaId}${dados.divergencia ? ' (com divergência)' : ''}`,
      true,
    );
    return entrega;
  }
}
