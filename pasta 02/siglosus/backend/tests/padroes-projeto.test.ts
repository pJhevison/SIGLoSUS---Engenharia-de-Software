import { describe, expect, it } from 'vitest';
import { Endereco, UnidadeSaude } from '../src/domain/entities';
import { TipoNotificacao, TipoUnidade } from '../src/domain/enums';
import { ESUSAPSAdapter } from '../src/patterns/adapter/ESUSAPSAdapter';
import { HorusAdapter } from '../src/patterns/adapter/HorusAdapter';
import { obterFabricaNotificacao } from '../src/patterns/factory/NotificacaoFactory';
import { EstoqueSubject, EventoEstoque, ObservadorEstoque } from '../src/patterns/observer/EstoqueSubject';
import {
  PontoEntrega,
  RotaMenorDistancia,
  RotaPorPrioridade,
  Roteirizador,
} from '../src/patterns/strategy/EstrategiaRoteirizacao';
import { ConfiguracaoSistema } from '../src/patterns/singleton/ConfiguracaoSistema';

const unidade = (id: number, lat: number, lon: number) =>
  new UnidadeSaude(id, `Unidade ${id}`, TipoUnidade.UBS, String(id), new Endereco('R', '1', 'C', 'AM', '0', lat, lon));

describe('Padrões de Projeto', () => {
  describe('Singleton — ConfiguracaoSistema', () => {
    it('devolve sempre a mesma instância', () => {
      ConfiguracaoSistema.reiniciar();
      const a = ConfiguracaoSistema.obterInstancia();
      const b = ConfiguracaoSistema.obterInstancia();
      expect(a).toBe(b);
    });

    it('mantém o estado compartilhado entre acessos', () => {
      ConfiguracaoSistema.reiniciar();
      ConfiguracaoSistema.obterInstancia().definir('limiteAprovacaoGestor', 9999);
      expect(ConfiguracaoSistema.obterInstancia().obter('limiteAprovacaoGestor')).toBe(9999);
    });
  });

  describe('Factory Method — NotificacaoFactory', () => {
    it('cria o canal correto conforme o tipo', () => {
      expect(obterFabricaNotificacao(TipoNotificacao.EMAIL).notificar('a@b.com', 'oi').canal).toBe(TipoNotificacao.EMAIL);
      expect(obterFabricaNotificacao(TipoNotificacao.SMS).notificar('+55', 'oi').canal).toBe(TipoNotificacao.SMS);
      expect(obterFabricaNotificacao(TipoNotificacao.PUSH).notificar('dev', 'oi').canal).toBe(TipoNotificacao.PUSH);
    });
  });

  describe('Adapter — integração com sistemas externos', () => {
    it('converte o formato do e-SUS APS para o modelo interno', () => {
      const registros = new ESUSAPSAdapter().obterEstoque();
      expect(registros[0]).toHaveProperty('codigoCATMAT');
      expect(registros[0]).toHaveProperty('cnesUnidade');
      expect(registros[0].validade).toBeInstanceOf(Date);
    });

    it('converte o formato do HÓRUS para o modelo interno', () => {
      const registros = new HorusAdapter().obterEstoque();
      expect(registros.length).toBeGreaterThan(0);
      expect(registros[0].validade).toBeInstanceOf(Date);
    });
  });

  describe('Observer — EstoqueSubject', () => {
    it('notifica todos os observadores registrados', () => {
      const subject = new EstoqueSubject();
      let notificacoes = 0;
      const observador: ObservadorEstoque = {
        nome: 'Teste',
        atualizar: () => {
          notificacoes++;
        },
      };
      subject.registrarObservador(observador);
      subject.notificar({} as unknown as EventoEstoque);
      expect(notificacoes).toBe(1);
      expect(subject.listarObservadores()).toContain('Teste');
    });
  });

  describe('Strategy — roteirização', () => {
    const origem = unidade(0, 0, 0);
    const pontos: PontoEntrega[] = [
      { unidade: unidade(1, 0.1, 0.1), prioridade: 0, pesoKg: 10 },
      { unidade: unidade(2, 5, 5), prioridade: 100, pesoKg: 10 },
    ];

    it('troca de algoritmo em tempo de execução', () => {
      const roteirizador = new Roteirizador(new RotaPorPrioridade());
      const porPrioridade = roteirizador.gerarRota(origem, pontos);
      expect(porPrioridade[0].unidade.id).toBe(2);

      roteirizador.definirEstrategia(new RotaMenorDistancia());
      const porDistancia = roteirizador.gerarRota(origem, pontos);
      expect(porDistancia[0].unidade.id).toBe(1);
      expect(roteirizador.estrategiaAtual).toBe('MENOR_DISTANCIA');
    });
  });
});
