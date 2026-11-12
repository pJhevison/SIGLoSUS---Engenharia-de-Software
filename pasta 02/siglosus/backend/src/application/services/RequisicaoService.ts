import { Requisicao } from '../../domain/entities';
import { PerfilUsuario } from '../../domain/enums';
import { ErroConflito, ErroNaoEncontrado, ErroValidacao } from '../../domain/errors';
import { RegrasNegocio } from '../../domain/rules/RegrasNegocio';
import {
  MedicamentoRepository,
  RequisicaoRepository,
  UnidadeRepository,
  UsuarioRepository,
} from '../../infrastructure/repositories';
import { ConfiguracaoSistema } from '../../patterns/singleton/ConfiguracaoSistema';
import { AuditoriaService } from './AuditoriaService';

export interface DadosRequisicao {
  unidadeSolicitanteId: number;
  medicamentoId: number;
  quantidade: number;
  valorEstimado: number;
  usuarioId: number;
}

/**
 * Serviço de requisições de medicamentos (RF20 — UC20).
 *
 * A aprovação aplica a RN09: requisições acima de
 * `ConfiguracaoSistema.limiteAprovacaoGestor` só podem ser aprovadas por
 * usuário com perfil GESTOR ou ADMINISTRADOR.
 */
export class RequisicaoService {
  constructor(
    private readonly requisicoes: RequisicaoRepository,
    private readonly unidades: UnidadeRepository,
    private readonly medicamentos: MedicamentoRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(): Requisicao[] {
    return this.requisicoes.listar();
  }

  buscar(id: number): Requisicao | undefined {
    return this.requisicoes.buscarPorId(id);
  }

  criar(dados: DadosRequisicao): Requisicao {
    const quantidade = Number(dados.quantidade);
    const valorEstimado = Number(dados.valorEstimado);

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new ErroValidacao('A quantidade deve ser um número inteiro positivo.');
    }
    if (!Number.isFinite(valorEstimado) || valorEstimado < 0) {
      throw new ErroValidacao('O valor estimado deve ser um número maior ou igual a zero.');
    }
    if (!this.unidades.buscarPorId(Number(dados.unidadeSolicitanteId))) {
      throw new ErroNaoEncontrado('Unidade solicitante não encontrada.');
    }
    if (!this.medicamentos.buscarPorId(Number(dados.medicamentoId))) {
      throw new ErroNaoEncontrado('Medicamento não encontrado.');
    }

    const requisicao = new Requisicao(
      this.requisicoes.proximoId(),
      Number(dados.unidadeSolicitanteId),
      Number(dados.medicamentoId),
      quantidade,
      valorEstimado,
    );
    this.requisicoes.salvar(requisicao);
    this.auditoria.registrar(
      Number(dados.usuarioId),
      'CRIAR_REQUISICAO',
      'requisicao',
      `Requisição ${requisicao.id} — unidade ${requisicao.unidadeSolicitanteId}`,
      true,
    );
    return requisicao;
  }

  /** Aprova a requisição aplicando RN09 (limite de valor e perfil do aprovador). */
  aprovar(id: number, usuarioId: number): Requisicao {
    const requisicao = this.obterPendente(id);
    const usuario = this.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new ErroNaoEncontrado('Usuário aprovador não encontrado.');

    const aprovadaPorGestor =
      usuario.perfil === PerfilUsuario.GESTOR || usuario.perfil === PerfilUsuario.ADMINISTRADOR;
    const limite = ConfiguracaoSistema.obterInstancia().obter('limiteAprovacaoGestor');

    RegrasNegocio.validarRN09_AprovacaoGestor(requisicao, limite, aprovadaPorGestor);
    requisicao.aprovar();
    this.auditoria.registrar(
      usuarioId,
      'APROVAR_REQUISICAO',
      'requisicao',
      `Requisição ${id} (R$ ${requisicao.valorEstimado.toFixed(2)})`,
      true,
    );
    return requisicao;
  }

  rejeitar(id: number, justificativa: string, usuarioId: number): Requisicao {
    const requisicao = this.obterPendente(id);
    requisicao.rejeitar(justificativa);
    this.auditoria.registrar(usuarioId, 'REJEITAR_REQUISICAO', 'requisicao', `Requisição ${id}: ${justificativa}`, true);
    return requisicao;
  }

  private obterPendente(id: number): Requisicao {
    const requisicao = this.requisicoes.buscarPorId(id);
    if (!requisicao) throw new ErroNaoEncontrado('Requisição não encontrada.');
    if (!requisicao.estaPendente()) {
      throw new ErroConflito('Requisição não está pendente de aprovação.');
    }
    return requisicao;
  }
}
