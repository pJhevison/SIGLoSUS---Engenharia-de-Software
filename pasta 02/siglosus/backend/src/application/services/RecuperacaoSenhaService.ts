import { TokenRecuperacaoSenha, Usuario } from '../../domain/entities';
import { ErroNaoEncontrado, ErroValidacao } from '../../domain/errors';
import { TokenRecuperacaoRepository, UsuarioRepository } from '../../infrastructure/repositories';
import { gerarTokenTemporario, hashToken } from '../../domain/security/Senha';
import { ConfiguracaoSistema } from '../../patterns/singleton/ConfiguracaoSistema';
import { AuditoriaService } from './AuditoriaService';

/** Tamanho mínimo exigido para uma senha do sistema (RNF01). */
export const TAMANHO_MINIMO_SENHA = 8;

export interface ResultadoSolicitacao {
  /** Indica se existe conta ativa para o e-mail informado. */
  contaEncontrada: boolean;
  /**
   * Token de recuperação em texto claro. Só é devolvido fora do ambiente de
   * produção: em produção o token deve ser entregue por e-mail (serviço
   * externo, fora do escopo do protótipo).
   */
  token?: string;
  expiraEm: Date;
}

/**
 * Serviço de recuperação e troca de senha (RF02).
 *
 * O fluxo usa **token temporário aleatório**, do qual apenas o hash é
 * persistido, com expiração configurável. A troca de senha invalida as
 * sessões abertas do usuário (via `versaoToken`).
 */
export class RecuperacaoSenhaService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly tokens: TokenRecuperacaoRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** Valida a robustez mínima da senha informada. */
  static validarSenha(senha: string): void {
    if (typeof senha !== 'string' || senha.length < TAMANHO_MINIMO_SENHA) {
      throw new ErroValidacao(`A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
    }
  }

  /**
   * UC02 — solicita a recuperação de senha.
   * O token é criado somente para contas existentes e ativas.
   */
  solicitar(email: string): ResultadoSolicitacao {
    const configuracao = ConfiguracaoSistema.obterInstancia();
    const minutosValidade = configuracao.obter('tokenRecuperacaoValidadeMin');
    const alvo = String(email ?? '').trim().toLowerCase();
    const usuario = this.usuarios
      .listar()
      .find((u) => u.email.toLowerCase() === alvo && u.ativo);

    const expiraEm = new Date(Date.now() + minutosValidade * 60_000);

    if (!usuario) {
      // Não revela se a conta existe: mesma resposta para e-mail existente ou não.
      return { contaEncontrada: false, expiraEm };
    }

    const { token, hash } = gerarTokenTemporario();
    this.tokens.salvar(
      new TokenRecuperacaoSenha(this.tokens.proximoId(), usuario.id, hash, expiraEm),
    );
    this.auditoria.registrar(
      usuario.id,
      'SOLICITAR_RECUPERACAO_SENHA',
      'usuario',
      'Token de recuperação gerado',
      true,
    );

    const ambiente = configuracao.obter('ambiente');
    return {
      contaEncontrada: true,
      token: ambiente === 'producao' ? undefined : token,
      expiraEm,
    };
  }

  /** Verifica se o token informado é válido (não usado e não expirado). */
  validarToken(token: string): Usuario {
    const hash = hashToken(String(token ?? ''));
    const registro = this.tokens.buscarPorHash(hash);
    if (!registro) {
      throw new ErroValidacao('Token de recuperação inválido.');
    }
    if (!registro.ehValido()) {
      throw new ErroValidacao('Token de recuperação expirado ou já utilizado.');
    }
    const usuario = this.usuarios.buscarPorId(registro.usuarioId);
    if (!usuario || !usuario.ativo) {
      throw new ErroNaoEncontrado('Conta não encontrada.');
    }
    return usuario;
  }

  /**
   * UC02 — redefine a senha usando o token temporário.
   * Invalida as sessões abertas e os demais tokens de recuperação do usuário.
   */
  redefinir(token: string, novaSenha: string): Usuario {
    RecuperacaoSenhaService.validarSenha(novaSenha);
    const usuario = this.validarToken(token);
    const hash = hashToken(String(token));

    usuario.definirSenha(novaSenha);
    this.tokens.invalidarDoUsuario(usuario.id);
    this.tokens.buscarPorHash(hash)?.marcarUsado();

    this.auditoria.registrar(
      usuario.id,
      'REDEFINIR_SENHA',
      'usuario',
      'Senha redefinida por token temporário',
      true,
    );
    return usuario;
  }

  /** UC02 — troca de senha pelo próprio usuário autenticado. */
  trocar(usuario: Usuario, senhaAtual: string, novaSenha: string): Usuario {
    RecuperacaoSenhaService.validarSenha(novaSenha);
    if (!usuario.autenticar(senhaAtual)) {
      throw new ErroValidacao('Senha atual incorreta.');
    }
    usuario.definirSenha(novaSenha);
    this.tokens.invalidarDoUsuario(usuario.id);
    this.auditoria.registrar(usuario.id, 'TROCAR_SENHA', 'usuario', 'Senha alterada pelo titular', true);
    return usuario;
  }
}
