import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Container } from '../../application/Container';
import { RegraNegocioError } from '../../domain/rules/RegrasNegocio';
import { criarRotas } from './routes';

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

  // Tratamento centralizado de erros.
  app.use((err: Error & { codigo?: string }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof RegraNegocioError ? 422 : 400;
    res.status(status).json({ erro: err.message, codigo: err.codigo ?? null });
  });

  return app;
}
