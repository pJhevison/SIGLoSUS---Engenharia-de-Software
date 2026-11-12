import { StatusParada } from '../enums';
import { UnidadeSaude } from './UnidadeSaude';

/**
 * Parada de uma rota (visita a uma unidade de destino). (RF15)
 */
export class ParadaRota {
  constructor(
    public readonly id: number,
    public ordem: number,
    public unidade: UnidadeSaude,
    public status: StatusParada = StatusParada.PENDENTE,
    public prioridade: number = 0,
    public janelaInicio?: Date,
    public janelaFim?: Date,
  ) {}

  distanciaAte(outra: ParadaRota): number {
    return this.unidade.endereco.distanciaAte(outra.unidade.endereco);
  }

  concluir(): void {
    this.status = StatusParada.CONCLUIDA;
  }
}
