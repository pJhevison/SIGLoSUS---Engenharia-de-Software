/**
 * Veículo utilizado na distribuição. (RF15, RN07)
 */
export class Veiculo {
  constructor(
    public readonly id: number,
    public placa: string,
    public capacidadeCargaKg: number,
    public tipo: string,
    public ativo: boolean = true,
  ) {}

  /** RN07: a rota deve respeitar a capacidade de carga do veículo. */
  suportaCarga(pesoKg: number): boolean {
    return pesoKg <= this.capacidadeCargaKg;
  }
}
