import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Container } from '../../application/Container';
import {
  CredenciaisInvalidasError,
  UsuarioBloqueadoError,
} from '../../application/services/AutenticacaoService';
import {
  ErroConflito,
  ErroNaoAutenticado,
  ErroNaoAutorizado,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../../domain/errors';
import { RegraNegocioError } from '../../domain/rules/RegrasNegocio';
import { ConfiguracaoSistema } from '../../patterns/singleton/ConfiguracaoSistema';
import { criarRotas } from './routes';
import { cabecalhosSeguranca } from './middleware/seguranca';

/** Origens liberadas quando `CORS_ORIGINS` não é definido. */
const ORIGENS_PADRAO = ['http://localhost:3000', 'http://127.0.0.1:3000', 'null'];

/**
 * Verifica se a origem da requisição é permitida.
 *
 * Em desenvolvimento, qualquer porta do `localhost` é liberada (facilita abrir as
 * telas por um servidor estático externo, como o Live Server do VS Code). Em
 * produção, vale **apenas** a lista `CORS_ORIGINS` configurada por variável de
 * ambiente.
 */
function origemPermitida(origem: string | undefined, lista: string[], production: boolean): boolean {
  if (!origem) return true; // requisições sem origem (mesma origem, curl, testes)
  if (lista.includes(origem)) return true;
  if (!production && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem)) return true;
  return false;
}

/**
 * Traduz o erro de domínio/aplicação para o status HTTP correspondente.
 * Erros desconhecidos viram 500 sem expor detalhes internos.
 */
export function statusDoErro(err: Error & { status?: number }): number {
  if (err instanceof RegraNegocioError) return 422;
  if (err instanceof CredenciaisInvalidasError) return 401;
  if (err instanceof UsuarioBloqueadoError) return 423;
  if (err instanceof ErroNaoAutenticado) return 401;
  if (err instanceof ErroNaoAutorizado) return 403;
  if (err instanceof ErroNaoEncontrado) return 404;
  if (err instanceof ErroConflito) return 409;
  if (err instanceof ErroValidacao) return 400;
  if (typeof err.status === 'number') return err.status;
  return 500;
}

/** Erros conhecidos (tratados com mensagem de negócio) versus inesperados. */
function ehErroConhecido(err: Error): boolean {
  return (
    err instanceof RegraNegocioError ||
    err instanceof CredenciaisInvalidasError ||
    err instanceof UsuarioBloqueadoError ||
    err instanceof ErroNaoAutenticado ||
    err instanceof ErroNaoAutorizado ||
    err instanceof ErroNaoEncontrado ||
    err instanceof ErroConflito ||
    err instanceof ErroValidacao
  );
}

/**
 * Cria a aplicação Express com as rotas da API e o serviço de arquivos estáticos
 * do front-end (protótipos das telas).
 */
export function criarApp(container: Container): Express {
  const app = express();
  const configuracao = ConfiguracaoSistema.obterInstancia();
  const origens = configuracao.obter('origensCors');
  const emProducao = configuracao.obter('ambiente') === 'production';
  // Produção sem CORS_ORIGINS configurado não libera nenhuma origem cross-site.
  const origensPermitidas = origens.length > 0 ? origens : (emProducao ? [] : ORIGENS_PADRAO);

  app.disable('x-powered-by');
  app.use(cabecalhosSeguranca);
  app.use(
    cors({
      origin: (origem, callback) => {
        callback(null, origemPermitida(origem, origensPermitidas, emProducao));
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '256kb' }));

  // Persistência: grava o estado após cada operação de escrita bem-sucedida,
  // para que os dados não se percam quando o processo é reiniciado.
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (req.method !== 'GET' && res.statusCode < 400) {
        try {
          container.persistir();
        } catch (erro) {
          // Falha de persistência não deve derrubar a resposta da API.
          // eslint-disable-next-line no-console
          console.error('[persistencia] falha ao gravar o estado:', (erro as Error).message);
        }
      }
    });
    next();
  });

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
    const status = statusDoErro(err);
    const mensagem =
      status === 500 && !ehErroConhecido(err)
        ? 'Erro interno no servidor. Tente novamente ou contate o suporte.'
        : err.message;
    if (status === 500) {
      // eslint-disable-next-line no-console
      console.error('[erro]', err);
    }
    res.status(status).json({ erro: mensagem, codigo: err.codigo ?? null });
  });

  return app;
}
