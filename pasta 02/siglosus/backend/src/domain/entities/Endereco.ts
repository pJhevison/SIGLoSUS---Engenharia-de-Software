/**
 * Endereço de uma unidade de saúde.
 * (RF05 — cadastro das unidades de saúde)
 */
export class Endereco {
  constructor(
    public logradouro: string,
    public numero: string,
    public cidade: string,
    public uf: string,
    public cep: string,
    public latitude: number,
    public longitude: number,
  ) {}

  /** Distância aproximada (km) até outro endereço — base para roteirização (RF15). */
  distanciaAte(outro: Endereco): number {
    const R = 6371; // raio da Terra em km
    const dLat = this.paraRad(outro.latitude - this.latitude);
    const dLon = this.paraRad(outro.longitude - this.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.paraRad(this.latitude)) *
        Math.cos(this.paraRad(outro.latitude)) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  private paraRad(graus: number): number {
    return (graus * Math.PI) / 180;
  }
}
