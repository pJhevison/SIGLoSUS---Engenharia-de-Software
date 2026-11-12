import { ParadaRota, Rota } from '../../domain/entities';
import { StatusParada, StatusRota } from '../../domain/enums';
import { RegrasNegocio } from '../../domain/rules/RegrasNegocio';
import {
  EstoqueRepository,
  RotaRepository,
  UnidadeRepository,
  VeiculoRepository,
} from '../../infrastructure/repositories';
import {
  EstrategiaRoteirizacao,
  PontoEntrega,
  RotaCapacidadeVeiculo,
  RotaMenorDistancia,
  RotaPorPrioridade,
  Roteirizador,
} from '../../patterns/strategy/EstrategiaRoteirizacao';
import { AuditoriaService } from './AuditoriaService';

export type NomeEstrategia = 'MENOR_DISTANCIA' | 'PRIORIDADE' | 'CAPACIDADE_VEICULO';

export interface DadosRota {
  veiculoId: number;
  unidadesDestinoIds: number[];
  estrategia?: NomeEstrategia;
  pesoPorUnidadeKg?: number;
  usuarioId: number;
}

/**
 * Serviço de roteirização (RF15, RF16 — UC16).
 *
 * Usa o padrão STRATEGY para escolher o algoritmo de ordenação das paradas,
 * respeitando RN04 (prioridade), RN07 (capacidade/jornada) e RN08 (proximidade).
 */
export class RotaService {
  constructor(
    private readonly rotas: RotaRepository,
    private readonly veiculos: VeiculoRepository,
    private readonly unidades: UnidadeRepository,
    private readonly estoques: EstoqueRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(): Rota[] {
    return this.rotas.listar();
  }

  buscar(id: number): Rota | undefined {
    return this.rotas.buscarPorId(id);
  }

  estrategiasDisponiveis(): NomeEstrategia[] {
    return ['MENOR_DISTANCIA', 'PRIORIDADE', 'CAPACIDADE_VEICULO'];
  }

  gerarRota(dados: DadosRota): Rota {
    const veiculo = this.veiculos.buscarPorId(dados.veiculoId);
    if (!veiculo) throw new Error('Veículo não encontrado.');
    const origem = this.unidades.centralDeDistribuicao();
    if (!origem) throw new Error('Central de distribuição não configurada.');

    const pesoPorUnidade = dados.pesoPorUnidadeKg ?? 50;
    const pontos: PontoEntrega[] = dados.unidadesDestinoIds.map((id) => {
      const unidade = this.unidades.buscarPorId(id);
      if (!unidade) throw new Error(`Unidade ${id} não encontrada.`);
      return {
        unidade,
        prioridade: this.calcularPrioridade(id),
        pesoKg: pesoPorUnidade,
      };
    });

    const estrategia = this.selecionarEstrategia(dados.estrategia, veiculo.capacidadeCargaKg);
    const roteirizador = new Roteirizador(estrategia);
    const ordenados = roteirizador.gerarRota(origem, pontos);

    const rota = new Rota(
      this.rotas.proximoId(),
      new Date(),
      veiculo.id,
      [],
      StatusRota.PLANEJADA,
      0,
      0,
      estrategia.nome,
    );

    let ordem = 1;
    for (const ponto of ordenados) {
      rota.adicionarParada(
        new ParadaRota(
          this.rotas.proximoId(),
          ordem++,
          ponto.unidade,
          StatusParada.PENDENTE,
          ponto.prioridade,
        ),
      );
    }
    rota.recalcularDistancia(origem);

    // RN07 — valida capacidade de carga e jornada do motorista.
    const pesoTotal = ordenados.reduce((soma, p) => soma + p.pesoKg, 0);
    RegrasNegocio.validarRN07_CapacidadeEJornada(veiculo, pesoTotal, rota.tempoEstimadoMin);

    this.rotas.salvar(rota);
    this.auditoria.registrar(
      dados.usuarioId,
      'GERAR_ROTA',
      'rota',
      `Rota ${rota.id} (${estrategia.nome}) com ${rota.paradas.length} parada(s)`,
      true,
    );
    return rota;
  }

  /** Seleciona a estratégia (Strategy) conforme parâmetro ou capacidade do veículo. */
  private selecionarEstrategia(nome: NomeEstrategia | undefined, capacidadeKg: number): EstrategiaRoteirizacao {
    switch (nome) {
      case 'PRIORIDADE':
        return new RotaPorPrioridade();
      case 'CAPACIDADE_VEICULO':
        return new RotaCapacidadeVeiculo(capacidadeKg);
      case 'MENOR_DISTANCIA':
      default:
        return new RotaMenorDistancia();
    }
  }

  /** RN04 — unidades abaixo do mínimo têm prioridade. */
  private calcularPrioridade(unidadeId: number): number {
    const estoques = this.estoques.listarPorUnidade(unidadeId);
    if (estoques.length === 0) return 0;
    return Math.max(...estoques.map((e) => RegrasNegocio.calcularPrioridadeRecebimento(e)));
  }
}
