import { Transferencia } from '../../domain/entities';
import { RegrasNegocio, RegraNegocioError } from '../../domain/rules/RegrasNegocio';
import {
  EstoqueRepository,
  MedicamentoRepository,
  TransferenciaRepository,
  UnidadeRepository,
} from '../../infrastructure/repositories';
import { AuditoriaService } from './AuditoriaService';

/**
 * Serviço de transferências entre unidades (RF13, RF14 — UC13/UC14).
 *
 * Aplica as regras RN01 (nível de segurança), RN03 (validade) e RN08 (proximidade).
 */
export class TransferenciaService {
  constructor(
    private readonly transferencias: TransferenciaRepository,
    private readonly estoques: EstoqueRepository,
    private readonly unidades: UnidadeRepository,
    private readonly medicamentos: MedicamentoRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(): Transferencia[] {
    return this.transferencias.listar();
  }

  listarSugeridas(): Transferencia[] {
    return this.transferencias.listarSugeridas();
  }

  /**
   * UC13 — gera sugestões de transferência entre unidades com excedente
   * (doadoras) e unidades em déficit (receptoras).
   */
  sugerir(): Transferencia[] {
    const sugestoes: Transferencia[] = [];

    for (const medicamento of this.medicamentos.listar()) {
      const estoquesDoMedicamento = this.estoques
        .listar()
        .filter((e) => e.medicamentoId === medicamento.id);

      // Disponibilidade "reservável" por estoque (evita sugerir a mesma sobra duas vezes).
      const disponibilidade = new Map<number, number>();
      for (const e of estoquesDoMedicamento) {
        const transferivel = this.temLoteTransferivel(e.lotes) ? e.excedenteSobreSeguranca() : 0;
        disponibilidade.set(e.id, transferivel);
      }

      const receptoras = estoquesDoMedicamento
        .filter((e) => e.deficitParaSeguranca() > 0)
        .sort((a, b) => b.deficitParaSeguranca() - a.deficitParaSeguranca());

      for (const receptora of receptoras) {
        const unidadeReceptora = this.unidades.buscarPorId(receptora.unidadeId);
        if (!unidadeReceptora) continue;
        let necessidade = receptora.deficitParaSeguranca();

        // RN08 — prioriza doadoras mais próximas.
        const doadoras = RegrasNegocio.ordenarPorProximidade(
          estoquesDoMedicamento.filter((e) => (disponibilidade.get(e.id) ?? 0) > 0),
          (e) => {
            const u = this.unidades.buscarPorId(e.unidadeId);
            return u ? u.endereco.distanciaAte(unidadeReceptora.endereco) : Number.MAX_SAFE_INTEGER;
          },
        );

        for (const doadora of doadoras) {
          if (necessidade <= 0) break;
          const disponivel = disponibilidade.get(doadora.id) ?? 0;
          if (disponivel <= 0) continue;
          const quantidade = Math.min(disponivel, necessidade);

          const sugestao = new Transferencia(
            this.transferencias.proximoId(),
            medicamento.id,
            doadora.unidadeId,
            receptora.unidadeId,
            quantidade,
          );
          this.transferencias.salvar(sugestao);
          sugestoes.push(sugestao);

          disponibilidade.set(doadora.id, disponivel - quantidade);
          necessidade -= quantidade;
        }
      }
    }
    return sugestoes;
  }

  /** UC14 — aprova uma transferência sugerida (valida RN01 e RN03). */
  aprovar(id: number, usuarioId: number): Transferencia {
    const transferencia = this.obterSugerida(id);
    const estoqueOrigem = this.estoques.buscarPorUnidadeEMedicamento(
      transferencia.unidadeOrigemId,
      transferencia.medicamentoId,
    );
    if (!estoqueOrigem) {
      throw new RegraNegocioError('RN01', 'Estoque de origem não encontrado.');
    }
    RegrasNegocio.validarRN01_OrigemAcimaDoSeguranca(estoqueOrigem, transferencia.quantidade);
    if (!this.temLoteTransferivel(estoqueOrigem.lotes)) {
      throw new RegraNegocioError('RN03', 'A origem não possui lote com validade igual ou superior a 90 dias.');
    }
    transferencia.aprovar();
    this.auditoria.registrar(usuarioId, 'APROVAR_TRANSFERENCIA', 'transferencia', `Transferência ${id}`, true);
    return transferencia;
  }

  /** UC14 — rejeita uma transferência sugerida. */
  rejeitar(id: number, justificativa: string, usuarioId: number): Transferencia {
    const transferencia = this.obterSugerida(id);
    transferencia.rejeitar(justificativa);
    this.auditoria.registrar(usuarioId, 'REJEITAR_TRANSFERENCIA', 'transferencia', `Transferência ${id}: ${justificativa}`, true);
    return transferencia;
  }

  private obterSugerida(id: number): Transferencia {
    const transferencia = this.transferencias.buscarPorId(id);
    if (!transferencia) throw new Error('Transferência não encontrada.');
    if (!transferencia.estaPendente()) throw new Error('Transferência não está pendente de aprovação.');
    return transferencia;
  }

  /** RN03 — há ao menos um lote com validade >= 90 dias. */
  private temLoteTransferivel(lotes: { podeSerTransferido: () => boolean }[]): boolean {
    if (lotes.length === 0) return true;
    return lotes.some((l) => l.podeSerTransferido());
  }
}
