import { beforeEach, describe, expect, it } from 'vitest';
import { Container } from '../src/application/Container';
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
