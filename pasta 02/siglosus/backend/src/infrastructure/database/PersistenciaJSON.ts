import * as fs from 'fs';
import * as path from 'path';
import {
  AlertaDesabastecimento,
  Dispensacao,
  Entrega,
  EntregaItem,
  Estoque,
  IntegracaoExterna,
  LogAuditoria,
  Lote,
  Medicamento,
  MovimentacaoEstoque,
  ParadaRota,
  PosicaoRota,
  PrevisaoDemanda,
  ResultadoIdempotencia,
  Relatorio,
  Requisicao,
  Rota,
  TokenRecuperacaoSenha,
  TokenRevogado,
  Transferencia,
  UnidadeSaude,
  Usuario,
  Veiculo,
} from '../../domain/entities';
import { Endereco } from '../../domain/entities/Endereco';
import { DatabaseMemoria } from './DatabaseMemoria';

/**
 * Persistência em arquivo JSON (camada de infraestrutura).
 *
 * Objetivo: os dados do protótipo **não podem ser perdidos** quando o
 * backend é reiniciado. A implementação grava o estado completo do banco em
 * memória em um arquivo JSON, de forma atômica (escrita em arquivo temporário
 * seguida de renomeação).
 *
 * Limitações assumidas e documentadas: não há transações, concorrência
 * multiprocesso nem consultas em SQL. Para produção, esta classe deve ser
 * substituída por um adaptador de SGBD atrás das mesmas interfaces de
 * repositório.
 */

const MARCA_DATA = '__data';

interface EstadoArquivo {
  versao: number;
  geradoEm: string;
  contadores: Record<string, number>;
  colecoes: Record<string, unknown[]>;
}

/** Converte um grafo de objetos em estrutura serializável (Date -> marcador). */
function paraSimples(valor: unknown): unknown {
  if (valor instanceof Date) return { [MARCA_DATA]: valor.toISOString() };
  if (Array.isArray(valor)) return valor.map(paraSimples);
  if (valor && typeof valor === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(valor as Record<string, unknown>)) {
      saida[chave] = paraSimples(item);
    }
    return saida;
  }
  return valor;
}

/** Converte a estrutura serializada de volta, restaurando os objetos Date. */
function paraOriginal(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(paraOriginal);
  if (valor && typeof valor === 'object') {
    const registro = valor as Record<string, unknown>;
    if (typeof registro[MARCA_DATA] === 'string') {
      return new Date(registro[MARCA_DATA] as string);
    }
    const saida: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(registro)) {
      saida[chave] = paraOriginal(item);
    }
    return saida;
  }
  return valor;
}

/** Aplica o protótipo da classe original ao objeto restaurado. */
function restaurar<T>(objeto: unknown, classe: { new (...args: never[]): T }): T {
  Object.setPrototypeOf(objeto, classe.prototype);
  return objeto as T;
}

export class PersistenciaJSON {
  constructor(private readonly caminho: string) {}

  /** Caminho absoluto do arquivo de dados. */
  get arquivo(): string {
    return path.resolve(this.caminho);
  }

  existe(): boolean {
    return fs.existsSync(this.arquivo);
  }

