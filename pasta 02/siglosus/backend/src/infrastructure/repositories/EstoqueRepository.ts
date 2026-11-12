import {
  AlertaDesabastecimento,
  Dispensacao,
  Estoque,
  MovimentacaoEstoque,
  PrevisaoDemanda,
} from '../../domain/entities';
import { DatabaseMemoria } from '../database/DatabaseMemoria';
import { RepositorioBase } from './RepositorioBase';

export class EstoqueRepository extends RepositorioBase<Estoque> {
  constructor(db: DatabaseMemoria) {
    super(db, 'estoques', () => db.estoques);
  }

  buscarPorUnidadeEMedicamento(unidadeId: number, medicamentoId: number): Estoque | undefined {
    return this.listar().find(
      (e) => e.unidadeId === unidadeId && e.medicamentoId === medicamentoId,
    );
  }

  listarPorUnidade(unidadeId: number): Estoque[] {
    return this.listar().filter((e) => e.unidadeId === unidadeId);
  }

  listarAbaixoDoMinimo(): Estoque[] {
    return this.listar().filter((e) => e.abaixoDoMinimo());
  }
}

export class MovimentacaoRepository extends RepositorioBase<MovimentacaoEstoque> {
  constructor(db: DatabaseMemoria) {
    super(db, 'movimentacoes', () => db.movimentacoes);
  }
  listarPorEstoque(estoqueId: number): MovimentacaoEstoque[] {
    return this.listar().filter((m) => m.estoqueId === estoqueId);
  }
}

export class AlertaRepository extends RepositorioBase<AlertaDesabastecimento> {
  constructor(db: DatabaseMemoria) {
    super(db, 'alertas', () => db.alertas);
  }
  listarAbertos(): AlertaDesabastecimento[] {
    return this.listar().filter((a) => a.status !== 'RESOLVIDO');
  }
}

export class PrevisaoRepository extends RepositorioBase<PrevisaoDemanda> {
  constructor(db: DatabaseMemoria) {
    super(db, 'previsoes', () => db.previsoes);
  }
  buscarPorUnidadeEMedicamento(unidadeId: number, medicamentoId: number): PrevisaoDemanda | undefined {
    return this.listar().find((p) => p.unidadeId === unidadeId && p.medicamentoId === medicamentoId);
  }
}

export class DispensacaoRepository extends RepositorioBase<Dispensacao> {
  constructor(db: DatabaseMemoria) {
    super(db, 'dispensacoes', () => db.dispensacoes);
  }
}
