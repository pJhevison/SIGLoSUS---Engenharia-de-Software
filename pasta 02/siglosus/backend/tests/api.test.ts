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
    expect(res.status).toBe(400);
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
});
