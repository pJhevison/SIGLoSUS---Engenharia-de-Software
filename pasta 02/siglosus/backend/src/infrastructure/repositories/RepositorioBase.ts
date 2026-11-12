import { DatabaseMemoria } from '../database/DatabaseMemoria';

/**
 * PADRÃO ARQUITETURAL: REPOSITORY
 *
 * Abstrai o acesso a dados. O domínio e a aplicação não sabem se os dados estão
 * em memória, em um SGBD ou em outro meio — apenas usam esta interface.
 */
export abstract class RepositorioBase<T extends { id: number }> {
  constructor(
    protected readonly db: DatabaseMemoria,
    protected readonly nomeColecao: string,
    protected readonly obterColecao: () => T[],
  ) {}

  listar(): T[] {
    return [...this.obterColecao()];
  }

  buscarPorId(id: number): T | undefined {
    return this.obterColecao().find((item) => item.id === id);
  }

  salvar(item: T): T {
    this.obterColecao().push(item);
    return item;
  }

  remover(id: number): boolean {
    const colecao = this.obterColecao();
    const indice = colecao.findIndex((item) => item.id === id);
    if (indice === -1) return false;
    colecao.splice(indice, 1);
    return true;
  }

  proximoId(): number {
    return this.db.proximoId(this.nomeColecao);
  }

  contar(): number {
    return this.obterColecao().length;
  }
}
