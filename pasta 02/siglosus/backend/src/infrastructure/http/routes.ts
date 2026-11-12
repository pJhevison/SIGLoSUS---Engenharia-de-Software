import { Router } from 'express';
import { Container } from '../../application/Container';
import { ConfiguracaoSistema } from '../../patterns/singleton/ConfiguracaoSistema';

/**
 * Definição das rotas REST da API do SIGLoSUS.
 *
 * Cada endpoint corresponde a um ou mais requisitos funcionais documentados
 * (ver seção 4 — Arquitetura — e README do backend).
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
    });
  });

  // ---- Autenticação (UC01 / RF01) ----
  router.post('/auth/login', (req, res) => {
    const { identificador, senha } = req.body ?? {};
    const resultado = container.autenticacao.autenticar(identificador, senha);
    res.json({
      token: resultado.token,
      usuario: {
        id: resultado.usuario.id,
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
        perfil: resultado.usuario.perfil,
      },
    });
  });

  // ---- Usuários (RF04) ----
  router.get('/usuarios', (_req, res) => {
    res.json(container.usuario.listar().map((u) => ({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo })));
  });
  router.post('/usuarios', (req, res) => {
    const usuario = container.usuario.criar(req.body, Number(req.body?.autorId ?? 1));
    res.status(201).json(usuario);
  });
  router.patch('/usuarios/:id/inativar', (req, res) => {
    const usuario = container.usuario.inativar(Number(req.params.id), Number(req.body?.autorId ?? 1));
    res.json(usuario);
  });

  // ---- Cadastros (RF05, RF06) ----
  router.get('/unidades', (_req, res) => {
    res.json(container.unidades.listar());
  });
  router.get('/medicamentos', (_req, res) => {
    res.json(container.medicamentos.listar());
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
  router.post('/estoque/movimentacoes', (req, res) => {
    const resultado = container.estoque.registrarMovimentacao(req.body);
    res.status(201).json({
      movimentacao: resultado.movimentacao,
      estoque: { id: resultado.estoque.id, quantidadeAtual: resultado.estoque.quantidadeAtual },
    });
  });
  router.patch('/estoque/:id/niveis', (req, res) => {
    const { nivelMinimo, nivelSeguranca, usuarioId } = req.body ?? {};
    const estoque = container.estoque.configurarNiveis(Number(req.params.id), Number(nivelMinimo), Number(nivelSeguranca), Number(usuarioId ?? 1));
    res.json(estoque);
  });

  // ---- Alertas (RF11) ----
  router.get('/alertas', (_req, res) => {
    res.json(container.alerta.listar());
  });
  router.patch('/alertas/:id/resolver', (req, res) => {
    res.json(container.alerta.resolver(Number(req.params.id)));
  });

  // ---- Previsão de demanda (RF12) ----
  router.get('/previsoes', (_req, res) => {
    res.json(container.previsao.listar());
  });
  router.post('/previsoes/gerar', (req, res) => {
    const periodo = Number(req.body?.periodoDias ?? 30);
    res.json(container.previsao.preverTodas(periodo));
  });

  // ---- Transferências (RF13, RF14) ----
  router.get('/transferencias', (_req, res) => {
    res.json(container.transferencia.listar());
  });
  router.post('/transferencias/sugerir', (_req, res) => {
    res.json(container.transferencia.sugerir());
  });
  router.post('/transferencias/:id/aprovar', (req, res) => {
    res.json(container.transferencia.aprovar(Number(req.params.id), Number(req.body?.usuarioId ?? 2)));
  });
  router.post('/transferencias/:id/rejeitar', (req, res) => {
    res.json(
      container.transferencia.rejeitar(
        Number(req.params.id),
        String(req.body?.justificativa ?? 'Sem justificativa'),
        Number(req.body?.usuarioId ?? 2),
      ),
    );
  });

  // ---- Rotas de distribuição (RF15, RF16) ----
  router.get('/rotas', (_req, res) => {
    res.json(container.rota.listar());
  });
  router.get('/rotas/estrategias', (_req, res) => {
    res.json(container.rota.estrategiasDisponiveis());
  });
  router.get('/rotas/:id', (req, res) => {
    res.json(container.rota.buscar(Number(req.params.id)));
  });
  router.post('/rotas', (req, res) => {
    res.status(201).json(container.rota.gerarRota(req.body));
  });
  router.post('/rotas/:id/despachar', (req, res) => {
    res.json(container.entrega.despachar(Number(req.params.id), Number(req.body?.usuarioId ?? 2)));
  });

  // ---- Entregas (RF17 / UC18) ----
  router.get('/entregas', (_req, res) => {
    res.json(container.entrega.listar());
  });
  router.get('/entregas/rota/:rotaId', (req, res) => {
    res.json(container.entrega.listarPorRota(Number(req.params.rotaId)));
  });
  router.post('/entregas/:id/confirmar', (req, res) => {
    res.json(container.entrega.confirmarRecebimento(Number(req.params.id), req.body));
  });

  // ---- Integrações (RF07 / UC07) ----
  router.get('/integracoes', (_req, res) => {
    res.json({ configuradas: container.integracao.listar(), adaptadores: container.integracao.adaptersDisponiveis() });
  });
  router.post('/integracoes/sincronizar', (req, res) => {
    res.json(container.integracao.sincronizar(Number(req.body?.usuarioId ?? 1), req.body?.sistema));
  });

  // ---- Relatórios (RF21) ----
  router.get('/relatorios/dashboard', (_req, res) => {
    res.json(container.relatorio.dashboard());
  });
  router.get('/relatorios', (_req, res) => {
    res.json(container.relatorio.listar());
  });
  router.post('/relatorios', (req, res) => {
    res.status(201).json(container.relatorio.gerar(String(req.body?.tipo ?? 'geral'), Number(req.body?.usuarioId ?? 2)));
  });

  // ---- Auditoria (RF22) ----
  router.get('/auditoria', (_req, res) => {
    res.json(container.auditoria.listar());
  });

  return router;
}
