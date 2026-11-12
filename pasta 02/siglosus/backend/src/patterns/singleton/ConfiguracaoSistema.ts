/**
 * PADRÃO DE PROJETO: SINGLETON
 * ------------------------------------------------------------------
 * Problema: diversos pontos do sistema precisam ler os mesmos parâmetros
 * de configuração (limites de negócio, porta, ambiente). Criar múltiplas
 * instâncias gera inconsistência e desperdício.
 *
 * Solução: garantir uma ÚNICA instância de configuração para toda a aplicação,
 * com um ponto de acesso global (`obterInstancia()`).
 *
 * Aplicação no SIGLoSUS: parâmetros usados por várias camadas — o limite de
 * aprovação do gestor (RN09), a validade mínima para transferência (RN03), a
 * jornada máxima do motorista (RN07), entre outros.
 */
export interface ParametrosSistema {
  ambiente: string;
  porta: number;
  limiteAprovacaoGestor: number;
  validadeMinimaTransferenciaDias: number;
  jornadaMaximaMin: number;
  intervaloMaximoConsultaMs: number;
  sincronizacaoAutomaticaMin: number;
  versao: string;
}

export class ConfiguracaoSistema {
  private static instancia: ConfiguracaoSistema | null = null;
  private parametros: ParametrosSistema;

  private constructor() {
    this.parametros = {
      ambiente: process.env.NODE_ENV ?? 'development',
      porta: Number(process.env.PORT ?? 3000),
      limiteAprovacaoGestor: Number(process.env.LIMITE_APROVACAO_GESTOR ?? 5000),
      validadeMinimaTransferenciaDias: 90,
      jornadaMaximaMin: 480,
      intervaloMaximoConsultaMs: 2000,
      sincronizacaoAutomaticaMin: 15,
      versao: '2.0.0',
    };
  }

  /** Ponto de acesso global — sempre devolve a mesma instância. */
  static obterInstancia(): ConfiguracaoSistema {
    if (ConfiguracaoSistema.instancia === null) {
      ConfiguracaoSistema.instancia = new ConfiguracaoSistema();
    }
    return ConfiguracaoSistema.instancia;
  }

  obter<K extends keyof ParametrosSistema>(chave: K): ParametrosSistema[K] {
    return this.parametros[chave];
  }

  definir<K extends keyof ParametrosSistema>(chave: K, valor: ParametrosSistema[K]): void {
    this.parametros[chave] = valor;
  }

  todos(): Readonly<ParametrosSistema> {
    return { ...this.parametros };
  }

  /** Apenas para testes: descarta a instância corrente. */
  static reiniciar(): void {
    ConfiguracaoSistema.instancia = null;
  }
}
