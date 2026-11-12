/**
 * PADRÃO DE PROJETO: ADAPTER
 * ------------------------------------------------------------------
 * Problema: o SIGLoSUS precisa conversar com sistemas de saúde legados
 * (e-SUS APS, HÓRUS/SNA, BNAFAR). Cada um expõe dados em um formato próprio,
 * incompatível com o modelo interno do SIGLoSUS.
 *
 * Solução: uma interface-alvo comum (`SistemaSaudeAdapter`) que o domínio
 * conhece; classes *Adapter* traduzem a interface/formato de cada sistema
 * externo para o formato interno (registro canônico de estoque).
 *
 * Aplicação no SIGLoSUS: caso de uso UC07 (Sincronizar com sistemas de origem)
 * e requisito RF07.
 */

/** Formato canônico interno do SIGLoSUS (interface-alvo). */
export interface RegistroEstoqueExterno {
  codigoCATMAT: string;
  cnesUnidade: string;
  quantidade: number;
  numeroLote: string;
  validade: Date;
}

/** Interface-alvo que o domínio do SIGLoSUS conhece. */
export interface SistemaSaudeAdapter {
  readonly nome: string;
  obterEstoque(): RegistroEstoqueExterno[];
  exportarEstoque(registros: RegistroEstoqueExterno[]): number;
}

/** Helper: converte datas em formatos variados para Date. */
function paraData(valor: string): Date {
  // aceita 'YYYY-MM-DD' e 'DD/MM/YYYY'
  if (valor.includes('/')) {
    const [dia, mes, ano] = valor.split('/').map(Number);
    return new Date(ano, mes - 1, dia);
  }
  return new Date(valor);
}
