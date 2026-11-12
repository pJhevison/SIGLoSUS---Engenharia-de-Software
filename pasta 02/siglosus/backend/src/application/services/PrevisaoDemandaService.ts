import { PrevisaoDemanda } from '../../domain/entities';
import { TipoMovimentacao } from '../../domain/enums';
import {
  EstoqueRepository,
  MovimentacaoRepository,
  PrevisaoRepository,
} from '../../infrastructure/repositories';

/**
 * Serviço de previsão de demanda (RF12).
 *
 * Usa uma média móvel do consumo (saídas) dos últimos 90 dias. Na ausência de
 * histórico, aplica uma heurística baseada no nível de segurança configurado.
 */
export class PrevisaoDemandaService {
  constructor(
    private readonly estoques: EstoqueRepository,
    private readonly previsoes: PrevisaoRepository,
    private readonly movimentacoes: MovimentacaoRepository,
  ) {}

  prever(unidadeId: number, medicamentoId: number, periodoDias: number = 30): PrevisaoDemanda {
    const estoque = this.estoques.buscarPorUnidadeEMedicamento(unidadeId, medicamentoId);
    const limite = Date.now() - 90 * 86_400_000;
    const saidas = this.movimentacoes
      .listar()
      .filter(
        (m) =>
          m.tipo === TipoMovimentacao.SAIDA &&
          m.estoqueId === estoque?.id &&
          m.dataHora.getTime() >= limite,
      );

    const temHistorico = saidas.length > 0;
    const consumoDiario = temHistorico
      ? saidas.reduce((soma, m) => soma + m.quantidade, 0) / 90
      : (estoque?.nivelSeguranca ?? 0) / 30;

    const previsao = new PrevisaoDemanda(
      this.previsoes.proximoId(),
      unidadeId,
      medicamentoId,
      `${periodoDias} dias`,
      Math.ceil(consumoDiario * periodoDias),
      temHistorico ? 'Média móvel (90 dias)' : 'Heurística (nível de segurança)',
      temHistorico ? 0.85 : 0.5,
    );
    return this.previsoes.salvar(previsao);
  }

  preverTodas(periodoDias: number = 30): PrevisaoDemanda[] {
    return this.estoques.listar().map((e) => this.prever(e.unidadeId, e.medicamentoId, periodoDias));
  }

  listar(): PrevisaoDemanda[] {
    return this.previsoes.listar();
  }
}
