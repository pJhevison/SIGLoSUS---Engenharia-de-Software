import { beforeEach, describe, expect, it } from 'vitest';
import { Container } from '../src/application/Container';
import { Estoque, Lote } from '../src/domain/entities';
import { TipoMovimentacao } from '../src/domain/enums';

describe('Serviços da aplicação (integração)', () => {
  let c: Container;

  beforeEach(() => {
    c = new Container();
  });

  it('autentica com credenciais válidas e registra auditoria', () => {
    const resultado = c.autenticacao.autenticar('gestor@siglosus.gov.br', 'siglosus123');
    expect(resultado.usuario.perfil).toBe('GESTOR');
    expect(resultado.token).toBeTruthy();
    expect(c.auditoria.listar().length).toBeGreaterThan(0);
  });

  it('recusa credenciais inválidas', () => {
    expect(() => c.autenticacao.autenticar('gestor@siglosus.gov.br', 'senha-errada')).toThrow();
  });

  it('gera alerta quando o estoque cai abaixo do mínimo (Observer + Factory)', () => {
    const estoque = c.estoques.buscarPorUnidadeEMedicamento(2, 2)!; // Losartana na UBS Central
    const antes = c.alerta.listar().length;
    c.estoque.registrarMovimentacao({
      estoqueId: estoque.id,
      tipo: TipoMovimentacao.SAIDA,
      quantidade: 5,
      usuarioId: 1,
    });
    expect(c.alerta.listar().length).toBeGreaterThan(antes);
    expect(c.notificacaoObserver.notificacoesEnviadas.length).toBeGreaterThan(0);
  });

  it('sugere transferências e aprova respeitando as regras de negócio', () => {
    const sugestoes = c.transferencia.sugerir();
    expect(sugestoes.length).toBeGreaterThan(0);
    const aprovada = c.transferencia.aprovar(sugestoes[0].id, 2);
    expect(aprovada.status).toBe('APROVADA');
  });

  it('gera rota com Strategy e valida RN07', () => {
    const rota = c.rota.gerarRota({
      veiculoId: 1,
      unidadesDestinoIds: [2, 3, 4],
      estrategia: 'MENOR_DISTANCIA',
      usuarioId: 2,
    });
    expect(rota.paradas.length).toBe(3);
    expect(rota.distanciaTotalKm).toBeGreaterThanOrEqual(0);
  });

  it('RF14/RF17 — baixa na origem na aprovação e crédito no destino no recebimento', () => {
    const sugestoes = c.transferencia.sugerir();
    const transferencia = sugestoes.find((t) => t.unidadeDestinoId === 2)!;
    expect(transferencia).toBeDefined();

    const origem = c.estoques.buscarPorUnidadeEMedicamento(
      transferencia.unidadeOrigemId,
      transferencia.medicamentoId,
    )!;
    const origemAntes = origem.quantidadeAtual;
    c.transferencia.aprovar(transferencia.id, 2);
    expect(origem.quantidadeAtual).toBe(origemAntes - transferencia.quantidade);

    const rota = c.rota.gerarRota({ veiculoId: 1, unidadesDestinoIds: [2], usuarioId: 2 });
    const [entrega] = c.entrega.despachar(rota.id, 2);
    const item = entrega.itens.find((i) => i.transferenciaId === transferencia.id);
    expect(item).toBeDefined();
    expect(item!.medicamentoId).toBe(transferencia.medicamentoId);

    const destino = c.estoques.buscarPorUnidadeEMedicamento(2, transferencia.medicamentoId)!;
    const destinoAntes = destino.quantidadeAtual;
    c.entrega.confirmarRecebimento(entrega.id, { usuarioId: 3 });

    expect(destino.quantidadeAtual).toBe(destinoAntes + transferencia.quantidade);
    expect(c.transferencias.buscarPorId(transferencia.id)!.status).toBe('CONCLUIDA');
    expect(rota.status).toBe('CONCLUIDA');
    expect(() => c.entrega.confirmarRecebimento(entrega.id, { usuarioId: 3 })).toThrow();
  });

  it('RN06 — rota por prioridade desempata a favor do medicamento da RENAME', () => {
    const rota = c.rota.gerarRota({
      veiculoId: 1,
      unidadesDestinoIds: [3, 2],
      estrategia: 'PRIORIDADE',
      usuarioId: 2,
    });
    // Unidade 2 (Losartana, RENAME, abaixo do mínimo) supera a unidade 3
    // (Amoxicilina, não RENAME, abaixo do mínimo).
    expect(rota.paradas[0].unidade.id).toBe(2);
  });

  it('RF19/RN05 — controlado exige lote e dois conferentes, com baixa no lote', () => {
    const lote = new Lote(c.db.proximoId('lotes'), 'CL-01', new Date(Date.now() + 180 * 86_400_000), 10);
    const estoque = new Estoque(c.estoques.proximoId(), 2, 6, 10, 0, 0, [lote]);
    c.estoques.salvar(estoque);

    expect(() =>
      c.dispensacao.registrar({
        unidadeId: 2,
        medicamentoId: 6,
        loteId: lote.id,
        quantidade: 2,
        conferentes: 1,
        usuarioId: 3,
      }),
    ).toThrow(/RN05/);

    const dispensacao = c.dispensacao.registrar({
      unidadeId: 2,
      medicamentoId: 6,
      loteId: lote.id,
      quantidade: 2,
      conferentes: 2,
      usuarioId: 3,
    });
    expect(dispensacao.quantidade).toBe(2);
    expect(lote.quantidade).toBe(8);
    expect(estoque.quantidadeAtual).toBe(8);
  });

  it('RF19/RN05 — medicamento não controlado dispensa segundo conferente', () => {
    const dispensacao = c.dispensacao.registrar({
      unidadeId: 2,
      medicamentoId: 1,
      quantidade: 5,
      usuarioId: 3,
    });
    expect(dispensacao.quantidade).toBe(5);
    expect(c.dispensacao.listar(2).some((d) => d.id === dispensacao.id)).toBe(true);
  });

  it('RN09 — requisição acima do limite exige gestor; baixo valor dispensa', () => {
    const alta = c.requisicao.criar({
      unidadeSolicitanteId: 2,
      medicamentoId: 2,
      quantidade: 100,
      valorEstimado: 8000,
      usuarioId: 3,
    });
    expect(() => c.requisicao.aprovar(alta.id, 3)).toThrow(/RN09/);
    expect(alta.status).toBe('PENDENTE');
    expect(c.requisicao.aprovar(alta.id, 2).status).toBe('APROVADA');

    const baixa = c.requisicao.criar({
      unidadeSolicitanteId: 2,
      medicamentoId: 1,
      quantidade: 10,
      valorEstimado: 500,
      usuarioId: 3,
    });
    expect(c.requisicao.aprovar(baixa.id, 3).status).toBe('APROVADA');
  });

  it('despacha rota e confirma recebimento atualizando o estoque', () => {
    const rota = c.rota.gerarRota({ veiculoId: 1, unidadesDestinoIds: [2, 4], usuarioId: 2 });
    const entregas = c.entrega.despachar(rota.id, 2);
    expect(entregas.length).toBe(2);

    const estoqueDestino = c.estoques.buscarPorUnidadeEMedicamento(2, 1)!;
    const quantidadeAntes = estoqueDestino.quantidadeAtual;
    c.entrega.confirmarRecebimento(entregas[0].id, {
      usuarioId: 3,
      itens: [{ estoqueId: estoqueDestino.id, quantidade: 50 }],
    });
    expect(estoqueDestino.quantidadeAtual).toBe(quantidadeAntes + 50);
  });

  it('sincroniza com os sistemas externos via Adapter', () => {
    const resultados = c.integracao.sincronizar(1);
    expect(resultados).toHaveLength(3);
    expect(resultados[0].atualizados).toBeGreaterThan(0);
  });

  it('gera previsão de demanda', () => {
    const previsao = c.previsao.prever(2, 2, 30);
    expect(previsao.quantidadePrevista).toBeGreaterThanOrEqual(0);
    expect(previsao.periodo).toBe('30 dias');
  });

  it('produz o painel gerencial (dashboard)', () => {
    const painel = c.relatorio.dashboard();
    expect(painel.unidadesAtendidas).toBeGreaterThan(0);
    expect(painel).toHaveProperty('itensCriticos');
    expect(painel).toHaveProperty('alertasAbertos');
  });
});
