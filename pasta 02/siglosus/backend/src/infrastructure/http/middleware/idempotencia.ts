import * as crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { Container } from '../../../application/Container';
import { ResultadoIdempotencia } from '../../../domain/entities';
import { ErroConflito, ErroNaoAutenticado, ErroValidacao } from '../../../domain/errors';
import { RequisicaoAutenticada } from './autenticacao';

/**
 * Idempotência somente em rotas PRIVADAS, APÓS autenticação e autorização.
 * Uma chave é exclusiva do usuário e do conteúdo da operação, por 24h.
 * O cache nunca substitui a validação de permissões e não é aplicado às rotas públicas.
 */
export function idempotencia(container: Container) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      next();
      return;
    }

    const chave = req.headers['idempotency-key'];
    if (chave === undefined) {
      next();
      return;
    }
    if (typeof chave !== 'string' || !/^[\w.:-]{8,128}$/.test(chave)) {
      next(new ErroValidacao('Idempotency-Key deve conter entre 8 e 128 caracteres válidos.'));
      return;
    }
    const usuarioId = (req as RequisicaoAutenticada).usuario?.id;
    if (!usuarioId) {
      next(new ErroNaoAutenticado());
      return;
    }

    // Canonicalização simples: o corpo JSON recebido pelo Express; a mesma requisição
    // reenviada pelo cliente produz o mesmo conteúdo mesmo após a reconexão.
    const hashRequisicao = crypto.createHash('sha256')
      .update(JSON.stringify([req.method, req.originalUrl, req.body ?? null]))
      .digest('hex');

    // Não confie em registros legados que não identificam o autor da operação.
    if (container.idempotencia.existeChaveLegada(chave)) {
      next(new ErroConflito('Chave idempotente de versão antiga: gere uma nova chave.'));
      return;
    }
    const existente = container.idempotencia.buscarPorChave(chave, usuarioId);
    if (existente) {
      if (existente.hashRequisicao !== hashRequisicao ||
          existente.metodo !== req.method || existente.caminho !== req.originalUrl) {
        next(new ErroConflito('A chave de idempotência já foi utilizada em outra operação.'));
        return;
      }
      res.status(existente.status).json(existente.corpo);
      return;
    }

    const jsonOriginal = res.json.bind(res);
    res.json = (corpo: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        container.idempotencia.salvar(new ResultadoIdempotencia(
          container.idempotencia.proximoId(),
          chave,
          req.method,
          req.originalUrl,
          res.statusCode,
          corpo,
          new Date(),
          usuarioId,
          hashRequisicao,
        ));
      }
      return jsonOriginal(corpo);
    };
    next();
  };
}
