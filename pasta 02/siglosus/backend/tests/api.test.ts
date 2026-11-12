import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Container } from '../src/application/Container';
import { criarApp } from '../src/infrastructure/http/App';

const app = criarApp(new Container());

describe('API REST (RF01, RF07, RF09, RF13, RF15, RF21)', () => {
  it('GET /api/health — expõe versão, regras e padrões', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.padroes).toContain('Strategy');
  });

  it('POST /api/auth/login — autentica e devolve token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identificador: 'gestor@siglosus.gov.br', senha: 'siglosus123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario.perfil).toBe('GESTOR');
  });

  it('POST /api/auth/login — credenciais inválidas retornam erro', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identificador: 'ninguem@x.com', senha: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.erro).toBeTruthy();
  });

  it('GET /api/estoque — visão consolidada', async () => {
    const res = await request(app).get('/api/estoque');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('unidadeNome');
  });

  it('POST /api/transferencias/sugerir — gera sugestões', async () => {
    const res = await request(app).post('/api/transferencias/sugerir');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/rotas — gera rota otimizada', async () => {
    const res = await request(app)
      .post('/api/rotas')
      .send({ veiculoId: 1, unidadesDestinoIds: [2, 3], estrategia: 'PRIORIDADE', usuarioId: 2 });
    expect(res.status).toBe(201);
    expect(res.body.paradas.length).toBe(2);
  });

  it('GET /api/relatorios/dashboard — indicadores gerenciais', async () => {
    const res = await request(app).get('/api/relatorios/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('itensCriticos');
  });

  it('POST /api/usuarios — não expõe senhaHash na resposta', async () => {
    const res = await request(app).post('/api/usuarios').send({
      nome: 'Teste DTO',
      cpf: '99999999999',
      email: 'dto@siglosus.gov.br',
      senha: 'siglosus123',
      perfil: 'FARMACEUTICO',
      autorId: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('senhaHash');
    expect(res.body).not.toHaveProperty('cpf');
    expect(res.body.email).toBe('dto@siglosus.gov.br');
  });

  it('GET /api/rotas/:id — rota inexistente retorna 404', async () => {
    const res = await request(app).get('/api/rotas/9999');
    expect(res.status).toBe(404);
  });

  it('GET /api/rota-inexistente — recurso desconhecido retorna 404', async () => {
    const res = await request(app).get('/api/rota-inexistente');
    expect(res.status).toBe(404);
  });

  it('POST /api/dispensacoes — registra dispensação (RF19)', async () => {
    const res = await request(app).post('/api/dispensacoes').send({
      unidadeId: 2,
      medicamentoId: 1,
      quantidade: 3,
      usuarioId: 3,
    });
    expect(res.status).toBe(201);
    expect(res.body.quantidade).toBe(3);
    expect(res.body.unidadeId).toBe(2);
  });

  it('RF20/RN09 — requisição acima do limite só é aprovada por gestor', async () => {
    const criada = await request(app).post('/api/requisicoes').send({
      unidadeSolicitanteId: 2,
      medicamentoId: 2,
      quantidade: 100,
      valorEstimado: 8000,
      usuarioId: 3,
    });
    expect(criada.status).toBe(201);

    const negada = await request(app)
      .post(`/api/requisicoes/${criada.body.id}/aprovar`)
      .send({ usuarioId: 3 });
    expect(negada.status).toBe(422);
    expect(negada.body.codigo).toBe('RN09');

    const aprovada = await request(app)
      .post(`/api/requisicoes/${criada.body.id}/aprovar`)
      .send({ usuarioId: 2 });
    expect(aprovada.status).toBe(200);
    expect(aprovada.body.status).toBe('APROVADA');
  });

  it('RF20/RN09 — requisição de baixo valor pode ser aprovada pelo farmacêutico', async () => {
    const criada = await request(app).post('/api/requisicoes').send({
      unidadeSolicitanteId: 2,
      medicamentoId: 1,
      quantidade: 10,
      valorEstimado: 500,
      usuarioId: 3,
    });
    const aprovada = await request(app)
      .post(`/api/requisicoes/${criada.body.id}/aprovar`)
      .send({ usuarioId: 3 });
    expect(aprovada.status).toBe(200);
    expect(aprovada.body.status).toBe('APROVADA');
  });

  it('autenticação — bloqueia a conta após 5 tentativas (423)', async () => {
    const appIsolado = criarApp(new Container());
    for (let i = 0; i < 5; i++) {
      await request(appIsolado)
        .post('/api/auth/login')
        .send({ identificador: 'gestor@siglosus.gov.br', senha: 'errada' });
    }
    const res = await request(appIsolado)
      .post('/api/auth/login')
      .send({ identificador: 'gestor@siglosus.gov.br', senha: 'siglosus123' });
    expect(res.status).toBe(423);
  });
});
