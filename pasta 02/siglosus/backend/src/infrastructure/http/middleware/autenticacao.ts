import { NextFunction, Request, Response } from 'express';
import { Container } from '../../../application/Container';
import { Usuario } from '../../../domain/entities';
import { PerfilUsuario } from '../../../domain/enums';
import { ErroNaoAutenticado, ErroNaoAutorizado } from '../../../domain/errors';

/**
 * Requisição com usuário autenticado.
 *
 * A identidade do usuário **nunca** vem do corpo da requisição: é obtida a
 * partir do token JWT validado, o que impede que um cliente atue em nome de
 * outro usuário (RF01, RF14, RF20).
 */
export interface RequisicaoAutenticada extends Request {
  usuario: Usuario;
  token: string;
}

/** Extrai o token Bearer do cabeçalho Authorization. */
export function extrairToken(req: Request): string | undefined {
  const cabecalho = req.headers.authorization;
  if (typeof cabecalho === 'string' && cabecalho.toLowerCase().startsWith('bearer ')) {
    const token = cabecalho.slice(7).trim();
    return token.length > 0 ? token : undefined;
  }
  return undefined;
}

/**
 * Middleware de autenticação (RNF01).
 * Exige token válido, não revogado e emitido por usuário ativo.
 */
export function autenticar(container: Container) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const token = extrairToken(req);
      if (!token) {
        throw new ErroNaoAutenticado('Token de acesso não informado.');
      }
      const { usuario } = container.autenticacao.autenticarToken(token);
      const requisicao = req as RequisicaoAutenticada;
      requisicao.usuario = usuario;
      requisicao.token = token;
      next();
    } catch (erro) {
      next(erro);
    }
  };
}

/**
 * Middleware de autorização por perfil (RNF01).
 * Devolve 403 quando o usuário autenticado não possui o perfil exigido.
 */
export function autorizar(...perfis: PerfilUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const usuario = (req as RequisicaoAutenticada).usuario;
    if (!usuario) {
      next(new ErroNaoAutenticado());
      return;
    }
    if (perfis.length > 0 && !perfis.includes(usuario.perfil)) {
      next(
        new ErroNaoAutorizado(
          `Operação restrita aos perfis: ${perfis.join(', ')}. Seu perfil: ${usuario.perfil}.`,
        ),
      );
      return;
    }
    next();
  };
}

/** Usuário autenticado da requisição (lança 401 se ausente). */
export function usuarioDaRequisicao(req: Request): Usuario {
  const usuario = (req as RequisicaoAutenticada).usuario;
  if (!usuario) throw new ErroNaoAutenticado();
  return usuario;
}
