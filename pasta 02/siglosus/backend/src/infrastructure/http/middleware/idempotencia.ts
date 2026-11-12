import { NextFunction, Request, Response } from 'express';
import { Container } from '../../../application/Container';
import { ResultadoIdempotencia } from '../../../domain/entities';

/**
 * Idempotência de operações de escrita (RNF09).
 *
 * Quando o cliente envia o cabeçalho `Idempotency-Key`, a operação é
 * executada apenas uma vez: o resultado é armazenado e reutilizado em
 * reenvios (inclusive após reconexão do cliente offline). Resultados de
 * erro (status >= 400) não são armazenados, para que a operação possa ser
 * refeita.
 */
export function idempotencia(container: Container) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }

    const chave = req.headers['idempotency-key'];
    if (typeof chave !== 'string' || chave.trim().length === 0) {
      next();
      return;
    }

    const existente = container.idempotencia.buscarPorChave(chave);
    if (existente) {
      res.status(existente.status).json(existente.corpo);
      return;
    }

    const jsonOriginal = res.json.bind(res);
    res.json = (corpo: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          container.idempotencia.salvar(
            new ResultadoIdempotencia(
              container.idempotencia.proximoId(),
              chave,
              req.method,
              req.path,
              res.statusCode,
              corpo,
            ),
          );
        } catch {
          // A falha de persistência não deve quebrar a resposta da API.
        }
      }
      return jsonOriginal(corpo);
    };

    next();
  };
}
