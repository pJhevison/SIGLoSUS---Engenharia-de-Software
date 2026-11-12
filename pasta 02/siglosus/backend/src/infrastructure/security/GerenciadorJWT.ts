import * as crypto from 'crypto';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ErroNaoAutenticado } from '../../domain/errors';
import { PerfilUsuario } from '../../domain/enums';

/**
 * Emissão e validação de tokens JWT (RF01, RF03).
 *
 * O token é assinado com HMAC-SHA256 usando um segredo definido por variável
 * de ambiente (`JWT_SECRET`). A assinatura garante a integridade: um token
 * adulterado (perfil ou id alterados) falha na validação. O campo `exp`
 * define a validade, e o `jti` permite revogação individual (logout).
 */

export interface ConteudoToken {
  usuarioId: number;
  perfil: PerfilUsuario;
  nome: string;
  email: string;
  jti: string;
  versaoToken: number;
  exp: number;
  iat: number;
}

export interface OpcoesGerenciadorJWT {
  segredo: string;
  expiraEmMinutos: number;
  emissor: string;
}

export class GerenciadorJWT {
  private readonly segredo: string;
  private readonly expiraEmMinutos: number;
  private readonly emissor: string;

  constructor(opcoes: OpcoesGerenciadorJWT) {
    this.segredo = opcoes.segredo;
    this.expiraEmMinutos = opcoes.expiraEmMinutos;
    this.emissor = opcoes.emissor;
  }

  /** Gera um token assinado para o usuário informado. */
  emitir(usuario: {
    id: number;
    perfil: PerfilUsuario;
    nome: string;
    email: string;
    versaoToken: number;
  }): string {
    const jti = crypto.randomUUID();
    return jwt.sign(
      {
        sub: String(usuario.id),
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ver: usuario.versaoToken,
      },
      this.segredo,
      {
        algorithm: 'HS256',
        expiresIn: `${this.expiraEmMinutos}m`,
        issuer: this.emissor,
        jwtid: jti,
      },
    );
  }

  /**
   * Valida o token e devolve seu conteúdo.
   * Lança `ErroNaoAutenticado` (HTTP 401) para token ausente, inválido,
   * expirado ou adulterado.
   */
  validar(token: string): ConteudoToken {
    if (!token || token.trim().length === 0) {
      throw new ErroNaoAutenticado('Token de acesso não informado.');
    }
    try {
      const payload = jwt.verify(token, this.segredo, {
        algorithms: ['HS256'],
        issuer: this.emissor,
      }) as jwt.JwtPayload & { perfil?: PerfilUsuario };

      if (!payload.sub || !payload.perfil || !payload.jti) {
        throw new ErroNaoAutenticado('Token de acesso incompleto.');
      }

      return {
        usuarioId: Number(payload.sub),
        perfil: payload.perfil,
        nome: String(payload.nome ?? ''),
        email: String(payload.email ?? ''),
        jti: String(payload.jti),
        versaoToken: Number(payload.ver ?? 1),
        exp: Number(payload.exp ?? 0),
        iat: Number(payload.iat ?? 0),
      };
    } catch (erro) {
      if (erro instanceof ErroNaoAutenticado) throw erro;
      if (erro instanceof TokenExpiredError) {
        throw new ErroNaoAutenticado('Sessão expirada. Autentique-se novamente.');
      }
      if (erro instanceof JsonWebTokenError) {
        throw new ErroNaoAutenticado('Token de acesso inválido.');
      }
      throw new ErroNaoAutenticado('Não foi possível validar a sessão.');
    }
  }

  /** Identificador único do token (usado na revogação). */
  identificador(token: string): string {
    return this.validar(token).jti;
  }
}
