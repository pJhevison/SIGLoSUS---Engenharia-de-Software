import { Usuario } from '../../domain/entities';
import { ErroNaoAutenticado } from '../../domain/errors';
import { UsuarioRepository } from '../../infrastructure/repositories';
import { ConteudoToken, GerenciadorJWT } from '../../infrastructure/security/GerenciadorJWT';
import { AuditoriaService } from './AuditoriaService';

export class CredenciaisInvalidasError extends Error {
  readonly status = 401;

  constructor() {
    super('Credenciais inválidas.');
    this.name = 'CredenciaisInvalidasError';
  }
}

export class UsuarioBloqueadoError extends Error {
  readonly status = 423;

  constructor() {
    super('Usuário bloqueado temporariamente após 5 tentativas incorretas.');
    this.name = 'UsuarioBloqueadoError';
  }
}

export interface ResultadoAutenticacao {
  usuario: Usuario;
  token: string;
  expiraEmSegundos: number;
}

/**
 * Serviço de autenticação (UC01; RF01, RF02, RF03).
 *
 * Emite **JWT assinado** (HMAC-SHA256) com expiração, valida assinatura e
 * expiração, mantém lista de revogação (logout) e invalida tokens emitidos
 * antes de uma troca de senha (via `versaoToken` do usuário).
 */
export class AutenticacaoService {
  /** Tokens revogados: identificador (jti) -> instante de expiração (epoch). */
  private readonly revogados = new Map<string, number>();

  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly auditoria: AuditoriaService,
    private readonly jwt: GerenciadorJWT,
  ) {}

  autenticar(identificador: string, senha: string): ResultadoAutenticacao {
    const usuario = this.usuarios.buscarPorEmailOuCpf(String(identificador ?? ''));

    if (!usuario) {
      this.auditoria.registrar(null, 'LOGIN', 'autenticacao', 'Usuário inexistente', false);
      throw new CredenciaisInvalidasError();
    }

    if (!usuario.ativo) {
      this.auditoria.registrar(usuario.id, 'LOGIN', 'autenticacao', 'Usuário inativo', false);
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

    // Migração transparente: senhas em SHA-256 legado são rehashadas em bcrypt.
    if (usuario.senhaLegada()) {
      usuario.definirSenha(senha);
      this.auditoria.registrar(
        usuario.id,
        'MIGRAR_HASH_SENHA',
        'usuario',
        'Credencial migrada de SHA-256 para bcrypt',
        true,
      );
    }

    const token = this.jwt.emitir({
      id: usuario.id,
      perfil: usuario.perfil,
      nome: usuario.nome,
      email: usuario.email,
      versaoToken: usuario.versaoToken,
    });
    const conteudo = this.jwt.validar(token);

    this.auditoria.registrar(usuario.id, 'LOGIN', 'autenticacao', 'Acesso autorizado', true);
    return {
      usuario,
      token,
      expiraEmSegundos: Math.max(0, conteudo.exp - Math.floor(Date.now() / 1000)),
    };
  }

  /**
   * Valida o token: assinatura, expiração, revogação e estado da conta.
   * Devolve o usuário autenticado.
   */
  autenticarToken(token: string): { usuario: Usuario; conteudo: ConteudoToken } {
    const conteudo = this.jwt.validar(token);
    this.limparRevogados();

    if (this.revogados.has(conteudo.jti)) {
      throw new ErroNaoAutenticado('Sessão encerrada. Autentique-se novamente.');
    }

    const usuario = this.usuarios.buscarPorId(conteudo.usuarioId);
    if (!usuario || !usuario.ativo) {
      throw new ErroNaoAutenticado('Conta inexistente ou inativa.');
    }
    if (usuario.versaoToken !== conteudo.versaoToken) {
      throw new ErroNaoAutenticado('Credencial alterada. Autentique-se novamente.');
    }

    return { usuario, conteudo };
  }

  /** Encerra a sessão, revogando o token informado (RF03). */
  encerrarSessao(token: string, usuarioId: number): void {
    const conteudo = this.jwt.validar(token);
    this.revogados.set(conteudo.jti, conteudo.exp);
    this.auditoria.registrar(usuarioId, 'LOGOUT', 'autenticacao', 'Sessão encerrada', true);
  }

  /** Remove da lista de revogação as entradas já expiradas. */
  private limparRevogados(): void {
    const agora = Math.floor(Date.now() / 1000);
    for (const [jti, expiraEm] of this.revogados) {
      if (expiraEm < agora) this.revogados.delete(jti);
    }
  }
}
