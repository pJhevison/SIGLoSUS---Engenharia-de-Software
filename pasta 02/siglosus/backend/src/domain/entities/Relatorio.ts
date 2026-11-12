/**
 * Relatório / painel gerencial. (RF21)
 */
export class Relatorio {
  constructor(
    public readonly id: number,
    public titulo: string,
    public tipo: string,
    public geradoPorUsuarioId: number,
    public geradoEm: Date = new Date(),
    public dados: Record<string, unknown> = {},
  ) {}
}
