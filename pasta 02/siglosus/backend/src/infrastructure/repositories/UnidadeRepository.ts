import { UnidadeSaude } from '../../domain/entities';
import { DatabaseMemoria } from '../database/DatabaseMemoria';
import { RepositorioBase } from './RepositorioBase';

export class UnidadeRepository extends RepositorioBase<UnidadeSaude> {
  constructor(db: DatabaseMemoria) {
    super(db, 'unidades', () => db.unidades);
  }

  buscarPorCnes(cnes: string): UnidadeSaude | undefined {
    return this.listar().find((u) => u.cnes === cnes);
  }

  centralDeDistribuicao(): UnidadeSaude | undefined {
    return this.listar().find((u) => u.ehCentralDeDistribuicao());
  }
}
