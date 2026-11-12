import { StatusIntegracao } from '../enums';

/**
 * Configuração de integração com um sistema de saúde externo. (RF07)
 */
export class IntegracaoExterna {
  constructor(
    public readonly id: number,
    public sistema: string,
    public endpoint: string,
    public status: StatusIntegracao = StatusIntegracao.ATIVA,
    public ultimaSincronizacao?: Date,
  ) {}

  registrarSincronizacao(): void {
    this.ultimaSincronizacao = new Date();
    this.status = StatusIntegracao.ATIVA;
  }

  registrarErro(): void {
    this.status = StatusIntegracao.ERRO;
  }
}
