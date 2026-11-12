import {
  AlertaDesabastecimento,
  Dispensacao,
  Entrega,
  Estoque,
  IntegracaoExterna,
  LogAuditoria,
  Medicamento,
  MovimentacaoEstoque,
  PosicaoRota,
  PrevisaoDemanda,
  Relatorio,
  Requisicao,
  Rota,
  TokenRecuperacaoSenha,
  Transferencia,
  UnidadeSaude,
  Usuario,
  Veiculo,
} from '../../domain/entities';

/**
 * Banco de dados em memória (camada de infraestrutura).
 *
 * As mesmas interfaces de repositório atendem a esta implementação e a um
 * SGBD relacional: o domínio não muda. Para que os dados sobrevivam ao
 * reinício do processo no protótipo, a classe {@link PersistenciaJSON}
 * grava e restaura o estado em arquivo — a transparência é total entre o
 * repositório e o arquivo, sem SQL (portanto, sem risco de injeção de SQL).
 */
export class DatabaseMemoria {
  usuarios: Usuario[] = [];
  unidades: UnidadeSaude[] = [];
  medicamentos: Medicamento[] = [];
  estoques: Estoque[] = [];
  movimentacoes: MovimentacaoEstoque[] = [];
  alertas: AlertaDesabastecimento[] = [];
  previsoes: PrevisaoDemanda[] = [];
  transferencias: Transferencia[] = [];
  requisicoes: Requisicao[] = [];
  rotas: Rota[] = [];
  veiculos: Veiculo[] = [];
  entregas: Entrega[] = [];
  integracoes: IntegracaoExterna[] = [];
  dispensacoes: Dispensacao[] = [];
  relatorios: Relatorio[] = [];
  auditoria: LogAuditoria[] = [];
  tokensRecuperacao: TokenRecuperacaoSenha[] = [];
  posicoes: PosicaoRota[] = [];

  private contadores = new Map<string, number>();

  /** Gera o próximo identificador de uma coleção (simula uma SEQUENCE). */
  proximoId(colecao: string): number {
    const atual = this.contadores.get(colecao) ?? 0;
    const novo = atual + 1;
    this.contadores.set(colecao, novo);
    return novo;
  }

  /** Snapshot dos contadores de identidade (usado na persistência). */
  exportarContadores(): Record<string, number> {
    return Object.fromEntries(this.contadores);
  }

  /** Restaura os contadores de identidade a partir de um snapshot. */
  importarContadores(contadores: Record<string, number>): void {
    this.contadores = new Map(Object.entries(contadores ?? {}));
  }

  /** Todas as coleções do banco (base para a persistência). */
  colecoes(): Record<string, unknown[]> {
    return {
      usuarios: this.usuarios,
      unidades: this.unidades,
      medicamentos: this.medicamentos,
      estoques: this.estoques,
      movimentacoes: this.movimentacoes,
      alertas: this.alertas,
      previsoes: this.previsoes,
      transferencias: this.transferencias,
      requisicoes: this.requisicoes,
      rotas: this.rotas,
      veiculos: this.veiculos,
      entregas: this.entregas,
      integracoes: this.integracoes,
      dispensacoes: this.dispensacoes,
      relatorios: this.relatorios,
      auditoria: this.auditoria,
      tokensRecuperacao: this.tokensRecuperacao,
      posicoes: this.posicoes,
    };
  }

  limpar(): void {
    this.usuarios = [];
    this.unidades = [];
    this.medicamentos = [];
    this.estoques = [];
    this.movimentacoes = [];
    this.alertas = [];
    this.previsoes = [];
    this.transferencias = [];
    this.requisicoes = [];
    this.rotas = [];
    this.veiculos = [];
    this.entregas = [];
    this.integracoes = [];
    this.dispensacoes = [];
    this.relatorios = [];
    this.auditoria = [];
    this.tokensRecuperacao = [];
    this.posicoes = [];
    this.contadores.clear();
  }
}
