import { PerfilUsuario } from '../enums';
import { ehHashLegado, gerarHashSenha, verificarSenha } from '../security/Senha';

/**
 * Usuário do sistema. (RF01, RF02, RF03, RF04)
 *
 * A senha nunca é armazenada em texto puro: guarda-se o hash **bcrypt** com
 * salt individual (RNF01). Hashes legados em SHA-256 são aceitos apenas para
 * leitura e migrados para bcrypt no primeiro login bem-sucedido.
 */
export class Usuario {
  constructor(
    public readonly id: number,
    public nome: string,
    public cpf: string,
    public email: string,
    public senhaHash: string,
    public perfil: PerfilUsuario,
    public ativo: boolean = true,
    public tentativasFalhas: number = 0,
    /**
     * Versão do credencial do usuário. É incrementada a cada troca de senha e
     * embarcada no JWT; tokens emitidos com versão anterior deixam de ser
     * aceitos (invalidação em massa após recuperação de senha).
     */
    public versaoToken: number = 1,
  ) {}

  /** Gera o hash bcrypt da senha (RNF01 — dados sensíveis nunca em texto puro). */
  static hashSenha(senha: string): string {
    return gerarHashSenha(senha);
  }

  /** Verifica a senha informada contra o hash armazenado. */
  verificarSenha(senha: string): boolean {
    return verificarSenha(senha, this.senhaHash);
  }

  /** Indica se a senha ainda está no formato legado (SHA-256). */
  senhaLegada(): boolean {
    return ehHashLegado(this.senhaHash);
  }

  /** Substitui a senha por uma nova, sempre em bcrypt. */
  definirSenha(senha: string): void {
    this.senhaHash = gerarHashSenha(senha);
    this.tentativasFalhas = 0;
    this.versaoToken += 1;
  }

  /**
   * Autentica o usuário (UC01).
   * Bloqueia temporariamente após 5 tentativas incorretas.
   */
  autenticar(senha: string): boolean {
    if (!this.ativo || this.estaBloqueado()) {
      return false;
    }
    const confere = this.verificarSenha(senha);
    this.tentativasFalhas = confere ? 0 : this.tentativasFalhas + 1;
    return confere;
  }

  estaBloqueado(): boolean {
    return this.tentativasFalhas >= 5;
  }

  inativar(): void {
    this.ativo = false;
  }

  ativar(): void {
    this.ativo = true;
    this.tentativasFalhas = 0;
  }

  /** Perfis com poder de gestão sobre contas e cadastros. */
  podeGerenciarUsuarios(): boolean {
    return this.perfil === PerfilUsuario.ADMINISTRADOR || this.perfil === PerfilUsuario.GESTOR;
  }
}
