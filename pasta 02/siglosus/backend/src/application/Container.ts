import { DatabaseMemoria } from '../infrastructure/database/DatabaseMemoria';
import { popularBanco } from '../infrastructure/seed/SeedData';
import {
  AlertaRepository,
  AuditoriaRepository,
  DispensacaoRepository,
  EntregaRepository,
  EstoqueRepository,
  IntegracaoRepository,
  MedicamentoRepository,
  MovimentacaoRepository,
  PrevisaoRepository,
  RelatorioRepository,
  RequisicaoRepository,
  RotaRepository,
  TransferenciaRepository,
  UnidadeRepository,
  UsuarioRepository,
  VeiculoRepository,
} from '../infrastructure/repositories';
import { TipoNotificacao } from '../domain/enums';
import { AlertaDesabastecimentoObserver } from '../patterns/observer/AlertaDesabastecimentoObserver';
import { EstoqueSubject } from '../patterns/observer/EstoqueSubject';
import { NotificacaoEstoqueObserver } from '../patterns/observer/NotificacaoEstoqueObserver';
import { AlertaService } from './services/AlertaService';
import { AuditoriaService } from './services/AuditoriaService';
import { AutenticacaoService } from './services/AutenticacaoService';
import { EntregaService } from './services/EntregaService';
import { EstoqueService } from './services/EstoqueService';
import { IntegracaoService } from './services/IntegracaoService';
import { PrevisaoDemandaService } from './services/PrevisaoDemandaService';
import { RelatorioService } from './services/RelatorioService';
import { RotaService } from './services/RotaService';
import { TransferenciaService } from './services/TransferenciaService';
import { UsuarioService } from './services/UsuarioService';

/**
 * Container de injeção de dependências (composition root).
 *
 * Monta o grafo de objetos da aplicação: banco em memória, repositórios,
 * observadores (Observer) e serviços. É o único ponto que conhece as classes
 * concretas — o restante depende apenas de abstrações.
 */
export class Container {
  readonly db = new DatabaseMemoria();

  // Repositórios (Repository)
  readonly usuarios = new UsuarioRepository(this.db);
  readonly unidades = new UnidadeRepository(this.db);
  readonly medicamentos = new MedicamentoRepository(this.db);
  readonly estoques = new EstoqueRepository(this.db);
  readonly movimentacoes = new MovimentacaoRepository(this.db);
  readonly alertas = new AlertaRepository(this.db);
  readonly previsoes = new PrevisaoRepository(this.db);
  readonly dispensacoes = new DispensacaoRepository(this.db);
  readonly transferencias = new TransferenciaRepository(this.db);
  readonly requisicoes = new RequisicaoRepository(this.db);
  readonly rotas = new RotaRepository(this.db);
  readonly veiculos = new VeiculoRepository(this.db);
  readonly entregas = new EntregaRepository(this.db);
  readonly integracoes = new IntegracaoRepository(this.db);
  readonly relatorios = new RelatorioRepository(this.db);
  readonly auditoriaRepo = new AuditoriaRepository(this.db);

  // Observer (Subject)
  readonly estoqueSubject = new EstoqueSubject();
  readonly notificacaoObserver = new NotificacaoEstoqueObserver(TipoNotificacao.EMAIL);

  // Serviços (camada de aplicação)
  readonly auditoria: AuditoriaService;
  readonly alerta: AlertaService;
  readonly autenticacao: AutenticacaoService;
  readonly estoque: EstoqueService;
  readonly previsao: PrevisaoDemandaService;
  readonly transferencia: TransferenciaService;
  readonly rota: RotaService;
  readonly entrega: EntregaService;
  readonly integracao: IntegracaoService;
  readonly relatorio: RelatorioService;
  readonly usuario: UsuarioService;

  constructor() {
    this.auditoria = new AuditoriaService(this.auditoriaRepo);
    this.alerta = new AlertaService(this.alertas);

    // Registra os observadores que reagem a movimentações de estoque.
    this.estoqueSubject.registrarObservador(new AlertaDesabastecimentoObserver(this.alerta));
    this.estoqueSubject.registrarObservador(this.notificacaoObserver);

    this.autenticacao = new AutenticacaoService(this.usuarios, this.auditoria);
    this.estoque = new EstoqueService(
      this.estoques,
      this.movimentacoes,
      this.medicamentos,
      this.unidades,
      this.estoqueSubject,
      this.auditoria,
    );
    this.previsao = new PrevisaoDemandaService(this.estoques, this.previsoes, this.movimentacoes);
    this.transferencia = new TransferenciaService(
      this.transferencias,
      this.estoques,
      this.unidades,
      this.medicamentos,
      this.auditoria,
    );
    this.rota = new RotaService(this.rotas, this.veiculos, this.unidades, this.estoques, this.auditoria);
    this.entrega = new EntregaService(this.entregas, this.rotas, this.estoque, this.auditoria);
    this.integracao = new IntegracaoService(
      this.integracoes,
      this.unidades,
      this.medicamentos,
      this.estoques,
      this.estoque,
      this.auditoria,
    );
    this.relatorio = new RelatorioService(
      this.relatorios,
      this.estoques,
      this.unidades,
      this.alertas,
      this.entregas,
    );
    this.usuario = new UsuarioService(this.usuarios, this.auditoria);

    popularBanco(this.db);
  }

  /** Recria o cenário inicial (usado nos testes). */
  reiniciar(): void {
    this.db.limpar();
    this.notificacaoObserver.limpar();
    popularBanco(this.db);
  }
}
