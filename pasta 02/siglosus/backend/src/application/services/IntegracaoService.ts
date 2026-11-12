import { Estoque } from '../../domain/entities';
import { TipoMovimentacao } from '../../domain/enums';
import {
  EstoqueRepository,
  IntegracaoRepository,
  MedicamentoRepository,
  UnidadeRepository,
} from '../../infrastructure/repositories';
import { BnafarAdapter } from '../../patterns/adapter/BnafarAdapter';
import { ESUSAPSAdapter } from '../../patterns/adapter/ESUSAPSAdapter';
import { HorusAdapter } from '../../patterns/adapter/HorusAdapter';
import { SistemaSaudeAdapter } from '../../patterns/adapter/SistemaSaudeAdapter';
import { AuditoriaService } from './AuditoriaService';
import { EstoqueService } from './EstoqueService';

export interface ResultadoSincronizacao {
  sistema: string;
  registrosRecebidos: number;
  atualizados: number;
  divergencias: number;
}

/**
 * Serviço de integração com sistemas de saúde externos (RF07 — UC07).
 *
 * Usa o padrão ADAPTER: cada sistema externo é acessado por meio de um adaptador
 * que traduz seu formato para o modelo interno do SIGLoSUS.
 */
export class IntegracaoService {
  private readonly adapters: SistemaSaudeAdapter[];

  constructor(
    private readonly integracoes: IntegracaoRepository,
    private readonly unidades: UnidadeRepository,
    private readonly medicamentos: MedicamentoRepository,
    private readonly estoques: EstoqueRepository,
    private readonly estoqueService: EstoqueService,
    private readonly auditoria: AuditoriaService,
  ) {
    this.adapters = [new ESUSAPSAdapter(), new HorusAdapter(), new BnafarAdapter()];
  }

  listar() {
    return this.integracoes.listar();
  }

  adaptersDisponiveis(): string[] {
    return this.adapters.map((a) => a.nome);
  }

  /** UC07 — sincroniza o estoque a partir dos sistemas de origem. */
  sincronizar(usuarioId: number, sistema?: string): ResultadoSincronizacao[] {
    const alvos = this.adapters.filter((a) => !sistema || a.nome === sistema);
    const resultados: ResultadoSincronizacao[] = [];

    for (const adapter of alvos) {
      const registros = adapter.obterEstoque();
      let atualizados = 0;
      let divergencias = 0;

      for (const registro of registros) {
        const unidade = this.unidades.buscarPorCnes(registro.cnesUnidade);
        const medicamento = this.medicamentos.buscarPorCATMAT(registro.codigoCATMAT);
        if (!unidade || !medicamento) {
          divergencias++;
          continue;
        }

        let estoque = this.estoques.buscarPorUnidadeEMedicamento(unidade.id, medicamento.id);
        if (!estoque) {
          estoque = new Estoque(
            this.estoques.proximoId(),
            unidade.id,
            medicamento.id,
            0,
            0,
            0,
            [],
          );
          this.estoques.salvar(estoque);
        }

        // Conciliação: registra um AJUSTE com a posição vinda do sistema externo.
        this.estoqueService.registrarMovimentacao({
          estoqueId: estoque.id,
          tipo: TipoMovimentacao.AJUSTE,
          quantidade: registro.quantidade,
          usuarioId,
          observacao: `Sincronização ${adapter.nome} — lote ${registro.numeroLote}`,
        });
        atualizados++;
      }

      const integracao = this.integracoes.buscarPorSistema(adapter.nome);
      integracao?.registrarSincronizacao();

      resultados.push({
        sistema: adapter.nome,
        registrosRecebidos: registros.length,
        atualizados,
        divergencias,
      });
    }

    this.auditoria.registrar(
      usuarioId,
      'SINCRONIZAR',
      'integracao',
      `Sistemas: ${alvos.map((a) => a.nome).join(', ')}`,
      true,
    );
    return resultados;
  }
}
