/**
 * Posição reportada por uma rota em andamento. (RF16)
 *
 * As coordenadas são **informadas pelo dispositivo do motorista** (API do
 * navegador no protótipo). O protótipo não integra hardware GPS: o registro
 * comprova o fluxo de coleta, armazenamento e consulta, não o posicionamento
 * real de um veículo.
 */
export class PosicaoRota {
  constructor(
    public readonly id: number,
    public readonly rotaId: number,
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly dataHora: Date = new Date(),
    public readonly velocidadeKmh?: number,
    public readonly usuarioId?: number,
  ) {}

  /** Valida os limites geográficos da Terra (RN de integridade de dados). */
  coordenadasValidas(): boolean {
    return (
      Number.isFinite(this.latitude) &&
      Number.isFinite(this.longitude) &&
      this.latitude >= -90 &&
      this.latitude <= 90 &&
      this.longitude >= -180 &&
      this.longitude <= 180
    );
  }
}
