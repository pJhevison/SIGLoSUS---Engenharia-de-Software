import { TipoNotificacao } from '../../domain/enums';

/**
 * PADRÃO DE PROJETO: FACTORY METHOD
 * ------------------------------------------------------------------
 * Problema: o SIGLoSUS precisa avisar usuários por diferentes canais
 * (e-mail, SMS, push). Instanciar cada canal diretamente espalharia o
 * `new` por todo o código e acoplaria o chamador às classes concretas.
 *
 * Solução: uma "fábrica" abstrata declara o método de criação
 * (`criarNotificacao()`), e cada subclasse decide qual objeto concreto criar.
 *
 * Aplicação no SIGLoSUS: envio de alertas de desabastecimento (RF11),
 * notificação de transferências (UC14) e de entregas (UC18).
 */
export interface ResultadoNotificacao {
  canal: TipoNotificacao;
  destinatario: string;
  mensagem: string;
  enviadoEm: Date;
}

export interface Notificacao {
  enviar(destinatario: string, mensagem: string): ResultadoNotificacao;
}

/** Produto concreto: notificação por e-mail. */
export class NotificacaoEmail implements Notificacao {
  enviar(destinatario: string, mensagem: string): ResultadoNotificacao {
    return { canal: TipoNotificacao.EMAIL, destinatario, mensagem, enviadoEm: new Date() };
  }
}

/** Produto concreto: notificação por SMS. */
export class NotificacaoSms implements Notificacao {
  enviar(destinatario: string, mensagem: string): ResultadoNotificacao {
    return { canal: TipoNotificacao.SMS, destinatario, mensagem, enviadoEm: new Date() };
  }
}

/** Produto concreto: notificação por push. */
export class NotificacaoPush implements Notificacao {
  enviar(destinatario: string, mensagem: string): ResultadoNotificacao {
    return { canal: TipoNotificacao.PUSH, destinatario, mensagem, enviadoEm: new Date() };
  }
}

/** Criador abstrato (Factory Method). */
export abstract class NotificacaoFactory {
  protected abstract criarNotificacao(): Notificacao;
  abstract get canal(): TipoNotificacao;

  /** Template method: usa o produto criado sem conhecer a classe concreta. */
  notificar(destinatario: string, mensagem: string): ResultadoNotificacao {
    const notificacao = this.criarNotificacao();
    return notificacao.enviar(destinatario, mensagem);
  }
}

export class NotificacaoEmailFactory extends NotificacaoFactory {
  readonly canal = TipoNotificacao.EMAIL;
  protected criarNotificacao(): Notificacao {
    return new NotificacaoEmail();
  }
}

export class NotificacaoSmsFactory extends NotificacaoFactory {
  readonly canal = TipoNotificacao.SMS;
  protected criarNotificacao(): Notificacao {
    return new NotificacaoSms();
  }
}

export class NotificacaoPushFactory extends NotificacaoFactory {
  readonly canal = TipoNotificacao.PUSH;
  protected criarNotificacao(): Notificacao {
    return new NotificacaoPush();
  }
}

/** Seleciona a fábrica adequada ao canal desejado. */
export function obterFabricaNotificacao(tipo: TipoNotificacao): NotificacaoFactory {
  switch (tipo) {
    case TipoNotificacao.EMAIL:
      return new NotificacaoEmailFactory();
    case TipoNotificacao.SMS:
      return new NotificacaoSmsFactory();
    case TipoNotificacao.PUSH:
      return new NotificacaoPushFactory();
    default:
      throw new Error(`Canal de notificação não suportado: ${tipo}`);
  }
}
