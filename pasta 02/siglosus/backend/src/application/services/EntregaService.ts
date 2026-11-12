import { Entrega, EntregaItem } from '../../domain/entities';
import { StatusEntrega, StatusParada, StatusRota, TipoMovimentacao } from '../../domain/enums';
import { ErroConflito, ErroNaoEncontrado, ErroValidacao } from '../../domain/errors';
import { EntregaRepository, RotaRepository, TransferenciaRepository } from '../../infrastructure/repositories';
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
 *
 * O despacho materializa os itens previstos a partir das transferências já
 * aprovadas para cada unidade de destino. A confirmação usa esses itens como
 * fonte de verdade e credita o estoque de destino (a origem já foi debitada na
 * aprovação da transferência).
 */
export class EntregaService {
  private proximoItemId = 1;

  constructor(
    private readonly entregas: EntregaRepository,
    private readonly rotas: RotaRepository,
    private readonly transferencias: TransferenciaRepository,
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
    if (!rota) throw new ErroNaoEncontrado('Rota não encontrada.');
    if (rota.paradas.length === 0) throw new ErroValidacao('A rota não possui paradas.');
    if (rota.status !== StatusRota.PLANEJADA) {
      throw new ErroConflito('Somente rotas planejadas podem ser despachadas.');
    }

    const transferenciasVinculadas = this.transferenciasVinculadas();
    const entregas: Entrega[] = [];

    for (const parada of rota.paradas) {
      const itens = this.transferencias
        .listarAprovadasPorDestino(parada.unidade.id)
        .filter((t) => !transferenciasVinculadas.has(t.id))
        .map(
          (t) =>
            new EntregaItem(
              this.proximoItemId++,
              t.medicamentoId,
              t.quantidade,
              t.id,
            ),
        );

      const entrega = new Entrega(
        this.entregas.proximoId(),
        rota.id,
        parada.unidade.id,
        new Date(),
        StatusEntrega.PENDENTE,
        undefined,
        '',
        itens,
      );
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
   *
   * Quando a entrega possui itens planejados (fluxo normal), o servidor ignora
   * quantidades enviadas pelo cliente e usa as transferências aprovadas. Itens
   * avulsos continuam aceitos apenas para entregas sem itens planejados.
   */
  confirmarRecebimento(entregaId: number, dados: DadosRecebimento): Entrega {
    const entrega = this.entregas.buscarPorId(entregaId);
    if (!entrega) throw new ErroNaoEncontrado('Entrega não encontrada.');
    if (entrega.status !== StatusEntrega.EM_TRANSITO) {
      throw new ErroConflito('Somente entregas em trânsito podem ter o recebimento confirmado.');
    }

    if (entrega.itens.length > 0) {
      for (const item of entrega.itens) {
        const estoque = this.estoqueService.buscarPorUnidadeEMedicamento(
          entrega.unidadeDestinoId,
          item.medicamentoId,
        );
        if (!estoque) {
          throw new ErroNaoEncontrado(
            `Estoque de destino não encontrado para o medicamento ${item.medicamentoId}.`,
          );
        }
        this.estoqueService.registrarMovimentacao({
          estoqueId: estoque.id,
          tipo: TipoMovimentacao.ENTRADA,
          quantidade: item.quantidade,
          usuarioId: dados.usuarioId,
          observacao:
            `Recebimento da entrega ${entregaId}` +
            (item.transferenciaId ? ` (transferência ${item.transferenciaId})` : ''),
        });
        item.quantidadeRecebida = item.quantidade;

        if (item.transferenciaId) {
          this.transferencias.buscarPorId(item.transferenciaId)?.concluir();
        }
      }
    } else {
      for (const item of dados.itens ?? []) {
        const estoque = this.estoqueService.buscar(item.estoqueId);
        if (!estoque) throw new ErroNaoEncontrado(`Estoque ${item.estoqueId} não encontrado.`);
        if (estoque.unidadeId !== entrega.unidadeDestinoId) {
          throw new ErroValidacao('O estoque informado não pertence à unidade de destino da entrega.');
        }
        this.estoqueService.registrarMovimentacao({
          estoqueId: item.estoqueId,
          tipo: TipoMovimentacao.ENTRADA,
          quantidade: item.quantidade,
          usuarioId: dados.usuarioId,
          observacao: `Recebimento da entrega ${entregaId}`,
        });
      }
    }

    entrega.confirmarRecebimento(dados.divergencia ?? false, dados.observacao ?? '');
    this.concluirParada(entrega);
    this.auditoria.registrar(
      dados.usuarioId,
      'CONFIRMAR_RECEBIMENTO',
      'entrega',
      `Entrega ${entregaId}${dados.divergencia ? ' (com divergência)' : ''}`,
      true,
    );
    return entrega;
  }

  /** Transferências já incluídas em alguma entrega (evita duplicidade). */
  private transferenciasVinculadas(): Set<number> {
    const ids = new Set<number>();
    for (const entrega of this.entregas.listar()) {
      for (const item of entrega.itens) {
        if (item.transferenciaId) ids.add(item.transferenciaId);
      }
    }
    return ids;
  }

  /** Atualiza a parada correspondente e conclui a rota quando todas terminarem. */
  private concluirParada(entrega: Entrega): void {
    const rota = this.rotas.buscarPorId(entrega.rotaId);
    if (!rota) return;
    const parada = rota.paradas.find((p) => p.unidade.id === entrega.unidadeDestinoId);
    parada?.concluir();
    if (rota.paradas.every((p) => p.status === StatusParada.CONCLUIDA)) {
      rota.concluir();
    }
  }
}
