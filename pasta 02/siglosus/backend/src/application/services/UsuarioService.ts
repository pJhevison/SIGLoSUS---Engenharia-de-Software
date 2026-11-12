import { Usuario } from '../../domain/entities';
import { PerfilUsuario } from '../../domain/enums';
import { UsuarioRepository } from '../../infrastructure/repositories';
import { AuditoriaService } from './AuditoriaService';

export interface DadosNovoUsuario {
  nome: string;
  cpf: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
}

/**
 * Serviço de gestão de usuários (RF04).
 */
export class UsuarioService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(): Usuario[] {
    return this.usuarios.listar();
  }

  criar(dados: DadosNovoUsuario, autorId: number): Usuario {
    if (this.usuarios.buscarPorEmailOuCpf(dados.email)) {
      throw new Error('Já existe usuário com este e-mail.');
    }
    const usuario = new Usuario(
      this.usuarios.proximoId(),
      dados.nome,
      dados.cpf,
      dados.email,
      Usuario.hashSenha(dados.senha),
      dados.perfil,
      true,
    );
    this.usuarios.salvar(usuario);
    this.auditoria.registrar(autorId, 'CRIAR_USUARIO', 'usuario', `${dados.email} (${dados.perfil})`, true);
    return usuario;
  }

  inativar(id: number, autorId: number): Usuario | undefined {
    const usuario = this.usuarios.buscarPorId(id);
    if (!usuario) throw new Error('Usuário não encontrado.');
    usuario.inativar();
    this.auditoria.registrar(autorId, 'INATIVAR_USUARIO', 'usuario', usuario.email, true);
    return usuario;
  }
}
