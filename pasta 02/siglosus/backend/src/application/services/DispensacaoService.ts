import { Dispensacao } from '../../domain/entities';
import { TipoMovimentacao } from '../../domain/enums';
import { ErroNaoEncontrado, ErroValidacao } from '../../domain/errors';
import { RegraNegocioError, RegrasNegocio } from '../../domain/rules/RegrasNegocio';
import {
  DispensacaoRepository,
  EstoqueRepository,
  MedicamentoRepository,
  UnidadeRepository,
} from '../../infrastructure/repositories';
import { AuditoriaService } from './AuditoriaService';
import { EstoqueService } from './EstoqueService';

export interface DadosDispensacao {
  unidadeId: number;
  medicamentoId: number;
  loteId?: number;
  quantidade: number;
  /** Quantidade de responsáveis que conferiram a dispensação (RN05). */
  conferentes?: number;
  usuarioId: number;
}

/**
 * Serviço de dispensação ao paciente (RF19 — UC19).
 *
 * Aplica a RN05: medicamentos controlados exigem lote identificado e
 * conferência por dois responsáveis. A baixa é feita no lote informado para
 * preservar a rastreabilidade.
 */
export class DispensacaoService {
  constructor(
    private readonly dispensacoes: DispensacaoRepository,
    private readonly estoques: EstoqueRepository,
    private readonly medicamentos: MedicamentoRepository,
    private readonly unidades: UnidadeRepository,
    private readonly estoqueService: EstoqueService,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(unidadeId?: number): Dispensacao[] {
    const todas = this.dispensacoes.listar();
    return unidadeId ? todas.filter((d) => d.unidadeId === unidadeId) : todas;
  }

  registrar(dados: DadosDispensacao): Dispensacao {
    const quantidade = Number(dados.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new ErroValidacao('A quantidade deve ser um número inteiro positivo.');
    }

    const unidade = this.unidades.buscarPorId(Number(dados.unidadeId));
    if (!unidade) throw new ErroNaoEncontrado('Unidade não encontrada.');
    const medicamento = this.medicamentos.buscarPorId(Number(dados.medicamentoId));
    if (!medicamento) throw new ErroNaoEncontrado('Medicamento não encontrado.');
    const estoque = this.estoques.buscarPorUnidadeEMedicamento(
      Number(dados.unidadeId),
      Number(dados.medicamentoId),
    );
    if (!estoque) {
      throw new ErroNaoEncontrado('A unidade não possui estoque deste medicamento.');
    }

    const loteId = dados.loteId === undefined || dados.loteId === null ? null : Number(dados.loteId);
    if (loteId !== null && !estoque.lotes.some((l) => l.id === loteId)) {
      throw new ErroNaoEncontrado('Lote não encontrado no estoque da unidade.');
    }
    if (medicamento.exigeConferenciaDupla() && loteId === null) {
      throw new RegraNegocioError(
        'RN05',
        'Medicamento controlado exige rastreabilidade por lote (informe loteId).',
      );
    }

    const conferentes = Number(dados.conferentes ?? 1);
    RegrasNegocio.validarRN05_ConferenciaDupla(medicamento.exigeConferenciaDupla(), conferentes);

    this.estoqueService.registrarMovimentacao({
      estoqueId: estoque.id,
      tipo: TipoMovimentacao.SAIDA,
      quantidade,
      usuarioId: Number(dados.usuarioId),
      loteId: loteId ?? undefined,
      observacao: `Dispensação ao paciente — lote ${loteId ?? 'FEFO'}`,
    });

    const dispensacao = new Dispensacao(
      this.dispensacoes.proximoId(),
      Number(dados.unidadeId),
      Number(dados.medicamentoId),
      loteId,
      quantidade,
      new Date(),
      conferentes,
    );
    this.dispensacoes.salvar(dispensacao);
    this.auditoria.registrar(
      Number(dados.usuarioId),
      'REGISTRAR_DISPENSACAO',
      'dispensacao',
      `${quantidade} un. de ${medicamento.nome} na unidade ${dados.unidadeId}`,
      true,
    );
    return dispensacao;
  }
}