  /**
   * Carrega o estado do arquivo para o banco em memória.
   * Devolve `false` quando não há arquivo (primeira execução).
   */
  carregar(db: DatabaseMemoria): boolean {
    if (!this.existe()) return false;

    let conteudo: EstadoArquivo;
    try {
      conteudo = JSON.parse(fs.readFileSync(this.arquivo, 'utf-8')) as EstadoArquivo;
    } catch (erro) {
      throw new Error(
        `Não foi possível ler o arquivo de persistência "${this.arquivo}": ${(erro as Error).message}`,
      );
    }

    const colecoes = conteudo.colecoes ?? {};
    const dados = (nome: string): Record<string, unknown>[] =>
      ((paraOriginal(colecoes[nome] ?? []) as unknown) as Record<string, unknown>[]);

    db.usuarios = dados('usuarios').map((u) => restaurar<Usuario>(u, Usuario));
    db.unidades = dados('unidades').map((u) => {
      const unidade = restaurar<UnidadeSaude>(u, UnidadeSaude);
      if (unidade.endereco) restaurar<Endereco>(unidade.endereco, Endereco);
      return unidade;
    });
    db.medicamentos = dados('medicamentos').map((m) => restaurar<Medicamento>(m, Medicamento));
    db.estoques = dados('estoques').map((e) => {
      const estoque = restaurar<Estoque>(e, Estoque);
      estoque.lotes = (estoque.lotes ?? []).map((l) => restaurar<Lote>(l, Lote));
      return estoque;
    });
    db.movimentacoes = dados('movimentacoes').map((m) => restaurar<MovimentacaoEstoque>(m, MovimentacaoEstoque));
    db.alertas = dados('alertas').map((a) => restaurar<AlertaDesabastecimento>(a, AlertaDesabastecimento));
    db.previsoes = dados('previsoes').map((p) => restaurar<PrevisaoDemanda>(p, PrevisaoDemanda));
    db.transferencias = dados('transferencias').map((t) => restaurar<Transferencia>(t, Transferencia));
    db.requisicoes = dados('requisicoes').map((r) => restaurar<Requisicao>(r, Requisicao));
    db.rotas = dados('rotas').map((r) => {
      const rota = restaurar<Rota>(r, Rota);
      rota.paradas = (rota.paradas ?? []).map((p) => {
        const parada = restaurar<ParadaRota>(p, ParadaRota);
        if (parada.unidade) restaurar<UnidadeSaude>(parada.unidade, UnidadeSaude);
        return parada;
      });
      return rota;
    });
    db.veiculos = dados('veiculos').map((v) => restaurar<Veiculo>(v, Veiculo));
    db.entregas = dados('entregas').map((e) => {
      const entrega = restaurar<Entrega>(e, Entrega);
      entrega.itens = (entrega.itens ?? []).map((i) => restaurar<EntregaItem>(i, EntregaItem));
      return entrega;
    });
    db.integracoes = dados('integracoes').map((i) => restaurar<IntegracaoExterna>(i, IntegracaoExterna));
    db.dispensacoes = dados('dispensacoes').map((d) => restaurar<Dispensacao>(d, Dispensacao));
    db.relatorios = dados('relatorios').map((r) => restaurar<Relatorio>(r, Relatorio));
    db.auditoria = dados('auditoria').map((l) => restaurar<LogAuditoria>(l, LogAuditoria));
    db.tokensRecuperacao = dados('tokensRecuperacao').map((t) =>
      restaurar<TokenRecuperacaoSenha>(t, TokenRecuperacaoSenha),
    );
    db.tokensRevogados = dados('tokensRevogados').map((t) =>
      restaurar<TokenRevogado>(t, TokenRevogado),
    );
    db.resultadosIdempotencia = dados('resultadosIdempotencia').map((r) =>
      restaurar<ResultadoIdempotencia>(r, ResultadoIdempotencia),
    );
    db.posicoes = dados('posicoes').map((p) => restaurar<PosicaoRota>(p, PosicaoRota));

    db.importarContadores(conteudo.contadores ?? {});
    return true;
  }

  /** Grava o estado atual do banco em arquivo (escrita atômica). */
  persistir(db: DatabaseMemoria): void {
    const estado: EstadoArquivo = {
      versao: 1,
      geradoEm: new Date().toISOString(),
      contadores: db.exportarContadores(),
      colecoes: paraSimples(db.colecoes()) as Record<string, unknown[]>,
    };

    const diretorio = path.dirname(this.arquivo);
    fs.mkdirSync(diretorio, { recursive: true });
    const temporario = `${this.arquivo}.tmp`;
    fs.writeFileSync(temporario, JSON.stringify(estado, null, 2), 'utf-8');
    fs.renameSync(temporario, this.arquivo);
  }
}
