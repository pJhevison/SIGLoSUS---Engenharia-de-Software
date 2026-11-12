import { RegistroEstoqueExterno, SistemaSaudeAdapter } from './SistemaSaudeAdapter';

/**
 * Cliente "legado" do e-SUS APS (Adaptee).
 * Retorna os dados com nomes abreviados e validade em formato brasileiro.
 */
export class ESUSAPSClient {
  obterPosicaoEstoque(): Array<{
    co_catmat: string;
    co_cnes: string;
    qt_estoque: number;
    nu_lote: string;
    dt_validade: string;
  }> {
    return [
      { co_catmat: 'BR123456', co_cnes: '1234567', qt_estoque: 120, nu_lote: 'L2026A', dt_validade: '15/03/2027' },
      { co_catmat: 'BR654321', co_cnes: '1234567', qt_estoque: 30, nu_lote: 'L2026B', dt_validade: '02/01/2027' },
    ];
  }

  enviarEstoque(_payload: unknown): void {
    /* envio para a API do e-SUS APS (simulado) */
  }
}

/** Adapter: e-SUS APS -> modelo interno do SIGLoSUS. */
export class ESUSAPSAdapter implements SistemaSaudeAdapter {
  readonly nome = 'e-SUS APS';
  private cliente = new ESUSAPSClient();

  obterEstoque(): RegistroEstoqueExterno[] {
    return this.cliente.obterPosicaoEstoque().map((r) => ({
      codigoCATMAT: r.co_catmat,
      cnesUnidade: r.co_cnes,
      quantidade: r.qt_estoque,
      numeroLote: r.nu_lote,
      validade: this.converterData(r.dt_validade),
    }));
  }

  exportarEstoque(registros: RegistroEstoqueExterno[]): number {
    this.cliente.enviarEstoque(
      registros.map((r) => ({
        co_catmat: r.codigoCATMAT,
        co_cnes: r.cnesUnidade,
        qt_estoque: r.quantidade,
        nu_lote: r.numeroLote,
        dt_validade: r.validade.toLocaleDateString('pt-BR'),
      })),
    );
    return registros.length;
  }

  private converterData(valor: string): Date {
    const [dia, mes, ano] = valor.split('/').map(Number);
    return new Date(ano, mes - 1, dia);
  }
}
