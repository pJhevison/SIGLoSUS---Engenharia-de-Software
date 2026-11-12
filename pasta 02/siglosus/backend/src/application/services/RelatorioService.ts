import { Relatorio } from '../../domain/entities';
import {
  AlertaRepository,
  EntregaRepository,
  EstoqueRepository,
  RelatorioRepository,
  UnidadeRepository,
} from '../../infrastructure/repositories';

/**
 * Serviço de relatórios e painéis gerenciais (RF21).
 */
export class RelatorioService {
  constructor(
    private readonly relatorios: RelatorioRepository,
    private readonly estoques: EstoqueRepository,
    private readonly unidades: UnidadeRepository,
    private readonly alertas: AlertaRepository,
    private readonly entregas: EntregaRepository,
  ) {}

  /** Painel gerencial (dashboard) com os principais indicadores. */
  dashboard(): Record<string, number> {
    const estoques = this.estoques.listar();
    return {
      unidadesAtendidas: this.unidades.listar().length,
      itensMonitorados: estoques.length,
      itensCriticos: estoques.filter((e) => e.abaixoDoMinimo()).length,
      alertasAbertos: this.alertas.listarAbertos().length,
      entregasPendentes: this.entregas.listar().filter((e) => e.status !== 'ENTREGUE').length,
      totalUnidadesEmRisco: new Set(
        estoques.filter((e) => e.abaixoDoMinimo()).map((e) => e.unidadeId),
      ).size,
    };
  }

  gerar(tipo: string, usuarioId: number): Relatorio {
    const dados = this.dashboard();
    const relatorio = new Relatorio(
      this.relatorios.proximoId(),
      `Relatório de ${tipo}`,
      tipo,
      usuarioId,
      new Date(),
      dados,
    );
    return this.relatorios.salvar(relatorio);
  }

  listar(): Relatorio[] {
    return this.relatorios.listar();
  }
}
