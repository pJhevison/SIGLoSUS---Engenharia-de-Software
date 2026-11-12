import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Container } from '../../application/Container';
import {
  CredenciaisInvalidasError,
  UsuarioBloqueadoError,
} from '../../application/services/AutenticacaoService';
import { RegraNegocioError } from '../../domain/rules/RegrasNegocio';
import { criarRotas } from './routes';

/** Traduz o erro de domínio/aplicação para o status HTTP correspondente. */
function statusDoErro(err: Error & { status?: number }): number {
  if (err instanceof RegraNegocioError) return 422;
  if (err instanceof CredenciaisInvalidasError) return 401;
  if (err instanceof UsuarioBloqueadoError) return 423;
  if (typeof err.status === 'number') return err.status;
  return 400;
}

/**
 * Cria a aplicação Express com as rotas da API e o serviço de arquivos estáticos
 * do front-end (protótipos das telas).
 */
export function criarApp(container: Container): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api', criarRotas(container));

  // Front-end (telas) servido pela própria API, quando presente.
  const frontendDir = path.resolve(__dirname, '../../../../frontend');
  if (fs.existsSync(frontendDir)) {
    app.use(express.static(frontendDir));
  }

  // Recurso de API não mapeado.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ erro: 'Recurso da API não encontrado.', codigo: null });
  });

  // Tratamento centralizado de erros.
  app.use((err: Error & { codigo?: string; status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(statusDoErro(err)).json({ erro: err.message, codigo: err.codigo ?? null });
  });

  return app;
}
