import { LogAuditoria } from '../../domain/entities';
import { AuditoriaRepository } from '../../infrastructure/repositories';

/**
 * Serviço de auditoria (RF22, RNF10).
 * Registra todas as operações críticas realizadas pelos usuários.
 */
export class AuditoriaService {
  constructor(private readonly repositorio: AuditoriaRepository) {}

  registrar(
    usuarioId: number | null,
    acao: string,
    recurso: string,
    detalhe: string = '',
    sucesso: boolean = true,
  ): LogAuditoria {
    const log = new LogAuditoria(
      this.repositorio.proximoId(),
      usuarioId,
      acao,
      recurso,
      detalhe,
      new Date(),
      sucesso,
    );
    return this.repositorio.salvar(log);
  }

  listar(): LogAuditoria[] {
    return this.repositorio.listar().sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime());
  }
}
