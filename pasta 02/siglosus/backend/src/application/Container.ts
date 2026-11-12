import { DatabaseMemoria } from '../infrastructure/database/DatabaseMemoria';
import { PersistenciaJSON } from '../infrastructure/database/PersistenciaJSON';
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
  PosicaoRotaRepository,
  PrevisaoRepository,
  RelatorioRepository,
  RequisicaoRepository,
  RotaRepository,
  TokenRecuperacaoRepository,
  TransferenciaRepository,
  UnidadeRepository,
  UsuarioRepository,
  VeiculoRepository,
} from '../infrastructure/repositories';
import { GerenciadorJWT } from '../infrastructure/security/GerenciadorJWT';
import { TipoNotificacao } from '../domain/enums';
import { AlertaDesabastecimentoObserver } from '../patterns/observer/AlertaDesabastecimentoObserver';
import { EstoqueSubject } from '../patterns/observer/EstoqueSubject';
import { NotificacaoEstoqueObserver } from '../patterns/observer/NotificacaoEstoqueObserver';
import { ConfiguracaoSistema } from '../patterns/singleton/ConfiguracaoSistema';
import { AlertaService } from './services/AlertaService';
import { AuditoriaService } from './services/AuditoriaService';
import { AutenticacaoService } from './services/AutenticacaoService';
import { DispensacaoService } from './services/DispensacaoService';
import { EntregaService } from './services/EntregaService';
import { EstoqueService } from './services/EstoqueService';
import { IntegracaoService } from './services/IntegracaoService';
import { MedicamentoService } from './services/MedicamentoService';
import { PosicaoService } from './services/PosicaoService';
import { PrevisaoDemandaService } from './services/PrevisaoDemandaService';
import { RecuperacaoSenhaService } from './services/RecuperacaoSenhaService';
import { RelatorioService } from './services/RelatorioService';
import { RequisicaoService } from './services/RequisicaoService';
import { RotaService } from './services/RotaService';
import { TransferenciaService } from './services/TransferenciaService';
import { UnidadeService } from './services/UnidadeService';
import { UsuarioService } from './services/UsuarioService';

export interface OpcoesContainer {
  /**
   * Caminho do arquivo de persistência. Quando informado, o estado do banco
   * é carregado do arquivo (se existir) e gravado após cada operação de
   * escrita, de modo que os dados sobrevivem ao reinício do processo.
   */
  arquivoPersistencia?: string | null;
  /** Quando `true`, o cenário de demonstração é carregado mesmo havendo arquivo salvo. */
  forcarSeed?: boolean;
}

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
  readonly tokensRecuperacao = new TokenRecuperacaoRepository(this.db);
  readonly posicoes = new PosicaoRotaRepository(this.db);

  // Observer (Subject)
  readonly estoqueSubject = new EstoqueSubject();
  readonly notificacaoObserver = new NotificacaoEstoqueObserver(TipoNotificacao.EMAIL);

  // Segurança
  readonly jwt: GerenciadorJWT;

  // Serviços (camada de aplicação)
  readonly auditoria: AuditoriaService;
  readonly alerta: AlertaService;
  readonly autenticacao: AutenticacaoService;
  readonly recuperacaoSenha: RecuperacaoSenhaService;
  readonly estoque: EstoqueService;
  readonly dispensacao: DispensacaoService;
  readonly previsao: PrevisaoDemandaService;
  readonly transferencia: TransferenciaService;
  readonly requisicao: RequisicaoService;
  readonly rota: RotaService;
  readonly entrega: EntregaService;
  readonly integracao: IntegracaoService;
  readonly relatorio: RelatorioService;
  readonly usuario: UsuarioService;
  readonly unidade: UnidadeService;
  readonly medicamento: MedicamentoService;
  readonly posicao: PosicaoService;

  /** Persistência em arquivo (null = somente em memória). */
  readonly persistencia: PersistenciaJSON | null;

  constructor(opcoes: OpcoesContainer = {}) {
    const configuracao = ConfiguracaoSistema.obterInstancia();
    this.jwt = new GerenciadorJWT({
      segredo: configuracao.obter('segredoJwt'),
      expiraEmMinutos: configuracao.obter('tokenAcessoValidadeMin'),
      emissor: 'siglosus',
    });

    this.auditoria = new AuditoriaService(this.auditoriaRepo);
    this.alerta = new AlertaService(this.alertas);

    // Registra os observadores que reagem a movimentações de estoque.
    this.estoqueSubject.registrarObservador(new AlertaDesabastecimentoObserver(this.alerta));
    this.estoqueSubject.registrarObservador(this.notificacaoObserver);

    this.autenticacao = new AutenticacaoService(this.usuarios, this.auditoria, this.jwt);
    this.recuperacaoSenha = new RecuperacaoSenhaService(
      this.usuarios,
      this.tokensRecuperacao,
      this.auditoria,
    );
    this.estoque = new EstoqueService(
      this.estoques,
      this.movimentacoes,
      this.medicamentos,
      this.unidades,
      this.estoqueSubject,
      this.auditoria,
    );
    this.dispensacao = new DispensacaoService(
      this.dispensacoes,
      this.estoques,
      this.medicamentos,
      this.unidades,
      this.estoque,
      this.auditoria,
    );
    this.previsao = new PrevisaoDemandaService(this.estoques, this.previsoes, this.movimentacoes);
    this.transferencia = new TransferenciaService(
      this.transferencias,
      this.estoques,
      this.unidades,
      this.medicamentos,
      this.estoque,
      this.auditoria,
    );
    this.requisicao = new RequisicaoService(
      this.requisicoes,
      this.unidades,
      this.medicamentos,
      this.usuarios,
      this.auditoria,
    );
    this.rota = new RotaService(
      this.rotas,
      this.veiculos,
      this.unidades,
      this.estoques,
      this.medicamentos,
      this.auditoria,
    );
    this.entrega = new EntregaService(
      this.entregas,
      this.rotas,
      this.transferencias,
      this.estoque,
      this.auditoria,
    );
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
    this.unidade = new UnidadeService(this.unidades, this.auditoria);
    this.medicamento = new MedicamentoService(this.medicamentos, this.auditoria);
    this.posicao = new PosicaoService(this.posicoes, this.rotas, this.auditoria);

    const arquivo = opcoes.arquivoPersistencia ?? null;
    this.persistencia = arquivo ? new PersistenciaJSON(arquivo) : null;

    const carregou = this.persistencia && !opcoes.forcarSeed ? this.persistencia.carregar(this.db) : false;
    if (!carregou) {
      popularBanco(this.db);
      this.persistir();
    }
  }

  /** Grava o estado atual em arquivo (quando a persistência está ativa). */
  persistir(): void {
    if (this.persistencia) {
      this.persistencia.persistir(this.db);
    }
  }

  /** Recria o cenário inicial (usado nos testes). */
  reiniciar(): void {
    this.db.limpar();
    this.notificacaoObserver.limpar();
    popularBanco(this.db);
    this.persistir();
  }
}
