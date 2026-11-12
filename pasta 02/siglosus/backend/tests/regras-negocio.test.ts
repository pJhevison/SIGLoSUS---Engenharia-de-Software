import { describe, expect, it } from 'vitest';
import { Estoque, Lote, Requisicao, Veiculo } from '../src/domain/entities';
import { StatusRequisicao } from '../src/domain/enums';
import { RegraNegocioError, RegrasNegocio } from '../src/domain/rules/RegrasNegocio';

const emDias = (dias: number): Date => new Date(Date.now() + dias * 86_400_000);

describe('Regras de Negócio (RN01–RN09)', () => {
  it('RN01 — impede transferência acima do excedente sobre o nível de segurança', () => {
    const estoque = new Estoque(1, 1, 1, 300, 100, 200); // excedente = 100
    expect(() => RegrasNegocio.validarRN01_OrigemAcimaDoSeguranca(estoque, 80)).not.toThrow();
    expect(() => RegrasNegocio.validarRN01_OrigemAcimaDoSeguranca(estoque, 150)).toThrow(RegraNegocioError);
  });

  it('RN02 — seleciona lotes por FEFO (o primeiro que expira sai primeiro)', () => {
    const loteLonge = new Lote(1, 'A', emDias(400), 100);
    const lotePerto = new Lote(2, 'B', emDias(30), 100);
    const selecionados = RegrasNegocio.selecionarLotesFEFO([loteLonge, lotePerto], 50);
    expect(selecionados[0].numeroLote).toBe('B');
  });

  it('RN02 — lança erro quando não há estoque suficiente', () => {
    const lote = new Lote(1, 'A', emDias(400), 10);
    expect(() => RegrasNegocio.selecionarLotesFEFO([lote], 50)).toThrow(RegraNegocioError);
  });

  it('RN03 — impede transferência de lote com validade inferior a 90 dias', () => {
    const perto = new Lote(1, 'P', emDias(30), 100);
    const longe = new Lote(2, 'L', emDias(120), 100);
    expect(() => RegrasNegocio.validarRN03_ValidadeMinima(perto)).toThrow(RegraNegocioError);
    expect(() => RegrasNegocio.validarRN03_ValidadeMinima(longe)).not.toThrow();
  });

  it('RN04 — unidade abaixo do mínimo tem prioridade máxima', () => {
    const critico = new Estoque(1, 1, 1, 50, 100, 200);
    const normal = new Estoque(2, 2, 1, 500, 100, 200);
    expect(RegrasNegocio.calcularPrioridadeRecebimento(critico)).toBe(100);
    expect(RegrasNegocio.calcularPrioridadeRecebimento(normal)).toBe(0);
  });

  it('RN05 — medicamento controlado exige conferência por dois responsáveis', () => {
    expect(() => RegrasNegocio.validarRN05_ConferenciaDupla(true, 1)).toThrow(RegraNegocioError);
    expect(() => RegrasNegocio.validarRN05_ConferenciaDupla(true, 2)).not.toThrow();
  });

  it('RN06 — medicamento da RENAME tem prioridade', () => {
    expect(RegrasNegocio.prioridadeRENAME(true)).toBe(1);
    expect(RegrasNegocio.prioridadeRENAME(false)).toBe(0);
  });

  it('RN07 — respeita a capacidade do veículo e a jornada do motorista', () => {
    const veiculo = new Veiculo(1, 'ABC-1234', 1000, 'Furgão');
    expect(() => RegrasNegocio.validarRN07_CapacidadeEJornada(veiculo, 800, 400)).not.toThrow();
    expect(() => RegrasNegocio.validarRN07_CapacidadeEJornada(veiculo, 1200, 400)).toThrow(RegraNegocioError);
    expect(() => RegrasNegocio.validarRN07_CapacidadeEJornada(veiculo, 800, 600)).toThrow(RegraNegocioError);
  });

  it('RN08 — ordena por proximidade', () => {
    const itens = [{ d: 10 }, { d: 2 }, { d: 5 }];
    const ordenados = RegrasNegocio.ordenarPorProximidade(itens, (i) => i.d);
    expect(ordenados.map((i) => i.d)).toEqual([2, 5, 10]);
  });

  it('RN09 — requisição acima do limite exige aprovação do gestor', () => {
    const requisicao = new Requisicao(1, 1, 1, 100, 8000, StatusRequisicao.PENDENTE);
    expect(() => RegrasNegocio.validarRN09_AprovacaoGestor(requisicao, 5000)).toThrow(RegraNegocioError);
    requisicao.aprovar();
    expect(() => RegrasNegocio.validarRN09_AprovacaoGestor(requisicao, 5000)).not.toThrow();
  });
});
