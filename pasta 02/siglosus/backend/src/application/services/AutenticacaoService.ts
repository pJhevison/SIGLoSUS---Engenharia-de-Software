import { Usuario } from '../../domain/entities';
import { UsuarioRepository } from '../../infrastructure/repositories';
import { AuditoriaService } from './AuditoriaService';

export class CredenciaisInvalidasError extends Error {
  constructor() {
    super('Credenciais inválidas.');
    this.name = 'CredenciaisInvalidasError';
  }
}

export class UsuarioBloqueadoError extends Error {
  constructor() {
    super('Usuário bloqueado temporariamente após 5 tentativas incorretas.');
    this.name = 'UsuarioBloqueadoError';
  }
}

export interface ResultadoAutenticacao {
  usuario: Usuario;
  token: string;
}

/**
 * Serviço de autenticação (UC01; RF01, RF02, RF03).
 */
export class AutenticacaoService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  autenticar(identificador: string, senha: string): ResultadoAutenticacao {
    const usuario = this.usuarios.buscarPorEmailOuCpf(identificador);

    if (!usuario) {
      this.auditoria.registrar(null, 'LOGIN', 'autenticacao', `Usuário inexistente: ${identificador}`, false);
      throw new CredenciaisInvalidasError();
    }

    if (usuario.estaBloqueado()) {
      this.auditoria.registrar(usuario.id, 'LOGIN', 'autenticacao', 'Tentativa com usuário bloqueado', false);
      throw new UsuarioBloqueadoError();
    }

    if (!usuario.autenticar(senha)) {
      this.auditoria.registrar(usuario.id, 'LOGIN', 'autenticacao', 'Senha incorreta', false);
      throw new CredenciaisInvalidasError();
    }

    this.auditoria.registrar(usuario.id, 'LOGIN', 'autenticacao', 'Acesso autorizado', true);
    return { usuario, token: this.gerarToken(usuario) };
  }

  /** Token de demonstração (em produção: JWT assinado). */
  private gerarToken(usuario: Usuario): string {
    return Buffer.from(`${usuario.id}:${usuario.perfil}:${Date.now()}`).toString('base64');
  }
}
