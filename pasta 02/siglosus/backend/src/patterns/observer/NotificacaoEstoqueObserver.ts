import { TipoNotificacao } from '../../domain/enums';
import { obterFabricaNotificacao, ResultadoNotificacao } from '../factory/NotificacaoFactory';
import { EventoEstoque, ObservadorEstoque } from './EstoqueSubject';

/**
 * Observador concreto: notifica o gestor quando há risco de desabastecimento.
 *
 * Demonstra a COMBINAÇÃO de padrões: o Observer dispara, e a criação do canal
 * de envio é delegada ao Factory Method.
 */
export class NotificacaoEstoqueObserver implements ObservadorEstoque {
  readonly nome = 'NotificacaoEstoqueObserver';
  readonly notificacoesEnviadas: ResultadoNotificacao[] = [];

  constructor(private readonly canal: TipoNotificacao = TipoNotificacao.EMAIL) {}

  atualizar(evento: EventoEstoque): void {
    if (!evento.estoque.abaixoDoMinimo()) {
      return;
    }
    const fabrica = obterFabricaNotificacao(this.canal);
    const mensagem =
      `Alerta de desabastecimento: ${evento.medicamento.nome} na unidade ` +
      `${evento.unidade.nome} está com ${evento.estoque.quantidadeAtual} un. ` +
      `(mínimo ${evento.estoque.nivelMinimo}).`;
    this.notificacoesEnviadas.push(fabrica.notificar('gestor@siglosus.gov.br', mensagem));
  }

  limpar(): void {
    this.notificacoesEnviadas.length = 0;
  }
}
