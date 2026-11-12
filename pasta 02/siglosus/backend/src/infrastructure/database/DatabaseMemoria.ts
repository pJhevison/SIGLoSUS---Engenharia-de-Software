import {
  AlertaDesabastecimento,
  Dispensacao,
  Entrega,
  Estoque,
  IntegracaoExterna,
  LogAuditoria,
  Medicamento,
  MovimentacaoEstoque,
  PrevisaoDemanda,
  Relatorio,
  Requisicao,
  Rota,
  Transferencia,
  UnidadeSaude,
  Usuario,
  Veiculo,
} from '../../domain/entities';

/**
 * Banco de dados em memória (para demonstração e testes).
 *
 * Em produção, esta camada seria substituída por um SGBD (PostgreSQL) por trás
 * das MESMAS interfaces de repositório — o domínio não muda. Aqui usamos memória
 * para que o projeto rode sem infraestrutura externa.
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

  private contadores = new Map<string, number>();

  /** Gera o próximo identificador de uma coleção (simula uma SEQUENCE). */
  proximoId(colecao: string): number {
    const atual = this.contadores.get(colecao) ?? 0;
    const novo = atual + 1;
    this.contadores.set(colecao, novo);
    return novo;
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
    this.contadores.clear();
  }
}
