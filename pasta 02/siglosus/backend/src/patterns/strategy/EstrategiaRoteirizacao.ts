import { UnidadeSaude } from '../../domain/entities';

/**
 * PADRÃO DE PROJETO: STRATEGY
 * ------------------------------------------------------------------
 * Problema: existem várias formas de ordenar as paradas de uma rota —
 * pela menor distância, pela prioridade das unidades, ou respeitando a
 * capacidade do veículo. Fixar uma única fórmula engessaria o sistema.
 *
 * Solução: encapsular cada algoritmo em uma classe que implementa uma
 * interface comum (`EstrategiaRoteirizacao`); o contexto (`Roteirizador`)
 * escolhe a estratégia em tempo de execução.
 *
 * Aplicação no SIGLoSUS: geração de rotas otimizadas (RF15, RN04, RN07, RN08).
 */

export interface PontoEntrega {
  unidade: UnidadeSaude;
  /** Prioridade de recebimento (RN04): 100 = abaixo do mínimo, 50 = déficit, 0 = normal. */
  prioridade: number;
  /** Peso estimado da carga destinada à unidade (kg) — usado por RN07. */
  pesoKg: number;
}

export interface EstrategiaRoteirizacao {
  readonly nome: string;
  ordenar(origem: UnidadeSaude, pontos: PontoEntrega[]): PontoEntrega[];
}

/** Estratégia: vizinho mais próximo (RN08 — prioriza proximidade). */
export class RotaMenorDistancia implements EstrategiaRoteirizacao {
  readonly nome = 'MENOR_DISTANCIA';

  ordenar(origem: UnidadeSaude, pontos: PontoEntrega[]): PontoEntrega[] {
    const restantes = [...pontos];
    const ordenados: PontoEntrega[] = [];
    let atual = origem;
    while (restantes.length > 0) {
      restantes.sort(
        (a, b) =>
          atual.endereco.distanciaAte(a.unidade.endereco) -
          atual.endereco.distanciaAte(b.unidade.endereco),
      );
      const proximo = restantes.shift()!;
      ordenados.push(proximo);
      atual = proximo.unidade;
    }
    return ordenados;
  }
}

/** Estratégia: maior prioridade primeiro (RN04). */
export class RotaPorPrioridade implements EstrategiaRoteirizacao {
  readonly nome = 'PRIORIDADE';

  ordenar(_origem: UnidadeSaude, pontos: PontoEntrega[]): PontoEntrega[] {
    return [...pontos].sort((a, b) => b.prioridade - a.prioridade);
  }
}

/** Estratégia: respeita a capacidade do veículo, priorizando por densidade (RN07). */
export class RotaCapacidadeVeiculo implements EstrategiaRoteirizacao {
  readonly nome = 'CAPACIDADE_VEICULO';

  constructor(private readonly capacidadeKg: number) {}

  ordenar(_origem: UnidadeSaude, pontos: PontoEntrega[]): PontoEntrega[] {
    const selecionados: PontoEntrega[] = [];
    let pesoAcumulado = 0;
    const candidatos = [...pontos].sort((a, b) => {
      const densidadeA = a.pesoKg > 0 ? a.prioridade / a.pesoKg : Infinity;
      const densidadeB = b.pesoKg > 0 ? b.prioridade / b.pesoKg : Infinity;
      return densidadeB - densidadeA;
    });
    for (const ponto of candidatos) {
      if (pesoAcumulado + ponto.pesoKg <= this.capacidadeKg) {
        selecionados.push(ponto);
        pesoAcumulado += ponto.pesoKg;
      }
    }
    return selecionados;
  }
}

/** Contexto que usa a estratégia escolhida. */
export class Roteirizador {
  constructor(private estrategia: EstrategiaRoteirizacao) {}

  definirEstrategia(estrategia: EstrategiaRoteirizacao): void {
    this.estrategia = estrategia;
  }

  get estrategiaAtual(): string {
    return this.estrategia.nome;
  }

  gerarRota(origem: UnidadeSaude, pontos: PontoEntrega[]): PontoEntrega[] {
    return this.estrategia.ordenar(origem, pontos);
  }
}
