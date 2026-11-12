import { RegistroEstoqueExterno, SistemaSaudeAdapter } from './SistemaSaudeAdapter';

/**
 * Cliente "legado" do BNAFAR (Adaptee).
 * Retorna registros "achatados" com nomes totalmente distintos.
 */
export class BnafarClient {
  listar(): Array<{ medicamento_codigo: string; unidade_codigo: string; qtd: number; batch: string; exp: string }> {
    return [
      { medicamento_codigo: 'BR123456', unidade_codigo: '1112223', qtd: 15, batch: 'BN-01', exp: '2026-11-30' },
      { medicamento_codigo: 'BR555444', unidade_codigo: '1112223', qtd: 60, batch: 'BN-02', exp: '2028-01-10' },
    ];
  }

  sincronizar(_dados: unknown): void {
    /* envio para a API do BNAFAR (simulado) */
  }
}

/** Adapter: BNAFAR -> modelo interno do SIGLoSUS. */
export class BnafarAdapter implements SistemaSaudeAdapter {
  readonly nome = 'BNAFAR';
  private cliente = new BnafarClient();

  obterEstoque(): RegistroEstoqueExterno[] {
    return this.cliente.listar().map((r) => ({
      codigoCATMAT: r.medicamento_codigo,
      cnesUnidade: r.unidade_codigo,
      quantidade: r.qtd,
      numeroLote: r.batch,
      validade: new Date(r.exp),
    }));
  }

  exportarEstoque(registros: RegistroEstoqueExterno[]): number {
    this.cliente.sincronizar(
      registros.map((r) => ({
        medicamento_codigo: r.codigoCATMAT,
        unidade_codigo: r.cnesUnidade,
        qtd: r.quantidade,
        batch: r.numeroLote,
        exp: r.validade.toISOString().slice(0, 10),
      })),
    );
    return registros.length;
  }
}
