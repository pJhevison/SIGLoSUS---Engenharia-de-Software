/**
 * Registro de auditoria de operações críticas. (RF22, RNF10)
 */
export class LogAuditoria {
  constructor(
    public readonly id: number,
    public usuarioId: number | null,
    public acao: string,
    public recurso: string,
    public detalhe: string = '',
    public dataHora: Date = new Date(),
    public sucesso: boolean = true,
  ) {}
}
