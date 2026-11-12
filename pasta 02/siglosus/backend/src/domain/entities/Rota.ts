import { StatusRota } from '../enums';
import { ParadaRota } from './ParadaRota';
import { UnidadeSaude } from './UnidadeSaude';

/**
 * Rota de distribuição otimizada. (RF15, RF16)
 */
export class Rota {
  constructor(
    public readonly id: number,
    public data: Date,
    public veiculoId: number,
    public paradas: ParadaRota[] = [],
    public status: StatusRota = StatusRota.PLANEJADA,
    public distanciaTotalKm: number = 0,
    public tempoEstimadoMin: number = 0,
    public estrategia: string = '',
  ) {}

  adicionarParada(parada: ParadaRota): void {
    this.paradas.push(parada);
  }

  /** Recalcula a distância total somando os trechos entre paradas consecutivas. */
  recalcularDistancia(origem?: UnidadeSaude): void {
    this.distanciaTotalKm = 0;
    if (this.paradas.length === 0) {
      this.tempoEstimadoMin = 0;
      return;
    }
    if (origem) {
      this.distanciaTotalKm += origem.endereco.distanciaAte(this.paradas[0].unidade.endereco);
    }
    for (let i = 1; i < this.paradas.length; i++) {
      this.distanciaTotalKm += this.paradas[i - 1].distanciaAte(this.paradas[i]);
    }
    // estimativa simples: 30 km/h médios na zona urbana
    this.tempoEstimadoMin = Math.round((this.distanciaTotalKm / 30) * 60);
  }

  disponibilizarParaDespacho(): void {
    this.status = StatusRota.PLANEJADA;
  }

  iniciar(): void {
    this.status = StatusRota.EM_ANDAMENTO;
  }

  concluir(): void {
    this.status = StatusRota.CONCLUIDA;
  }
}
