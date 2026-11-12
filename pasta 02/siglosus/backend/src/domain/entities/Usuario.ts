import * as crypto from 'crypto';
import { PerfilUsuario } from '../enums';

/**
 * Usuário do sistema. (RF01, RF02, RF03, RF04)
 *
 * A senha nunca é armazenada em texto puro: guarda-se o hash SHA-256 (RNF01).
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
  ) {}

  /** Gera o hash da senha (RNF01 — dados sensíveis não ficam em texto puro). */
  static hashSenha(senha: string): string {
    return crypto.createHash('sha256').update(senha).digest('hex');
  }

  /**
   * Autentica o usuário (UC01).
   * Bloqueia temporariamente após 5 tentativas incorretas.
   */
  autenticar(senha: string): boolean {
    if (!this.ativo || this.estaBloqueado()) {
      return false;
    }
    const confere = this.senhaHash === Usuario.hashSenha(senha);
    this.tentativasFalhas = confere ? 0 : this.tentativasFalhas + 1;
    return confere;
  }

  estaBloqueado(): boolean {
    return this.tentativasFalhas >= 5;
  }

  inativar(): void {
    this.ativo = false;
  }
}
