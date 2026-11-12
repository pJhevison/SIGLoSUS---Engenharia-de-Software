import { Endereco } from './Endereco';
import { TipoUnidade } from '../enums';

/**
 * Unidade de saúde (UBS, hospital, farmácia popular ou central de distribuição). (RF05)
 */
export class UnidadeSaude {
  constructor(
    public readonly id: number,
    public nome: string,
    public tipo: TipoUnidade,
    public cnes: string,
    public endereco: Endereco,
  ) {}

  /** Central de Abastecimento Farmacêutico (origem padrão das distribuições). */
  ehCentralDeDistribuicao(): boolean {
    return this.tipo === TipoUnidade.CENTRAL_DISTRIBUICAO;
  }
}
