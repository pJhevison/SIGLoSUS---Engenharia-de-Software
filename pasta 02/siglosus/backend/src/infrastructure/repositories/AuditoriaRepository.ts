import { IntegracaoExterna, LogAuditoria, Relatorio } from '../../domain/entities';
import { DatabaseMemoria } from '../database/DatabaseMemoria';
import { RepositorioBase } from './RepositorioBase';

export class IntegracaoRepository extends RepositorioBase<IntegracaoExterna> {
  constructor(db: DatabaseMemoria) {
    super(db, 'integracoes', () => db.integracoes);
  }
  buscarPorSistema(sistema: string): IntegracaoExterna | undefined {
    return this.listar().find((i) => i.sistema === sistema);
  }
}

export class RelatorioRepository extends RepositorioBase<Relatorio> {
  constructor(db: DatabaseMemoria) {
    super(db, 'relatorios', () => db.relatorios);
  }
}

export class AuditoriaRepository extends RepositorioBase<LogAuditoria> {
  constructor(db: DatabaseMemoria) {
    super(db, 'auditoria', () => db.auditoria);
  }
}
