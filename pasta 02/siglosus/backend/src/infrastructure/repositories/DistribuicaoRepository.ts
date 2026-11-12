import { Entrega, Requisicao, Rota, Transferencia, Veiculo } from '../../domain/entities';
import { StatusTransferencia } from '../../domain/enums';
import { DatabaseMemoria } from '../database/DatabaseMemoria';
import { RepositorioBase } from './RepositorioBase';

export class TransferenciaRepository extends RepositorioBase<Transferencia> {
  constructor(db: DatabaseMemoria) {
    super(db, 'transferencias', () => db.transferencias);
  }
  listarSugeridas(): Transferencia[] {
    return this.listar().filter((t) => t.estaPendente());
  }

  listarAprovadasPorDestino(unidadeDestinoId: number): Transferencia[] {
    return this.listar().filter(
      (t) => t.status === StatusTransferencia.APROVADA && t.unidadeDestinoId === unidadeDestinoId,
    );
  }
}

export class RequisicaoRepository extends RepositorioBase<Requisicao> {
  constructor(db: DatabaseMemoria) {
    super(db, 'requisicoes', () => db.requisicoes);
  }
}

export class RotaRepository extends RepositorioBase<Rota> {
  constructor(db: DatabaseMemoria) {
    super(db, 'rotas', () => db.rotas);
  }

  /**
   * Identificador de parada em sequência própria. Antes, o serviço reutilizava
   * a sequência de rotas, consumindo ids e confundindo a rastreabilidade.
   */
  proximoIdParada(): number {
    return this.db.proximoId('paradas');
  }
}

export class VeiculoRepository extends RepositorioBase<Veiculo> {
  constructor(db: DatabaseMemoria) {
    super(db, 'veiculos', () => db.veiculos);
  }
}

export class EntregaRepository extends RepositorioBase<Entrega> {
  constructor(db: DatabaseMemoria) {
    super(db, 'entregas', () => db.entregas);
  }
  listarPorRota(rotaId: number): Entrega[] {
    return this.listar().filter((e) => e.rotaId === rotaId);
  }
}
