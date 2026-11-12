import { Router } from 'express';
import { Container } from '../../application/Container';
import { Usuario } from '../../domain/entities';
import { PerfilUsuario } from '../../domain/enums';
import { ErroNaoEncontrado } from '../../domain/errors';
import { ConfiguracaoSistema } from '../../patterns/singleton/ConfiguracaoSistema';
import { autenticar, autorizar, RequisicaoAutenticada, usuarioDaRequisicao } from './middleware/autenticacao';
import { limiteRequisicoes } from './middleware/seguranca';
import { idempotencia } from './middleware/idempotencia';

const PERFIS = PerfilUsuario;

/** Projeção pública do usuário: nunca expõe hash de senha nem CPF. */
function usuarioDTO(usuario: Usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
  };
}

/**
 * Definição das rotas REST da API do SIGLoSUS.
 *
 * Cada endpoint corresponde a um ou mais requisitos funcionais documentados
 * (ver seção 4 — Arquitetura — e README do backend).
 *
 * Regras de segurança aplicadas:
 * - todas as rotas privadas exigem token JWT válido (middleware `autenticar`);
 * - a identidade do usuário vem **do token**, nunca do corpo da requisição;
 * - a autorização por perfil é declarada explicitamente em cada operação
 *   sensível (`autorizar`).
 */
