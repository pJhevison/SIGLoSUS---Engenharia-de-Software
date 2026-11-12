import { Estoque, Medicamento, UnidadeSaude } from '../../domain/entities';
import { TipoMovimentacao } from '../../domain/enums';

/**
 * PADRÃO DE PROJETO: OBSERVER
 * ------------------------------------------------------------------
 * Problema: sempre que o estoque muda (entrada, saída, transferência ou ajuste),
 * vários comportamentos precisam reagir: gerar alerta de desabastecimento,
 * notificar o gestor, atualizar painéis. Acoplar tudo isso ao serviço de estoque
 * tornaria a classe gigante e rígida.
 *
 * Solução: um "assunto" (Subject) mantém uma lista de observadores e os avisa
 * automaticamente quando o estado muda — sem conhecer suas classes concretas.
 *
 * Aplicação no SIGLoSUS: geração de alertas (RF11) e notificações (RF11/UC14).
 */

/** Evento publicado quando há movimentação de estoque. */
export interface EventoEstoque {
  tipo: TipoMovimentacao;
  estoque: Estoque;
  medicamento: Medicamento;
  unidade: UnidadeSaude;
  quantidadeMovimentada: number;
  usuarioId: number;
}

/** Interface do observador. */
export interface ObservadorEstoque {
  readonly nome: string;
  atualizar(evento: EventoEstoque): void;
}

/** Subject (assunto observável). */
export class EstoqueSubject {
  private observadores: ObservadorEstoque[] = [];

  registrarObservador(observador: ObservadorEstoque): void {
    if (!this.observadores.some((o) => o.nome === observador.nome)) {
      this.observadores.push(observador);
    }
  }

  removerObservador(observador: ObservadorEstoque): void {
    this.observadores = this.observadores.filter((o) => o.nome !== observador.nome);
  }

  listarObservadores(): string[] {
    return this.observadores.map((o) => o.nome);
  }

  notificar(evento: EventoEstoque): void {
    for (const observador of this.observadores) {
      observador.atualizar(evento);
    }
  }
}
