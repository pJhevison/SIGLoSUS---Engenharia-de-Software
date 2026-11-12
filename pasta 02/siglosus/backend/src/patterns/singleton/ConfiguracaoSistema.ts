import * as crypto from 'crypto';
import 'dotenv/config';

/**
 * PADRÃO DE PROJETO: SINGLETON
 * ------------------------------------------------------------------
 * Problema: diversos pontos do sistema precisam ler os mesmos parâmetros
 * de configuração (limites de negócio, porta, ambiente, segredo de token).
 * Criar múltiplas instâncias gera inconsistência e desperdício.
 *
 * Solução: garantir uma ÚNICA instância de configuração para toda a aplicação,
 * com um ponto de acesso global (`obterInstancia()`).
 *
 * Aplicação no SIGLoSUS: parâmetros usados por várias camadas — o limite de
 * aprovação do gestor (RN09), a validade mínima para transferência (RN03), a
 * jornada máxima do motorista (RN07), o segredo de assinatura dos tokens
 * (RF01) e as origens permitidas no CORS (RNF01).
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
  /** Segredo usado para assinar os tokens JWT (variável de ambiente). */
  segredoJwt: string;
  /** Validade do token de acesso, em minutos. */
  tokenAcessoValidadeMin: number;
  /** Validade do token temporário de recuperação de senha, em minutos. */
  tokenRecuperacaoValidadeMin: number;
  /** Origens permitidas no CORS (lista separada por vírgula). */
  origensCors: string[];
  /** Caminho do arquivo de persistência (null = somente em memória). */
  arquivoPersistencia: string | null;
  /** Número máximo de tentativas de login por minuto e por endereço IP. */
  limiteLoginPorMinuto: number;
}

export class ConfiguracaoSistema {
  private static instancia: ConfiguracaoSistema | null = null;
  private parametros: ParametrosSistema;

  private constructor() {
    const ambiente = process.env.NODE_ENV ?? 'development';
    const segredoJwt = this.obterSegredoJwt(ambiente);
    const origens = (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    this.parametros = {
      ambiente,
      porta: Number(process.env.PORT ?? 3000),
      limiteAprovacaoGestor: Number(process.env.LIMITE_APROVACAO_GESTOR ?? 5000),
      validadeMinimaTransferenciaDias: Number(process.env.VALIDADE_MINIMA_TRANSFERENCIA_DIAS ?? 90),
      jornadaMaximaMin: Number(process.env.JORNADA_MAXIMA_MIN ?? 480),
      intervaloMaximoConsultaMs: Number(process.env.INTERVALO_MAXIMO_CONSULTA_MS ?? 2000),
      sincronizacaoAutomaticaMin: Number(process.env.SINCRONIZACAO_AUTOMATICA_MIN ?? 15),
      versao: '2.1.0',
      segredoJwt,
      tokenAcessoValidadeMin: Number(process.env.TOKEN_ACESSO_VALIDADE_MIN ?? 60),
      tokenRecuperacaoValidadeMin: Number(process.env.TOKEN_RECUPERACAO_VALIDADE_MIN ?? 30),
      origensCors: origens,
      arquivoPersistencia: process.env.SIGLOSUS_ARQUIVO_PERSISTENCIA ?? null,
      limiteLoginPorMinuto: Number(process.env.LIMITE_LOGIN_POR_MINUTO ?? 10),
    };
  }

  /**
   * Segredo de assinatura dos tokens.
   *
   * Em produção o segredo é **obrigatório** e vem de `JWT_SECRET`. Em
   * desenvolvimento, se ausente, um segredo aleatório é gerado no arranque
   * (as sessões não sobrevivem ao reinício — comportamento esperado fora de
   * produção). O segredo nunca é gravado em disco nem versionado.
   */
  private obterSegredoJwt(ambiente: string): string {
    const doAmbiente = process.env.JWT_SECRET;
    if (doAmbiente && doAmbiente.trim().length >= 32) {
      return doAmbiente;
    }
    if (ambiente === 'production') {
      throw new Error(
        'JWT_SECRET ausente ou muito curto. Defina a variável de ambiente com ao menos 32 caracteres antes de iniciar em produção.',
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      '[config] JWT_SECRET não definido: segredo aleatório gerado para esta execução de desenvolvimento.',
    );
    return crypto.randomBytes(48).toString('hex');
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
