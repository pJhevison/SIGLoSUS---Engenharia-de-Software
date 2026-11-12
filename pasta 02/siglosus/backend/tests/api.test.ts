import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Container } from '../src/application/Container';
import { criarApp } from '../src/infrastructure/http/App';
import { comToken, login, tokenDe } from './helpers';

const container = new Container();
const app = criarApp(container);

describe('API REST (RF01, RF07, RF09, RF13, RF15, RF21)', () => {
  it('GET /api/health — expõe versão, regras e padrões', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.padroes).toContain('Strategy');
  });

  it('POST /api/auth/login — autentica e devolve token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identificador: 'gestor@siglosus.gov.br', senha: 'siglosus123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.usuario.perfil).toBe('GESTOR');
  });

  it('POST /api/auth/login — credenciais inválidas retornam 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identificador: 'ninguem@x.com', senha: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.erro).toBeTruthy();
  });

  it('GET /api/estoque — visão consolidada (autenticado)', async () => {
    const token = await tokenDe(app, 'gestor');
    const res = await request(app).get('/api/estoque').set(comToken(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('unidadeNome');
  });

  it('POST /api/transferencias/sugerir — gera sugestões', async () => {
    const token = await tokenDe(app, 'gestor');
    const res = await request(app).post('/api/transferencias/sugerir').set(comToken(token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/rotas — gera rota otimizada', async () => {
    const token = await tokenDe(app, 'almoxarife');
    const res = await request(app)
      .post('/api/rotas')
      .set(comToken(token))
      .send({ veiculoId: 1, unidadesDestinoIds: [2, 3], estrategia: 'PRIORIDADE' });
    expect(res.status).toBe(201);
    expect(res.body.paradas.length).toBe(2);
  });

  it('GET /api/relatorios/dashboard — indicadores gerenciais', async () => {
    const token = await tokenDe(app, 'gestor');
    const res = await request(app).get('/api/relatorios/dashboard').set(comToken(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('itensCriticos');
  });

  it('POST /api/usuarios — não expõe senhaHash nem CPF na resposta', async () => {
    const token = await tokenDe(app, 'admin');
    const res = await request(app)
      .post('/api/usuarios')
      .set(comToken(token))
      .send({
        nome: 'Teste DTO',
        cpf: '99999999999',
        email: 'dto@siglosus.gov.br',
        senha: 'siglosus123',
        perfil: 'FARMACEUTICO',
      });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('senhaHash');
    expect(res.body).not.toHaveProperty('cpf');
    expect(res.body.email).toBe('dto@siglosus.gov.br');
  });

  it('GET /api/rotas/:id — rota inexistente retorna 404', async () => {
    const token = await tokenDe(app, 'gestor');
    const res = await request(app).get('/api/rotas/9999').set(comToken(token));
    expect(res.status).toBe(404);
  });

  it('GET /api/rota-inexistente — recurso desconhecido retorna 404', async () => {
    const token = await tokenDe(app, 'gestor');
    const res = await request(app).get('/api/rota-inexistente').set(comToken(token));
    expect(res.status).toBe(404);
  });

  it('POST /api/dispensacoes — registra dispensação (RF19)', async () => {
    const token = await tokenDe(app, 'farmaceutico');
    const res = await request(app)
      .post('/api/dispensacoes')
      .set(comToken(token))
      .send({ unidadeId: 2, medicamentoId: 1, quantidade: 3 });
    expect(res.status).toBe(201);
    expect(res.body.quantidade).toBe(3);
    expect(res.body.unidadeId).toBe(2);
  });

  it('RF20/RN09 — requisição acima do limite só é aprovada por gestor', async () => {
    const tokenFarmaceutico = await tokenDe(app, 'farmaceutico');
    const criada = await request(app)
      .post('/api/requisicoes')
      .set(comToken(tokenFarmaceutico))
      .send({ unidadeSolicitanteId: 2, medicamentoId: 2, quantidade: 100, valorEstimado: 8000 });
    expect(criada.status).toBe(201);

    const negada = await request(app)
      .post(`/api/requisicoes/${criada.body.id}/aprovar`)
      .set(comToken(tokenFarmaceutico));
    expect(negada.status).toBe(403);

    const tokenGestor = await tokenDe(app, 'gestor');
    const aprovada = await request(app)
      .post(`/api/requisicoes/${criada.body.id}/aprovar`)
      .set(comToken(tokenGestor));
    expect(aprovada.status).toBe(200);
    expect(aprovada.body.status).toBe('APROVADA');
  });

  it('RF20/RN09 — aprovação por gestor é exigida também no serviço (RN09)', async () => {
    const tokenFarmaceutico = await tokenDe(app, 'farmaceutico');
    const criada = await request(app)
      .post('/api/requisicoes')
      .set(comToken(tokenFarmaceutico))
      .send({ unidadeSolicitanteId: 2, medicamentoId: 2, quantidade: 100, valorEstimado: 8000 });
    expect(criada.status).toBe(201);

    // O serviço de aplicação rejeita a aprovação fora do perfil de gestão.
    expect(() =>
      container.requisicao.aprovar(criada.body.id, container.usuarios.listar().find((u) => u.perfil === 'FARMACEUTICO')!.id),
    ).toThrow(/RN09/);
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

  it('login — a senha em claro nunca é exposta na resposta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identificador: 'gestor@siglosus.gov.br', senha: 'siglosus123' });
    expect(JSON.stringify(res.body)).not.toContain('siglosus123');
    expect(JSON.stringify(res.body)).not.toContain('senhaHash');
  });

  it('POST /api/rotas — recusa corpo sem token (401)', async () => {
    const res = await request(app).post('/api/rotas').send({ veiculoId: 1, unidadesDestinoIds: [2] });
    expect(res.status).toBe(401);
  });

  it('POST /api/rotas — recusa token adulterado (401)', async () => {
    const token = await login(app, 'gestor@siglosus.gov.br', 'siglosus123');
    const adulterado = `${token.slice(0, -3)}xyz`;
    const res = await request(app)
      .post('/api/rotas')
      .set(comToken(adulterado))
      .send({ veiculoId: 1, unidadesDestinoIds: [2] });
    expect(res.status).toBe(401);
  });
});
