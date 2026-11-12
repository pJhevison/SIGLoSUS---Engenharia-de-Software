import { PosicaoRota, TokenRecuperacaoSenha } from '../../domain/entities';
import { DatabaseMemoria } from '../database/DatabaseMemoria';
import { RepositorioBase } from './RepositorioBase';

export class TokenRecuperacaoRepository extends RepositorioBase<TokenRecuperacaoSenha> {
  constructor(db: DatabaseMemoria) {
    super(db, 'tokensRecuperacao', () => db.tokensRecuperacao);
  }

  /** Localiza o token pelo hash persistido (o valor em claro nunca é gravado). */
  buscarPorHash(hashToken: string): TokenRecuperacaoSenha | undefined {
    return this.listar().find((t) => t.hashToken === hashToken);
  }

  /** Invalida os tokens anteriores de um usuário (troca de senha). */
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
