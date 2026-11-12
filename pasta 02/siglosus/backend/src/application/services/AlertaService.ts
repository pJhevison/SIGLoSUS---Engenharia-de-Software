import { AlertaDesabastecimento } from '../../domain/entities';
import { AlertaRepository } from '../../infrastructure/repositories';
import { EventoEstoque } from '../../patterns/observer/EstoqueSubject';
import { TratadorEventoEstoque } from '../../patterns/observer/AlertaDesabastecimentoObserver';

/**
 * Serviço de alertas de desabastecimento (RF11).
 *
 * Implementa `TratadorEventoEstoque`: é acionado pelo Observer sempre que uma
 * movimentação deixa um estoque abaixo do nível mínimo.
 */
export class AlertaService implements TratadorEventoEstoque {
  constructor(private readonly alertas: AlertaRepository) {}

  tratar(evento: EventoEstoque): void {
    const alerta = new AlertaDesabastecimento(
      this.alertas.proximoId(),
      evento.estoque.id,
      evento.unidade.id,
      evento.medicamento.id,
      AlertaDesabastecimento.classificarRisco(
        evento.estoque.quantidadeAtual,
        evento.estoque.nivelMinimo,
      ),
    );
    this.alertas.salvar(alerta);
  }

  listar(): AlertaDesabastecimento[] {
    return this.alertas.listar().sort((a, b) => b.geradoEm.getTime() - a.geradoEm.getTime());
  }

  listarAbertos(): AlertaDesabastecimento[] {
    return this.alertas.listarAbertos();
  }

  resolver(id: number): AlertaDesabastecimento | undefined {
    const alerta = this.alertas.buscarPorId(id);
    alerta?.resolver();
    return alerta;
  }
}
