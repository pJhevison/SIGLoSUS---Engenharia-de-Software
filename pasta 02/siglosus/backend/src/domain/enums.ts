/**
 * Enumerações do domínio do SIGLoSUS.
 *
 * Centralizam os "tipos enumerados" apresentados no Diagrama de Classes (seção 3.5).
 */

export enum PerfilUsuario {
  ADMINISTRADOR = 'ADMINISTRADOR',
  GESTOR = 'GESTOR',
  FARMACEUTICO = 'FARMACEUTICO',
  ALMOXARIFE = 'ALMOXARIFE',
  MOTORISTA = 'MOTORISTA',
}

export enum TipoUnidade {
  UBS = 'UBS',
  HOSPITAL = 'HOSPITAL',
  FARMACIA_POPULAR = 'FARMACIA_POPULAR',
  CENTRAL_DISTRIBUICAO = 'CENTRAL_DISTRIBUICAO',
}

export enum TipoMovimentacao {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  AJUSTE = 'AJUSTE',
}

export enum NivelRisco {
  BAIXO = 'BAIXO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
  CRITICO = 'CRITICO',
}

export enum StatusAlerta {
  ABERTO = 'ABERTO',
  EM_TRATAMENTO = 'EM_TRATAMENTO',
  RESOLVIDO = 'RESOLVIDO',
}

export enum StatusTransferencia {
  SUGERIDA = 'SUGERIDA',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
  CONCLUIDA = 'CONCLUIDA',
}

export enum StatusRequisicao {
  PENDENTE = 'PENDENTE',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
  ATENDIDA = 'ATENDIDA',
}

export enum StatusRota {
  PLANEJADA = 'PLANEJADA',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
}

export enum StatusParada {
  PENDENTE = 'PENDENTE',
  CONCLUIDA = 'CONCLUIDA',
}

export enum StatusEntrega {
  PENDENTE = 'PENDENTE',
  EM_TRANSITO = 'EM_TRANSITO',
  ENTREGUE = 'ENTREGUE',
  COM_DIVERGENCIA = 'COM_DIVERGENCIA',
}

export enum StatusIntegracao {
  ATIVA = 'ATIVA',
  INATIVA = 'INATIVA',
  ERRO = 'ERRO',
}

export enum TipoNotificacao {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}
