import { Estoque } from '../entities/Estoque';
import { Lote } from '../entities/Lote';
import { Requisicao } from '../entities/Requisicao';
import { Veiculo } from '../entities/Veiculo';

/**
 * Erro de violação de regra de negócio. Carrega o código da regra (RN01..RN09)
 * para rastreabilidade e para a camada de apresentação.
 */
export class RegraNegocioError extends Error {
  constructor(
    public readonly codigo: string,
    mensagem: string,
  ) {
    super(`[${codigo}] ${mensagem}`);
    this.name = 'RegraNegocioError';
  }
}

/**
 * Implementação centralizada das 9 Regras de Negócio do SIGLoSUS (seção 2.3).
 *
 * Manter as regras em um único ponto coeso evita duplicação e garante que a
 * documentação e o software permaneçam alinhados.
 */
export class RegrasNegocio {
  /** RN01 — só transfere de quem está acima do nível de segurança. */
  static validarRN01_OrigemAcimaDoSeguranca(estoqueOrigem: Estoque, quantidade: number): void {
    if (quantidade > estoqueOrigem.excedenteSobreSeguranca()) {
      throw new RegraNegocioError(
        'RN01',
        `A unidade de origem não possui excedente suficiente acima do nível de segurança ` +
          `(disponível para transferência: ${estoqueOrigem.excedenteSobreSeguranca()}).`,
      );
    }
  }

  /** RN02 — FEFO: o primeiro que expira é o primeiro que sai. */
  static selecionarLotesFEFO(lotes: Lote[], quantidade: number): Lote[] {
    const ordenados = [...lotes]
      .filter((l) => !l.estaVencido())
      .sort((a, b) => a.validade.getTime() - b.validade.getTime());
    const selecionados: Lote[] = [];
    let restante = quantidade;
    for (const lote of ordenados) {
      if (restante <= 0) break;
      const usar = Math.min(lote.quantidade, restante);
      selecionados.push(lote);
      restante -= usar;
    }
    if (restante > 0) {
      throw new RegraNegocioError('RN02', 'Estoque insuficiente para atender à saída por FEFO.');
    }
    return selecionados;
  }

  /** RN03 — validade inferior a 90 dias não pode ser transferida. */
  static validarRN03_ValidadeMinima(lote: Lote): void {
    if (!lote.podeSerTransferido()) {
      throw new RegraNegocioError(
        'RN03',
        `O lote ${lote.numeroLote} vence em menos de 90 dias e não pode ser transferido.`,
      );
    }
  }

  /** RN04 — unidades abaixo do nível mínimo têm prioridade no recebimento. */
  static calcularPrioridadeRecebimento(estoque: Estoque): number {
    if (estoque.abaixoDoMinimo()) return 100;
    if (estoque.deficitParaSeguranca() > 0) return 50;
    return 0;
  }

  /** RN05 — controlados exigem rastreabilidade por lote e conferência dupla. */
  static validarRN05_ConferenciaDupla(controlado: boolean, conferentes: number): void {
    if (controlado && conferentes < 2) {
      throw new RegraNegocioError(
        'RN05',
        'Medicamento controlado exige conferência por dois responsáveis.',
      );
    }
  }

  /** RN06 — prioriza os medicamentos da RENAME. */
  static prioridadeRENAME(rename: boolean): number {
    return rename ? 1 : 0;
  }

  /** RN07 — respeita a capacidade de carga do veículo e a jornada do motorista. */
  static validarRN07_CapacidadeEJornada(
    veiculo: Veiculo,
    pesoTotalKg: number,
    duracaoMin: number,
    jornadaMaximaMin = 480,
  ): void {
    if (!veiculo.suportaCarga(pesoTotalKg)) {
      throw new RegraNegocioError(
        'RN07',
        `Peso total (${pesoTotalKg} kg) excede a capacidade do veículo (${veiculo.capacidadeCargaKg} kg).`,
      );
    }
    if (duracaoMin > jornadaMaximaMin) {
      throw new RegraNegocioError(
        'RN07',
        `Duração estimada (${duracaoMin} min) excede a jornada máxima (${jornadaMaximaMin} min).`,
      );
    }
  }

  /** RN08 — prioriza as unidades mais próximas, reduzindo custo e tempo. */
  static ordenarPorProximidade<T>(itens: T[], distancia: (item: T) => number): T[] {
    return [...itens].sort((a, b) => distancia(a) - distancia(b));
  }

  /** RN09 — requisições acima do limite de valor exigem aprovação do gestor. */
  static validarRN09_AprovacaoGestor(requisicao: Requisicao, limiteValor: number): void {
    if (requisicao.exigeAprovacaoGestor(limiteValor) && requisicao.status !== 'APROVADA') {
      throw new RegraNegocioError(
        'RN09',
        `Requisição de R$ ${requisicao.valorEstimado.toFixed(2)} excede o limite de ` +
          `R$ ${limiteValor.toFixed(2)} e exige aprovação do gestor.`,
      );
    }
  }
}
