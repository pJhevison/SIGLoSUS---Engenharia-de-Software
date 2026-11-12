import { RegistroEstoqueExterno, SistemaSaudeAdapter } from './SistemaSaudeAdapter';

/**
 * Cliente "legado" do HÓRUS/SNA (Adaptee).
 * Retorna um envelope com `items` e campos em camelCase diferente.
 */
export class HorusClient {
  buscarSaldo(): { items: Array<{ catmat: string; cnes: string; saldo: number; lote: string; vencimento: string }> } {
    return {
      items: [
        { catmat: 'BR123456', cnes: '7654321', saldo: 8, lote: 'H-77', vencimento: '2026-12-20' },
        { catmat: 'BR999888', cnes: '7654321', saldo: 200, lote: 'H-78', vencimento: '2027-06-30' },
      ],
    };
  }

  postSaldo(_body: unknown): void {
    /* envio para a API do HÓRUS (simulado) */
  }
}

/** Adapter: HÓRUS/SNA -> modelo interno do SIGLoSUS. */
export class HorusAdapter implements SistemaSaudeAdapter {
  readonly nome = 'HÓRUS/SNA';
  private cliente = new HorusClient();

  obterEstoque(): RegistroEstoqueExterno[] {
    return this.cliente.buscarSaldo().items.map((i) => ({
      codigoCATMAT: i.catmat,
      cnesUnidade: i.cnes,
      quantidade: i.saldo,
      numeroLote: i.lote,
      validade: new Date(i.vencimento),
    }));
  }

  exportarEstoque(registros: RegistroEstoqueExterno[]): number {
    this.cliente.postSaldo({
      items: registros.map((r) => ({
        catmat: r.codigoCATMAT,
        cnes: r.cnesUnidade,
        saldo: r.quantidade,
        lote: r.numeroLote,
        vencimento: r.validade.toISOString().slice(0, 10),
      })),
    });
    return registros.length;
  }
}
