import {
  PosicaoRota,
  ResultadoIdempotencia,
  TokenRecuperacaoSenha,
  TokenRevogado,
} from '../../domain/entities';
import { DatabaseMemoria } from '../database/DatabaseMemoria';
import { RepositorioBase } from './RepositorioBase';

export class TokenRecuperacaoRepository extends RepositorioBase<TokenRecuperacaoSenha> {
  constructor(db: DatabaseMemoria) {
    super(db, 'tokensRecuperacao', () => db.tokensRecuperacao);
  }

  buscarPorHash(hashToken: string): TokenRecuperacaoSenha | undefined {
    return this.listar().find((t) => t.hashToken === hashToken);
  }

  invalidarDoUsuario(usuarioId: number): void {
    for (const token of this.listar()) {
      if (token.usuarioId === usuarioId) token.marcarUsado();
    }
  }
}

export class PosicaoRotaRepository extends RepositorioBase<PosicaoRota> {
  constructor(db: DatabaseMemoria) {
    super(db, 'posicoes', () => db.posicoes);
  }

  listarPorRota(rotaId: number): PosicaoRota[] {
    return this.listar()
      .filter((p) => p.rotaId === rotaId)
      .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());
  }

  ultimaPosicao(rotaId: number): PosicaoRota | undefined {
    const posicoes = this.listarPorRota(rotaId);
    return posicoes[posicoes.length - 1];
  }
}

export class TokenRevogadoRepository extends RepositorioBase<TokenRevogado> {
  constructor(db: DatabaseMemoria) {
    super(db, 'tokensRevogados', () => db.tokensRevogados);
  }

  estaRevogado(jti: string): boolean {
    return this.listar().some((t) => t.jti === jti);
  }

  limparExpirados(referencia: number = Math.floor(Date.now() / 1000)): number {
    const colecao = this.obterColecao();
    let removidos = 0;
    for (let i = colecao.length - 1; i >= 0; i--) {
      if (colecao[i].estaExpirado(referencia)) {
        colecao.splice(i, 1);
        removidos += 1;
      }
    }
    return removidos;
  }
}

export class IdempotenciaRepository extends RepositorioBase<ResultadoIdempotencia> {
  constructor(db: DatabaseMemoria) {
    super(db, 'resultadosIdempotencia', () => db.resultadosIdempotencia);
  }

  buscarPorChave(chave: string): ResultadoIdempotencia | undefined {
    return this.listar().find((r) => r.chave === chave);
  }

  limparAntigos(idadeMaximaMs: number = 24 * 60 * 60 * 1000): number {
    const colecao = this.obterColecao();
    const limite = Date.now() - idadeMaximaMs;
    let removidos = 0;
    for (let i = colecao.length - 1; i >= 0; i--) {
      if (colecao[i].criadoEm.getTime() < limite) {
        colecao.splice(i, 1);
        removidos += 1;
      }
    }
    return removidos;
  }
}