export function criarRotas(container: Container): Router {
  const router = Router();

  // ---- Saúde / configuração (Singleton) ----
  router.get('/health', (_req, res) => {
    const config = ConfiguracaoSistema.obterInstancia();
    res.json({
      status: 'ok',
      versao: config.obter('versao'),
      ambiente: config.obter('ambiente'),
      regras: ['RN01', 'RN02', 'RN03', 'RN04', 'RN05', 'RN06', 'RN07', 'RN08', 'RN09'],
      padroes: ['Singleton', 'Factory Method', 'Adapter', 'Observer', 'Strategy'],
      parametros: {
        limiteAprovacaoGestor: config.obter('limiteAprovacaoGestor'),
        validadeMinimaTransferenciaDias: config.obter('validadeMinimaTransferenciaDias'),
        jornadaMaximaMin: config.obter('jornadaMaximaMin'),
        tokenAcessoValidadeMin: config.obter('tokenAcessoValidadeMin'),
      },
    });
  });

  // ---- Autenticação (UC01 / RF01, RF02, RF03) ----
  const limiteLogin = limiteRequisicoes({
    maximo: ConfiguracaoSistema.obterInstancia().obter('limiteLoginPorMinuto'),
    janelaMs: 60_000,
    mensagem: 'Muitas tentativas de acesso. Aguarde um minuto antes de tentar novamente.',
  });

  router.post('/auth/login', limiteLogin, (req, res) => {
    const { identificador, senha } = req.body ?? {};
    const resultado = container.autenticacao.autenticar(identificador, senha);
    res.json({
      token: resultado.token,
      expiraEmSegundos: resultado.expiraEmSegundos,
      usuario: {
        id: resultado.usuario.id,
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
        perfil: resultado.usuario.perfil,
      },
    });
  });

  router.post(
    '/auth/recuperar-senha',
    limiteRequisicoes({
      maximo: Math.max(2, Math.ceil(ConfiguracaoSistema.obterInstancia().obter('limiteLoginPorMinuto') / 2)),
      janelaMs: 60_000,
      mensagem: 'Muitas solicitações de recuperação. Aguarde antes de tentar novamente.',
    }),
    (req, res) => {
      const resultado = container.recuperacaoSenha.solicitar(String(req.body?.email ?? ''));
      // A resposta é **idêntica** exista ou não a conta, para não revelar
      // quais e-mails estão cadastrados (RNF01 — confidencialidade).
      res.json({
        mensagem:
          'Se houver uma conta ativa para o e-mail informado, um token de recuperação válido foi gerado e enviado ao titular.',
        // Somente fora do ambiente de produção: em produção o token é enviado
        // por e-mail (serviço externo, fora do escopo do protótipo) e nunca
        // aparece na resposta.
        token: resultado.token,
        expiraEm: resultado.expiraEm,
      });
    },
  );

  router.post('/auth/redefinir-senha', limiteLogin, (req, res) => {
    const usuario = container.recuperacaoSenha.redefinir(
      String(req.body?.token ?? ''),
      String(req.body?.novaSenha ?? ''),
    );
    res.json({
      mensagem: 'Senha redefinida com sucesso. Autentique-se novamente.',
      usuario: usuarioDTO(usuario),
    });
  });

  // ---- Rotas privadas: exigem autenticação ----
  router.use(autenticar(container));

  router.post('/auth/logout', (req, res) => {
    const autenticada = req as RequisicaoAutenticada;
    container.autenticacao.encerrarSessao(autenticada.token, autenticada.usuario.id);
    res.json({ mensagem: 'Sessão encerrada.' });
  });

  router.get('/auth/eu', (req, res) => {
    res.json(usuarioDTO(usuarioDaRequisicao(req)));
  });

  router.post('/auth/trocar-senha', (req, res) => {
    const usuario = container.recuperacaoSenha.trocar(
      usuarioDaRequisicao(req),
      String(req.body?.senhaAtual ?? ''),
      String(req.body?.novaSenha ?? ''),
    );
    res.json({ mensagem: 'Senha alterada com sucesso.', usuario: usuarioDTO(usuario) });
  });

  // ---- Usuários (RF04) ----
  router.get('/usuarios', autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR), (_req, res) => {
    res.json(container.usuario.listar().map(usuarioDTO));
  });

  router.post('/usuarios', autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR), idempotencia(container), (req, res) => {
    const usuario = container.usuario.criar(req.body, usuarioDaRequisicao(req));
    res.status(201).json(usuarioDTO(usuario));
  });

  router.patch('/usuarios/:id', (req, res) => {
    const usuario = container.usuario.atualizar(
      Number(req.params.id),
      req.body ?? {},
      usuarioDaRequisicao(req),
    );
    res.json(usuarioDTO(usuario));
  });

  router.patch('/usuarios/:id/inativar', autorizar(PERFIS.ADMINISTRADOR), idempotencia(container), (req, res) => {
    const usuario = container.usuario.inativar(Number(req.params.id), usuarioDaRequisicao(req));
    res.json(usuarioDTO(usuario));
  });

  router.patch('/usuarios/:id/ativar', autorizar(PERFIS.ADMINISTRADOR), idempotencia(container), (req, res) => {
    const usuario = container.usuario.ativar(Number(req.params.id), usuarioDaRequisicao(req));
    res.json(usuarioDTO(usuario));
  });

  // ---- Cadastros: unidades de saúde (RF05) ----
  router.get('/unidades', (_req, res) => {
    res.json(container.unidade.listar());
  });

  router.post('/unidades', autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR), idempotencia(container), (req, res) => {
    const unidade = container.unidade.criar(req.body, usuarioDaRequisicao(req).id);
    res.status(201).json(unidade);
  });

  router.patch('/unidades/:id', autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR), idempotencia(container), (req, res) => {
    const unidade = container.unidade.atualizar(
      Number(req.params.id),
      req.body ?? {},
      usuarioDaRequisicao(req).id,
    );
    res.json(unidade);
  });

  // ---- Cadastros: catálogo de medicamentos (RF06) ----
  router.get('/medicamentos', (_req, res) => {
    res.json(container.medicamento.listar());
  });

  router.post('/medicamentos', autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR), idempotencia(container), (req, res) => {
    const medicamento = container.medicamento.criar(req.body, usuarioDaRequisicao(req).id);
    res.status(201).json(medicamento);
  });

  router.patch('/medicamentos/:id', autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR), idempotencia(container), (req, res) => {
    const medicamento = container.medicamento.atualizar(
      Number(req.params.id),
      req.body ?? {},
      usuarioDaRequisicao(req).id,
    );
    res.json(medicamento);
  });

  // ---- Estoque (RF08, RF09, RF10, RF18) ----
  router.get('/estoque', (req, res) => {
    const filtro = {
      unidadeId: req.query.unidadeId ? Number(req.query.unidadeId) : undefined,
      medicamentoId: req.query.medicamentoId ? Number(req.query.medicamentoId) : undefined,
      apenasCriticos: req.query.apenasCriticos === 'true',
    };
    res.json(container.estoque.consolidado(filtro));
  });

  router.get('/estoque/:id/movimentacoes', (req, res) => {
    res.json(container.estoque.movimentacoesDoEstoque(Number(req.params.id)));
  });

  router.post(
    '/estoque/movimentacoes',
    autorizar(PERFIS.FARMACEUTICO, PERFIS.ALMOXARIFE, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      const resultado = container.estoque.registrarMovimentacao({
        ...(req.body ?? {}),
        usuarioId: usuarioDaRequisicao(req).id,
      });
      res.status(201).json({
        movimentacao: resultado.movimentacao,
        estoque: { id: resultado.estoque.id, quantidadeAtual: resultado.estoque.quantidadeAtual },
      });
    },
  );

  router.patch(
    '/estoque/:id/niveis',
    autorizar(PERFIS.FARMACEUTICO, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      const { nivelMinimo, nivelSeguranca } = req.body ?? {};
      const estoque = container.estoque.configurarNiveis(
        Number(req.params.id),
        Number(nivelMinimo),
        Number(nivelSeguranca),
        usuarioDaRequisicao(req).id,
      );
      res.json(estoque);
    },
  );

  // ---- Alertas (RF11) ----
  router.get('/alertas', (_req, res) => {
    res.json(container.alerta.listar());
  });

  router.patch(
    '/alertas/:id/resolver',
    autorizar(PERFIS.FARMACEUTICO, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.json(container.alerta.resolver(Number(req.params.id)));
    },
  );

  // ---- Previsão de demanda (RF12) ----
  router.get('/previsoes', (_req, res) => {
    res.json(container.previsao.listar());
  });

  router.post(
    '/previsoes/gerar',
    autorizar(PERFIS.FARMACEUTICO, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      const periodo = Number(req.body?.periodoDias ?? 30);
      res.json(container.previsao.preverTodas(periodo));
    },
  );

  // ---- Transferências (RF13, RF14) ----
  router.get('/transferencias', (_req, res) => {
    res.json(container.transferencia.listar());
  });

  router.post(
    '/transferencias/sugerir',
    autorizar(PERFIS.FARMACEUTICO, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (_req, res) => {
      res.json(container.transferencia.sugerir());
    },
  );

  router.post(
    '/transferencias/:id/aprovar',
    autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.json(container.transferencia.aprovar(Number(req.params.id), usuarioDaRequisicao(req).id));
    },
  );

  router.post(
    '/transferencias/:id/rejeitar',
    autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.json(
        container.transferencia.rejeitar(
          Number(req.params.id),
          String(req.body?.justificativa ?? 'Sem justificativa'),
          usuarioDaRequisicao(req).id,
        ),
      );
    },
  );

  // ---- Dispensação ao paciente (RF19 / RN05) ----
  router.get('/dispensacoes', (req, res) => {
    const unidadeId = req.query.unidadeId ? Number(req.query.unidadeId) : undefined;
    res.json(container.dispensacao.listar(unidadeId));
  });

  router.post(
    '/dispensacoes',
    autorizar(PERFIS.FARMACEUTICO, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      const dispensacao = container.dispensacao.registrar({
        ...(req.body ?? {}),
        usuarioId: usuarioDaRequisicao(req).id,
      });
      res.status(201).json(dispensacao);
    },
  );

  // ---- Requisições de medicamentos (RF20 / RN09) ----
  router.get('/requisicoes', (_req, res) => {
    res.json(container.requisicao.listar());
  });

  router.post(
    '/requisicoes',
    autorizar(PERFIS.FARMACEUTICO, PERFIS.ALMOXARIFE, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      const requisicao = container.requisicao.criar({
        ...(req.body ?? {}),
        usuarioId: usuarioDaRequisicao(req).id,
      });
      res.status(201).json(requisicao);
    },
  );

  router.post(
    '/requisicoes/:id/aprovar',
    autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.json(container.requisicao.aprovar(Number(req.params.id), usuarioDaRequisicao(req).id));
    },
  );

  router.post(
    '/requisicoes/:id/rejeitar',
    autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.json(
        container.requisicao.rejeitar(
          Number(req.params.id),
          String(req.body?.justificativa ?? 'Sem justificativa'),
          usuarioDaRequisicao(req).id,
        ),
      );
    },
  );

  // ---- Rotas de distribuição (RF15, RF16) ----
  router.get('/rotas', (_req, res) => {
    res.json(container.rota.listar());
  });

  router.get('/rotas/estrategias', (_req, res) => {
    res.json(container.rota.estrategiasDisponiveis());
  });

  router.get('/rotas/:id', (req, res) => {
    const rota = container.rota.buscar(Number(req.params.id));
    if (!rota) throw new ErroNaoEncontrado('Rota não encontrada.');
    res.json(rota);
  });

  router.post(
    '/rotas',
    autorizar(PERFIS.ALMOXARIFE, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.status(201).json(
        container.rota.gerarRota({ ...(req.body ?? {}), usuarioId: usuarioDaRequisicao(req).id }),
      );
    },
  );

  router.post(
    '/rotas/:id/despachar',
    autorizar(PERFIS.ALMOXARIFE, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.json(container.entrega.despachar(Number(req.params.id), usuarioDaRequisicao(req).id));
    },
  );

  // ---- Rastreamento de rota (RF16) ----
  router.get(
    '/rotas/:id/posicoes',
    autorizar(PERFIS.MOTORISTA, PERFIS.ALMOXARIFE, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    (req, res) => {
      res.json(container.posicao.listar(Number(req.params.id)));
    },
  );

  router.post(
    '/rotas/:id/posicoes',
    autorizar(PERFIS.MOTORISTA, PERFIS.ALMOXARIFE, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      const posicao = container.posicao.registrar({
        rotaId: Number(req.params.id),
        latitude: Number(req.body?.latitude),
        longitude: Number(req.body?.longitude),
        velocidadeKmh: req.body?.velocidadeKmh,
        usuarioId: usuarioDaRequisicao(req).id,
      });
      res.status(201).json(posicao);
    },
  );

  // ---- Entregas (RF17 / UC18) ----
  router.get('/entregas', (_req, res) => {
    res.json(container.entrega.listar());
  });

  router.get('/entregas/rota/:rotaId', (req, res) => {
    res.json(container.entrega.listarPorRota(Number(req.params.rotaId)));
  });

  router.post(
    '/entregas/:id/confirmar',
    autorizar(PERFIS.FARMACEUTICO, PERFIS.ALMOXARIFE, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.json(
        container.entrega.confirmarRecebimento(Number(req.params.id), {
          ...(req.body ?? {}),
          usuarioId: usuarioDaRequisicao(req).id,
        }),
      );
    },
  );

  // ---- Integrações (RF07 / UC07) ----
  router.get('/integracoes', (_req, res) => {
    res.json({
      configuradas: container.integracao.listar(),
      adaptadores: container.integracao.adaptersDisponiveis(),
    });
  });

  router.post(
    '/integracoes/sincronizar',
    autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.json(
        container.integracao.sincronizar(usuarioDaRequisicao(req).id, req.body?.sistema),
      );
    },
  );

  // ---- Relatórios (RF21) ----
  router.get('/relatorios/dashboard', (_req, res) => {
    res.json(container.relatorio.dashboard());
  });

  router.get('/relatorios', (_req, res) => {
    res.json(container.relatorio.listar());
  });

  router.post(
    '/relatorios',
    autorizar(PERFIS.FARMACEUTICO, PERFIS.GESTOR, PERFIS.ADMINISTRADOR),
    idempotencia(container),
    (req, res) => {
      res.status(201).json(
        container.relatorio.gerar(String(req.body?.tipo ?? 'geral'), usuarioDaRequisicao(req).id),
      );
    },
  );

  // ---- Auditoria (RF22) ----
  router.get('/auditoria', autorizar(PERFIS.GESTOR, PERFIS.ADMINISTRADOR), (_req, res) => {
    res.json(container.auditoria.listar());
  });

  return router;
}
