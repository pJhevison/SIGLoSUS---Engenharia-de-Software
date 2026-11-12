import { AlertaDesabastecimento, Estoque, MovimentacaoEstoque } from '../../domain/entities';
import { NivelRisco, TipoMovimentacao } from '../../domain/enums';
import { ErroNaoEncontrado, ErroValidacao } from '../../domain/errors';
import { RegraNegocioError, RegrasNegocio } from '../../domain/rules/RegrasNegocio';
import {
  EstoqueRepository,
  MedicamentoRepository,
  MovimentacaoRepository,
  UnidadeRepository,
} from '../../infrastructure/repositories';
import { EstoqueSubject } from '../../patterns/observer/EstoqueSubject';
import { AuditoriaService } from './AuditoriaService';

export interface DadosMovimentacao {
  estoqueId: number;
  tipo: TipoMovimentacao;
  quantidade: number;
  usuarioId: number;
  loteId?: number;
  observacao?: string;
}

/** Visão consolidada de estoque para a interface (RF09). */
export interface EstoqueConsolidado {
  estoqueId: number;
  unidadeId: number;
  unidadeNome: string;
  medicamentoId: number;
  medicamentoNome: string;
  quantidadeAtual: number;
  nivelMinimo: number;
  nivelSeguranca: number;
  abaixoDoMinimo: boolean;
  nivelRisco: NivelRisco;
  atualizadoEm: Date;
}

/**
 * Serviço de estoque (RF08, RF09, RF10, RF18).
 *
 * Publica eventos no `EstoqueSubject` (Observer) a cada movimentação, o que
 * dispara a geração de alertas e o envio de notificações.
 */
