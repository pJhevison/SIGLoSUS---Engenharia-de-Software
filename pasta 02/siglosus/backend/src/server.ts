import { Container } from './application/Container';
import { criarApp } from './infrastructure/http/App';
import { ConfiguracaoSistema } from './patterns/singleton/ConfiguracaoSistema';

/**
 * Ponto de entrada do backend do SIGLoSUS.
 *
 * A configuração é obtida via Singleton (ConfiguracaoSistema).
 */
const config = ConfiguracaoSistema.obterInstancia();
const container = new Container();
const app = criarApp(container);

const porta = config.obter('porta');

app.listen(porta, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  SIGLoSUS API v${config.obter('versao')}`);
  // eslint-disable-next-line no-console
  console.log(`  Ambiente: ${config.obter('ambiente')}`);
  // eslint-disable-next-line no-console
  console.log(`  API:      http://localhost:${porta}/api`);
  // eslint-disable-next-line no-console
  console.log(`  Telas:    http://localhost:${porta}/\n`);
});
