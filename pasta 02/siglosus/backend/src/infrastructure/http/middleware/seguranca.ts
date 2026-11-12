import { NextFunction, Request, Response } from 'express';
import { ErroLimiteExcedido } from '../../../domain/errors';

export interface OpcoesLimite {
  /** Número máximo de requisições dentro da janela. */
  maximo: number;
  /** Tamanho da janela, em milissegundos. */
  janelaMs: number;
  /** Mensagem devolvida quando o limite é excedido. */
  mensagem?: string;
}

/**
 * Limitação de requisições (RNF01 — proteção contra força bruta).
 *
 * Implementação em memória, por endereço IP, adequate ao protótipo. Em um
 * ambiente distribuído, o contador deve ser substituído por armazenamento
 * compartilhado (Redis, por exemplo).
 */
export function limiteRequisicoes(opcoes: OpcoesLimite) {
  const acessos = new Map<string, number[]>();
  const mensagem = opcoes.mensagem ?? 'Muitas requisições. Aguarde alguns instantes e tente novamente.';

  return (req: Request, _res: Response, next: NextFunction): void => {
    const agora = Date.now();
    const chave = req.ip ?? req.socket.remoteAddress ?? 'desconhecido';
    const registros = (acessos.get(chave) ?? []).filter((momento) => agora - momento < opcoes.janelaMs);

    if (registros.length >= opcoes.maximo) {
      acessos.set(chave, registros);
      next(new ErroLimiteExcedido(mensagem));
      return;
    }

    registros.push(agora);
    acessos.set(chave, registros);
    next();
  };
}

/**
 * Cabeçalhos de segurança aplicados às respostas (RNF01).
 */
export function cabecalhosSeguranca(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'");
  res.removeHeader('X-Powered-By');
  next();
}
