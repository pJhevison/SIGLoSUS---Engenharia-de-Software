import { Endereco, UnidadeSaude } from '../../domain/entities';
import { TipoUnidade } from '../../domain/enums';
import { ErroConflito, ErroNaoEncontrado, ErroValidacao } from '../../domain/errors';
import { UnidadeRepository } from '../../infrastructure/repositories';
import { AuditoriaService } from './AuditoriaService';

export interface DadosUnidade {
  nome: string;
  tipo: TipoUnidade;
  cnes: string;
  endereco?: {
    logradouro: string;
    numero: string;
    cidade: string;
    uf: string;
    cep: string;
    latitude: number;
    longitude: number;
  };
}

/**
 * Serviço de cadastro e manutenção das unidades de saúde (RF05).
 *
 * Inclui UBS, hospitais, farmácias populares e a Central de Abastecimento
 * Farmacêutico (centro de distribuição).
 */
export class UnidadeService {
  constructor(
    private readonly unidades: UnidadeRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(): UnidadeSaude[] {
    return this.unidades.listar();
  }

  buscar(id: number): UnidadeSaude {
    const unidade = this.unidades.buscarPorId(id);
    if (!unidade) throw new ErroNaoEncontrado('Unidade de saúde não encontrada.');
    return unidade;
  }

  private validar(dados: DadosUnidade): void {
    const nome = String(dados.nome ?? '').trim();
    if (nome.length < 3) throw new ErroValidacao('O nome da unidade deve ter ao menos 3 caracteres.');
    if (!Object.values(TipoUnidade).includes(dados.tipo)) {
      throw new ErroValidacao('Tipo de unidade inválido.');
    }
    const cnes = String(dados.cnes ?? '').replace(/\D/g, '');
    if (cnes.length !== 7) throw new ErroValidacao('O CNES deve ter 7 dígitos.');
  }

  criar(dados: DadosUnidade, usuarioId: number): UnidadeSaude {
    this.validar(dados);
    const cnes = String(dados.cnes).replace(/\D/g, '');
    if (this.unidades.buscarPorCnes(cnes)) {
      throw new ErroConflito('Já existe uma unidade com este CNES.');
    }
    const endereco = dados.endereco
      ? new Endereco(
          String(dados.endereco.logradouro ?? ''),
          String(dados.endereco.numero ?? ''),
          String(dados.endereco.cidade ?? ''),
          String(dados.endereco.uf ?? ''),
          String(dados.endereco.cep ?? ''),
          Number(dados.endereco.latitude ?? 0),
          Number(dados.endereco.longitude ?? 0),
        )
      : new Endereco('', '', '', '', '', 0, 0);

    const unidade = new UnidadeSaude(
      this.unidades.proximoId(),
      String(dados.nome).trim(),
      dados.tipo,
      cnes,
      endereco,
    );
    this.unidades.salvar(unidade);
    this.auditoria.registrar(usuarioId, 'CRIAR_UNIDADE', 'unidade', `${unidade.nome} (${cnes})`, true);
    return unidade;
  }

  /** Manutenção: alteração de nome, tipo, CNES e endereço. */
  atualizar(id: number, dados: Partial<DadosUnidade>, usuarioId: number): UnidadeSaude {
    const unidade = this.buscar(id);
    if (dados.nome !== undefined) {
      const nome = String(dados.nome).trim();
      if (nome.length < 3) throw new ErroValidacao('O nome da unidade deve ter ao menos 3 caracteres.');
      unidade.nome = nome;
    }
    if (dados.tipo !== undefined) {
      if (!Object.values(TipoUnidade).includes(dados.tipo)) {
        throw new ErroValidacao('Tipo de unidade inválido.');
      }
      unidade.tipo = dados.tipo;
    }
    if (dados.cnes !== undefined) {
      const cnes = String(dados.cnes).replace(/\D/g, '');
      if (cnes.length !== 7) throw new ErroValidacao('O CNES deve ter 7 dígitos.');
      const existente = this.unidades.buscarPorCnes(cnes);
      if (existente && existente.id !== unidade.id) {
        throw new ErroConflito('Já existe uma unidade com este CNES.');
      }
      unidade.cnes = cnes;
    }
    if (dados.endereco !== undefined) {
      unidade.endereco = new Endereco(
        String(dados.endereco.logradouro ?? ''),
        String(dados.endereco.numero ?? ''),
        String(dados.endereco.cidade ?? ''),
        String(dados.endereco.uf ?? ''),
        String(dados.endereco.cep ?? ''),
        Number(dados.endereco.latitude ?? 0),
        Number(dados.endereco.longitude ?? 0),
      );
    }
    this.auditoria.registrar(usuarioId, 'ATUALIZAR_UNIDADE', 'unidade', unidade.nome, true);
    return unidade;
  }
}