export class EstoqueService {
  constructor(
    private readonly estoques: EstoqueRepository,
    private readonly movimentacoes: MovimentacaoRepository,
    private readonly medicamentos: MedicamentoRepository,
    private readonly unidades: UnidadeRepository,
    private readonly subject: EstoqueSubject,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(): Estoque[] {
    return this.estoques.listar();
  }

  listarPorUnidade(unidadeId: number): Estoque[] {
    return this.estoques.listarPorUnidade(unidadeId);
  }

  buscar(estoqueId: number): Estoque | undefined {
    return this.estoques.buscarPorId(estoqueId);
  }

  buscarPorUnidadeEMedicamento(unidadeId: number, medicamentoId: number): Estoque | undefined {
    return this.estoques.buscarPorUnidadeEMedicamento(unidadeId, medicamentoId);
  }

  /** Visão consolidada com nomes de unidade e medicamento (RF09). */
  consolidado(filtro?: { unidadeId?: number; medicamentoId?: number; apenasCriticos?: boolean }): EstoqueConsolidado[] {
    return this.estoques
      .listar()
      .filter((e) => !filtro?.unidadeId || e.unidadeId === filtro.unidadeId)
      .filter((e) => !filtro?.medicamentoId || e.medicamentoId === filtro.medicamentoId)
      .filter((e) => !filtro?.apenasCriticos || e.abaixoDoMinimo())
      .map((e) => ({
        estoqueId: e.id,
        unidadeId: e.unidadeId,
        unidadeNome: this.unidades.buscarPorId(e.unidadeId)?.nome ?? 'N/D',
        medicamentoId: e.medicamentoId,
        medicamentoNome: this.medicamentos.buscarPorId(e.medicamentoId)?.nome ?? 'N/D',
        quantidadeAtual: e.quantidadeAtual,
        nivelMinimo: e.nivelMinimo,
        nivelSeguranca: e.nivelSeguranca,
        abaixoDoMinimo: e.abaixoDoMinimo(),
        nivelRisco: EstoqueService.classificar(e),
        atualizadoEm: e.atualizadoEm,
      }));
  }

  private static classificar(e: Estoque): NivelRisco {
    return e.abaixoDoMinimo()
      ? AlertaDesabastecimento.classificarRisco(e.quantidadeAtual, e.nivelMinimo)
      : NivelRisco.BAIXO;
  }

  /** RF10 — configura os níveis mínimo e de segurança. */
  configurarNiveis(
    estoqueId: number,
    nivelMinimo: number,
    nivelSeguranca: number,
    usuarioId: number,
  ): Estoque {
    const estoque = this.estoques.buscarPorId(estoqueId);
    if (!estoque) throw new ErroNaoEncontrado('Estoque não encontrado.');
    estoque.nivelMinimo = nivelMinimo;
    estoque.nivelSeguranca = nivelSeguranca;
    this.auditoria.registrar(usuarioId, 'CONFIGURAR_NIVEIS', 'estoque', `Estoque ${estoqueId}`, true);
    return estoque;
  }

  /**
   * RF08 — registra uma movimentação de estoque e publica o evento (Observer).
   */
  registrarMovimentacao(dados: DadosMovimentacao): { movimentacao: MovimentacaoEstoque; estoque: Estoque } {
    const estoque = this.estoques.buscarPorId(dados.estoqueId);
    if (!estoque) throw new ErroNaoEncontrado('Estoque não encontrado.');

    const medicamento = this.medicamentos.buscarPorId(estoque.medicamentoId);
    const unidade = this.unidades.buscarPorId(estoque.unidadeId);
    if (!medicamento || !unidade) throw new ErroNaoEncontrado('Medicamento ou unidade não encontrados.');

    switch (dados.tipo) {
      case TipoMovimentacao.ENTRADA:
        estoque.quantidadeAtual += dados.quantidade;
        break;
      case TipoMovimentacao.SAIDA:
      case TipoMovimentacao.TRANSFERENCIA:
        if (dados.quantidade > estoque.quantidadeAtual) {
          throw new RegraNegocioError('RN02', 'Quantidade insuficiente em estoque.');
        }
        if (dados.loteId !== undefined) {
          this.baixarLoteEspecifico(estoque, dados.loteId, dados.quantidade);
        } else {
          this.baixarLotesFEFO(estoque, dados.quantidade);
        }
        estoque.quantidadeAtual -= dados.quantidade;
        break;
      case TipoMovimentacao.AJUSTE:
        estoque.quantidadeAtual = dados.quantidade;
        break;
    }
    estoque.atualizadoEm = new Date();

    const movimentacao = this.movimentacoes.salvar(
      new MovimentacaoEstoque(
        this.movimentacoes.proximoId(),
        estoque.id,
        dados.tipo,
        dados.quantidade,
        dados.usuarioId,
        dados.loteId ?? null,
        new Date(),
        dados.observacao ?? '',
      ),
    );

    // Observer: avisa os observadores registrados (alerta + notificação).
    this.subject.notificar({
      tipo: dados.tipo,
      estoque,
      medicamento,
      unidade,
      quantidadeMovimentada: dados.quantidade,
      usuarioId: dados.usuarioId,
    });

    this.auditoria.registrar(
      dados.usuarioId,
      'MOVIMENTACAO',
      'estoque',
      `${dados.tipo} de ${dados.quantidade} un. de ${medicamento.nome}`,
      true,
    );

    return { movimentacao, estoque };
  }

  /** RN02 — dá baixa nos lotes seguindo o FEFO. */
  private baixarLotesFEFO(estoque: Estoque, quantidade: number): void {
    if (estoque.lotes.length === 0) return;
    const selecionados = RegrasNegocio.selecionarLotesFEFO(estoque.lotes, quantidade);
    let restante = quantidade;
    for (const lote of selecionados) {
      const usar = Math.min(lote.quantidade, restante);
      lote.quantidade -= usar;
      restante -= usar;
    }
    estoque.lotes = estoque.lotes.filter((l) => l.quantidade > 0);
  }

  /** Baixa em lote específico (rastreabilidade de controlados — RN05). */
  private baixarLoteEspecifico(estoque: Estoque, loteId: number, quantidade: number): void {
    const lote = estoque.lotes.find((l) => l.id === loteId);
    if (!lote) throw new ErroNaoEncontrado('Lote não encontrado no estoque.');
    if (lote.estaVencido()) throw new ErroValidacao(`O lote ${lote.numeroLote} está vencido.`);
    if (lote.quantidade < quantidade) {
      throw new RegraNegocioError(
        'RN02',
        `O lote ${lote.numeroLote} possui apenas ${lote.quantidade} unidade(s).`,
      );
    }
    lote.quantidade -= quantidade;
    estoque.lotes = estoque.lotes.filter((l) => l.quantidade > 0);
  }

  movimentacoesDoEstoque(estoqueId: number): MovimentacaoEstoque[] {
    return this.movimentacoes.listarPorEstoque(estoqueId);
  }
}
