import { Medicamento } from '../../domain/entities';
import { DatabaseMemoria } from '../database/DatabaseMemoria';
import { RepositorioBase } from './RepositorioBase';

export class MedicamentoRepository extends RepositorioBase<Medicamento> {
  constructor(db: DatabaseMemoria) {
    super(db, 'medicamentos', () => db.medicamentos);
  }

  buscarPorCATMAT(codigo: string): Medicamento | undefined {
    return this.listar().find((m) => m.codigoCATMAT === codigo);
  }
}
