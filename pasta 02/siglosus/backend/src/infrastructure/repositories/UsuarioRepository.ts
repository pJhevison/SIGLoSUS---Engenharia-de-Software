import { Usuario } from '../../domain/entities';
import { DatabaseMemoria } from '../database/DatabaseMemoria';
import { RepositorioBase } from './RepositorioBase';

export class UsuarioRepository extends RepositorioBase<Usuario> {
  constructor(db: DatabaseMemoria) {
    super(db, 'usuarios', () => db.usuarios);
  }

  buscarPorEmailOuCpf(identificador: string): Usuario | undefined {
    const alvo = identificador.trim().toLowerCase();
    return this.listar().find(
      (u) => u.email.toLowerCase() === alvo || u.cpf === identificador.trim(),
    );
  }

  listarAtivos(): Usuario[] {
    return this.listar().filter((u) => u.ativo);
  }
}
