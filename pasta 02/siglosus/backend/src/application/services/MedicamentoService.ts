import { Medicamento } from '../../domain/entities';
import { ErroConflito, ErroNaoEncontrado, ErroValidacao } from '../../domain/errors';
import { MedicamentoRepository } from '../../infrastructure/repositories';
import { AuditoriaService } from './AuditoriaService';

export interface DadosMedicamento {
  nome: string;
  principioAtivo: string;
  apresentacao: string;
  codigoCATMAT: string;
  controlado?: boolean;
  rename?: boolean;
}

/**
 * ServiÃ§o de cadastro e manutenÃ§Ã£o do catÃ¡logo de medicamentos (RF06).
 *
 * CatÃ¡logo com nome, princÃ­pio ativo, apresentaÃ§Ã£o, cÃ³digo CATMAT e indicaÃ§Ã£o
 * de medicamento controlado (RN05) e de integraÃ§Ã£o na RENAME (RN06).
 */
export class MedicamentoService {
  constructor(
    private readonly medicamentos: MedicamentoRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(): Medicamento[] {
    return this.medicamentos.listar();
  }

  buscar(id: number): Medicamento {
    const medicamento = this.medicamentos.buscarPorId(id);
    if (!medicamento) throw new ErroNaoEncontrado('Medicamento nÃ£o encontrado.');
    return medicamento;
  }

  private validar(dados: Partial<DadosMedicamento>): void {
    if (dados.nome !== undefined && String(dados.nome).trim().length < 3) {
      throw new ErroValidacao('O nome do medicamento deve ter ao menos 3 caracteres.');
    }
    if (dados.principioAtivo !== undefined && String(dados.principioAtivo).trim().length < 3) {
      throw new ErroValidacao('O princÃ­pio ativo deve ter ao menos 3 caracteres.');
    }
    if (dados.codigoCATMAT !== undefined) {
      const codigo = String(dados.codigoCATMAT).trim().toUpperCase();
      if (!/^[A-Z0-9]{6,20}$/.test(codigo)) {
        throw new ErroValidacao('O cÃ³digo CATMAT deve ter de 6 a 20 caracteres alfanumÃ©ricos.');
      }
    }
  }

  criar(dados: DadosMedicamento, usuarioId: number): Medicamento {
    this.validar(dados);
    const codigo = String(dados.codigoCATMAT ?? '').trim().toUpperCase();
    if (this.medicamentos.buscarPorCATMAT(codigo)) {
      throw new ErroConflito('JÃ¡ existe um medicamento com este cÃ³digo CATMAT.');
    }
    const medicamento = new Medicamento(
      this.medicamentos.proximoId(),
      String(dados.nome).trim(),
      String(valorOuVazio(dados.principioAtivo)).trim(),
      String(dados.apresentacao ?? '').trim(),
      codigo,
      Boolean(dados.controlado ?? false),
      Boolean(dados.rename ?? false),
    );
    this.medicamentos.salvar(medicamento);
    this.auditoria.registrar(
      usuarioId,
      'CRIAR_MEDICAMENTO',
      'medicamento',
      `${medicamento.nome} (${codigo})`,
      true,
    );
    return medicamento;
  }

  /** ManutenÃ§Ã£o do catÃ¡logo. */
  atualizar(id: number, dados: Partial<DadosMedicamento>, usuarioId: number): Medicamento {
    const medicamento = this.buscar(id);
    this.validar(dados);

    if (dados.nome !== undefined) medicamento.nome = String(dados.nome).trim();
    if (dados.principioAtivo !== undefined) {
      medicamento.principioAtivo = String(dados.principioAtivo).trim();
    }
    if (dados.apresentacao !== undefined) medicamento.apresentacao = String(dados.apresentacao).trim();
    if (dados.codigoCATMAT !== undefined) {
      const codigo = String(valorOuVazio(dados.codigoCATMAT)).trim().toUpperCase();
      const existente = this.medicamentos.buscarPorCATMAT(codigo);
      if (existente && existente.id !== medicamento.id) {
        throw new ErroConflito('JÃ¡ existe um medicamento com este cÃ³digo CATMAT.');
      }
      medicamento.codigoCATMAT = codigo;
    }
    if (dados.controlado !== undefined) medicamento.controlado = Boolean(dados.controlado);
    if (dados.rename !== undefined) medicamento.rename = Boolean(dados.rename);

    this.auditoria.registrar(
      usuarioId,
      'ATUALIZAR_MEDICAMENTO',
      'medicamento',
      medicamento.nome,
      true,
    );
    return medicamento;
  }
}

/** Normaliza valores possivelmente indefinidos. */
function valorOuVazio(valor: string | undefined): string {
  return valor === undefined || valor === null ? '' : String(valor);
}

