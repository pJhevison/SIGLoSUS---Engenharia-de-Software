import { EventoEstoque, ObservadorEstoque } from './EstoqueSubject';

/**
 * Handler (interface própria do padrão) que trata um evento de estoque.
 * Permite que o observador delegue o efeito concreto sem acoplar-se à
 * camada de aplicação.
 */
export interface TratadorEventoEstoque {
  tratar(evento: EventoEstoque): void;
}

/**
 * Observador concreto: reage a movimentações de estoque encaminhando o evento
 * para um tratador. Quando o estoque fica abaixo do nível mínimo, o tratador
 * gera o alerta de desabastecimento (RF11).
 */
export class AlertaDesabastecimentoObserver implements ObservadorEstoque {
  readonly nome = 'AlertaDesabastecimentoObserver';

  constructor(private readonly tratador: TratadorEventoEstoque) {}

  atualizar(evento: EventoEstoque): void {
    if (evento.estoque.abaixoDoMinimo()) {
      this.tratador.tratar(evento);
    }
  }
}
