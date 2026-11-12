import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Container } from '../src/application/Container';
import { criarApp } from '../src/infrastructure/http/App';
import { ConfiguracaoSistema } from '../src/patterns/singleton/ConfiguracaoSistema';
import { comToken, tokenDe } from './helpers';

describe('Validação final: idempotência segura e produção', () => {
  it('nunca permite seed em produção, nem com flag ou variável de ambiente', () => {
    const anterior = process.env.NODE_ENV;
    const seedAnterior = process.env.SIGLOSUS_SEED_DEMO;
    const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), 'siglosus-producao-'));
    try {
      process.env.NODE_ENV = 'production';
      ConfiguracaoSistema.reiniciar();
      expect(() => new Container({ arquivoPersistencia: path.join(diretorio, 'dados.json'), forcarSeed: true }))
        .toThrow(/proibidos em produção/);
      process.env.SIGLOSUS_SEED_DEMO = 'true';
      expect(() => new Container({ arquivoPersistencia: path.join(diretorio, 'dados.json') }))
        .toThrow(/proibidos em produção/);
      delete process.env.SIGLOSUS_SEED_DEMO;
      expect(() => new Container()).toThrow(/obrigatório configurar/);
      const vazio = new Container({ arquivoPersistencia: path.join(diretorio, 'dados.json') });
      expect(vazio.usuarios.listar()).toHaveLength(0);
    } finally {
      if (anterior === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = anterior;
      if (seedAnterior === undefined) delete process.env.SIGLOSUS_SEED_DEMO;
      else process.env.SIGLOSUS_SEED_DEMO = seedAnterior;
      ConfiguracaoSistema.reiniciar();
      fs.rmSync(diretorio, { recursive: true, force: true });
    }
  });

  it('chave de outro usuário não revela resultado e autorização é aplicada antes do cache', async () => {
    const app = criarApp(new Container());
    const gestor = await tokenDe(app, 'gestor');
    const motorista = await tokenDe(app, 'motorista');
    const chave = 'usuario-escopo-isolado-001';
    const corpo = { nome: 'Unidade Nova', tipo: 'UBS', cnes: '1230099',
      endereco: { logradouro: 'Rua Teste', numero: '1', cidade: 'Itacoatiara', uf: 'AM', cep: '69100000' } };
    const criada = await request(app).post('/api/unidades').set(comToken(gestor))
      .set('Idempotency-Key', chave).send(corpo);
    expect(criada.status).toBe(201);
    const semToken = await request(app).post('/api/unidades').set('Idempotency-Key', chave).send(corpo);
    expect(semToken.status).toBe(401);
    const semPermissao = await request(app).post('/api/unidades').set(comToken(motorista))
      .set('Idempotency-Key', chave).send(corpo);
    expect(semPermissao.status).toBe(403);
    expect(semPermissao.body).not.toHaveProperty('id', criada.body.id);
  });

  it('reenvio idêntico retorna cache; conteúdo ou caminho diferentes causam 409', async () => {
    const app = criarApp(new Container());
    const token = await tokenDe(app, 'gestor');
    const chave = 'replay-escopo-002';
    const corpo = { nome: 'UBS Demo', tipo: 'UBS', cnes: '1231001',
      endereco: { logradouro: 'Rua Teste', numero: '2', cidade: 'Itacoatiara', uf: 'AM', cep: '69100000' } };
    const req = () => request(app).post('/api/unidades').set(comToken(token)).set('Idempotency-Key', chave);
    const primeira = await req().send(corpo);
    expect(primeira.status).toBe(201);
    const segunda = await req().send(corpo);
    expect(segunda.status).toBe(201);
    expect(segunda.body).toEqual(primeira.body);
    const diferente = await req().send({ ...corpo, nome: 'Outra unidade' });
    expect(diferente.status).toBe(409);
    const outroCaminho = await request(app).post('/api/medicamentos').set(comToken(token))
      .set('Idempotency-Key', chave).send({ nome: 'Outro' });
    expect(outroCaminho.status).toBe(409);
  });

  it('registros legados sem usuário não são reproduzidos', async () => {
    const container = new Container();
    const app = criarApp(container);
    const token = await tokenDe(app, 'gestor');
    container.db.resultadosIdempotencia.push({
      id: 100, chave: 'chave-legada-003', metodo: 'POST', caminho: '/api/unidades',
      status: 201, corpo: { segredo: 'não divulgar' }, criadoEm: new Date(),
    } as never);
    const res = await request(app).post('/api/unidades').set(comToken(token))
      .set('Idempotency-Key', 'chave-legada-003').send({ nome: 'Teste' });
    expect(res.status).toBe(409);
    expect(res.text).not.toContain('não divulgar');
  });
});
