import { Container } from './application/Container';
import { criarApp } from './infrastructure/http/App';
import { ConfiguracaoSistema } from './patterns/singleton/ConfiguracaoSistema';

/**
 * Ponto de entrada do backend do SIGLoSUS.
 *
 * A configuração é obtida via Singleton (ConfiguracaoSistema) e o grafo de
 * objetos é montado pelo Container (injeção de dependências).
 *
 * Persistência: quando `SIGLOSUS_ARQUIVO_PERSISTENCIA` está definido, o
 * estado é carregado do arquivo e gravado após cada escrita — os dados
 * sobrevivem ao reinício do processo.
 */
const config = ConfiguracaoSistema.obterInstancia();
const container = new Container({
  arquivoPersistencia: config.obter('arquivoPersistencia'),
});
const app = criarApp(container);

const porta = config.obter('porta');

const servidor = app.listen(porta, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  SIGLoSUS API v${config.obter('versao')}`);
  // eslint-disable-next-line no-console
  console.log(`  Ambiente: ${config.obter('ambiente')}`);
  // eslint-disable-next-line no-console
  console.log(`  API:      http://localhost:${porta}/api`);
  // eslint-disable-next-line no-console
  console.log(`  Telas:    http://localhost:${porta}/`);
  // eslint-disable-next-line no-console
  console.log(
    `  Persistência: ${container.persistencia ? container.persistencia.arquivo : 'somente em memória'}\n`,
  );
});

/** Encerramento gracioso: grava o estado antes de sair. */
function encerrar(sinal: string): void {
  // eslint-disable-next-line no-console
  console.log(`\nEncerrando (${sinal})...`);
  try {
    container.persistir();
  } catch (erro) {
    // eslint-disable-next-line no-console
    console.error('[persistencia] falha ao gravar o estado:', (erro as Error).message);
  }
  servidor.close(() => process.exit(0));
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));
