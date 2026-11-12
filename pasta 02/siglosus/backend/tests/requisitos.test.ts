import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { Container } from '../src/application/Container';
import { criarApp } from '../src/infrastructure/http/App';
import { comToken, tokenDe } from './helpers';

/**
 * Cobertura dos requisitos funcionais que eram parciais ou ausentes:
 * RF02 (recuperação de senha), RF03 (logout), RF04 (edição de usuários),
 * RF05 (unidades), RF06 (catálogo de medicamentos) e RF16 (rastreamento).
 */
describe('Requisitos funcionais complementares (RF02, RF03, RF04, RF05, RF06, RF16)', () => {
  it('RF02 — recuperação de senha gera token válido e permite redefinir a senha', async () => {
    const container = new Container();
    const app = criarApp(container);

    const solicitacao = await request(app)
      .post('/api/auth/recuperar-senha')
      .send({ email: 'gestor@siglosus.gov.br' });
    expect(solicitacao.status).toBe(200);
    expect(solicitacao.body.contaEncontrada).toBe(true);
    expect(solicitacao.body.token).toBeTruthy();

    const redefinicao = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: solicitacao.body.token, novaSenha: 'nova-senha-forte' });
    expect(redefinicao.status).toBe(200);
    expect(redefinicao.body.usuario).not.toHaveProperty('senhaHash');

    // A nova senha funciona e a antiga deixou de funcionar.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ identificador: 'gestor@siglosus.gov.br', senha: 'nova-senha-forte' });
    expect(login.status).toBe(200);
    const antigo = await request(app)
      .post('/api/auth/login')
      .send({ identificador: 'gestor@siglosus.gov.br', senha: 'siglosus123' });
    expect(antigo.status).toBe(401);
  });

  it('RF02 — token de recuperação inválido ou expirado é recusado', async () => {
    const container = new Container();
    const app = criarApp(container);

    const invalido = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'token-inexistente', novaSenha: 'nova-senha-forte' });
    expect(invalido.status).toBe(400);

    const solicitacao = await request(app)
      .post('/api/auth/recuperar-senha')
      .send({ email: 'gestor@siglosus.gov.br' });
    const registro = container.tokensRecuperacao.listar()[0];
    (registro as { expiraEm: Date }).expiraEm = new Date(Date.now() - 1000); // simula expiração

    const expirado = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: solicitacao.body.token, novaSenha: 'nova-senha-forte' });
    expect(expirado.status).toBe(400);
  });

  it('RF02 — e-mail inexistente não revela a existência da conta', async () => {
    const app = criarApp(new Container());
    const res = await request(app)
      .post('/api/auth/recuperar-senha')
      .send({ email: 'nao-existe@siglosus.gov.br' });
    expect(res.status).toBe(200);
    expect(res.body.contaEncontrada).toBe(false);
    expect(res.body.token).toBeUndefined();
  });

  it('RF03 — logout encerra a sessão e o token deixa de ser aceito', async () => {
    const app = criarApp(new Container());
    const token = await tokenDe(app, 'gestor');

    const antes = await request(app).get('/api/auth/eu').set(comToken(token));
    expect(antes.status).toBe(200);

    const saida = await request(app).post('/api/auth/logout').set(comToken(token));
    expect(saida.status).toBe(200);

    const depois = await request(app).get('/api/auth/eu').set(comToken(token));
    expect(depois.status).toBe(401);
  });

  it('RF04 — gestor edita conta e administrador inativa; sem permissão retorna 403', async () => {
    const app = criarApp(new Container());

    const tokenFarmaceutico = await tokenDe(app, 'farmaceutico');
    const tokenGestor = await tokenDe(app, 'gestor');
    const tokenAdmin = await tokenDe(app, 'admin');

    const listagem = await request(app).get('/api/usuarios').set(comToken(tokenGestor));
    expect(listagem.status).toBe(200);
    const alvo = listagem.body.find((u: { perfil: string }) => u.perfil === 'ALMOXARIFE');

    // Perfil sem permissão de gestão.
    const negado = await request(app)
      .patch(`/api/usuarios/${alvo.id}`)
      .set(comToken(tokenFarmaceutico))
      .send({ nome: 'Tentativa indevida' });
    expect(negado.status).toBe(403);

    // Gestor pode editar.
    const editado = await request(app)
      .patch(`/api/usuarios/${alvo.id}`)
      .set(comToken(tokenGestor))
      .send({ nome: 'Almoxarife Editado' });
    expect(editado.status).toBe(200);
    expect(editado.body.nome).toBe('Almoxarife Editado');
    expect(editado.body).not.toHaveProperty('cpf');

    // Inativação exige administrador.
    const inativarNegado = await request(app)
      .patch(`/api/usuarios/${alvo.id}/inativar`)
      .set(comToken(tokenGestor));
    expect(inativarNegado.status).toBe(403);

    const inativado = await request(app)
      .patch(`/api/usuarios/${alvo.id}/inativar`)
      .set(comToken(tokenAdmin));
    expect(inativado.status).toBe(200);
    expect(inativado.body.ativo).toBe(false);
  });

  it('RF04 — o usuário edita apenas a própria conta (identidade vem do token)', async () => {
    const app = criarApp(new Container());
    const tokenFarmaceutico = await tokenDe(app, 'farmaceutico');

    const eu = await request(app).get('/api/auth/eu').set(comToken(tokenFarmaceutico));
    const meuId = eu.body.id;

    const proprio = await request(app)
      .patch(`/api/usuarios/${meuId}`)
      .set(comToken(tokenFarmaceutico))
      .send({ nome: 'Farmacêutico Atualizado' });
    expect(proprio.status).toBe(200);
    expect(proprio.body.nome).toBe('Farmacêutico Atualizado');

    // Tentar alterar o próprio perfil é recusado.
    const perfil = await request(app)
      .patch(`/api/usuarios/${meuId}`)
      .set(comToken(tokenFarmaceutico))
      .send({ perfil: 'ADMINISTRADOR' });
    expect(perfil.status).toBe(403);
  });

  it('RF05 — cadastro e manutenção de unidades de saúde', async () => {
    const app = criarApp(new Container());
    const tokenGestor = await tokenDe(app, 'gestor');
    const tokenFarmaceutico = await tokenDe(app, 'farmaceutico');

    const negado = await request(app)
      .post('/api/unidades')
      .set(comToken(tokenFarmaceutico))
      .send({ nome: 'UBS Teste', tipo: 'UBS', cnes: '1234567' });
    expect(negado.status).toBe(403);

    const criada = await request(app)
      .post('/api/unidades')
      .set(comToken(tokenGestor))
      .send({
        nome: 'UBS Teste',
        tipo: 'UBS',
        cnes: '5551234',
        endereco: {
          logradouro: 'Rua das Flores',
          numero: '100',
          cidade: 'Itacoatiara',
          uf: 'AM',
          cep: '13800000',
          latitude: -3.14,
          longitude: -58.44,
        },
      });
    expect(criada.status).toBe(201);
    expect(criada.body.cnes).toBe('5551234');

    const duplicada = await request(app)
      .post('/api/unidades')
      .set(comToken(tokenGestor))
      .send({ nome: 'UBS Duplicada', tipo: 'UBS', cnes: '5551234' });
    expect(duplicada.status).toBe(409);

    const atualizada = await request(app)
      .patch(`/api/unidades/${criada.body.id}`)
      .set(comToken(tokenGestor))
      .send({ nome: 'UBS Atualizada' });
    expect(atualizada.status).toBe(200);
    expect(atualizada.body.nome).toBe('UBS Atualizada');
  });

  it('RF06 — cadastro e manutenção do catálogo de medicamentos', async () => {
    const app = criarApp(new Container());
    const tokenGestor = await tokenDe(app, 'gestor');

    const criado = await request(app)
      .post('/api/medicamentos')
      .set(comToken(tokenGestor))
      .send({
        nome: 'Sinvastatina 20mg',
        principioAtivo: 'Sinvastatina',
        apresentacao: 'Comprimido',
        codigoCATMAT: 'ABC123456',
        controlado: false,
        rename: true,
      });
    expect(criado.status).toBe(201);
    expect(criado.body.codigoCATMAT).toBe('ABC123456');

    const duplicado = await request(app)
      .post('/api/medicamentos')
      .set(comToken(tokenGestor))
      .send({
        nome: 'Outro',
        principioAtivo: 'Outro',
        apresentacao: 'Comprimido',
        codigoCATMAT: 'ABC123456',
      });
    expect(duplicado.status).toBe(409);

    const invalido = await request(app)
      .post('/api/medicamentos')
      .set(comToken(tokenGestor))
      .send({
        nome: 'Teste',
        principioAtivo: 'Teste',
        apresentacao: 'Comprimido',
        codigoCATMAT: 'curto',
      });
    expect(invalido.status).toBe(400);

    const atualizado = await request(app)
      .patch(`/api/medicamentos/${criado.body.id}`)
      .set(comToken(tokenGestor))
      .send({ controlado: true });
    expect(atualizado.status).toBe(200);
    expect(atualizado.body.controlado).toBe(true);
  });

  it('RF16 — rastreamento de rota aceita e devolve posições reportadas', async () => {
    const container = new Container();
    const app = criarApp(container);
    const tokenAlmoxarife = await tokenDe(app, 'almoxarife');
    const tokenMotorista = await tokenDe(app, 'motorista');

    const rota = await request(app)
      .post('/api/rotas')
      .set(comToken(tokenAlmoxarife))
      .send({ veiculoId: 1, unidadesDestinoIds: [2, 3] });
    expect(rota.status).toBe(201);

    await request(app).post(`/api/rotas/${rota.body.id}/despachar`).set(comToken(tokenAlmoxarife));

    const posicao = await request(app)
      .post(`/api/rotas/${rota.body.id}/posicoes`)
      .set(comToken(tokenMotorista))
      .send({ latitude: -3.1433, longitude: -58.4401, velocidadeKmh: 42 });
    expect(posicao.status).toBe(201);
    expect(posicao.body.latitude).toBeCloseTo(-3.1433);

    const listagem = await request(app)
      .get(`/api/rotas/${rota.body.id}/posicoes`)
      .set(comToken(tokenMotorista));
    expect(listagem.status).toBe(200);
    expect(listagem.body).toHaveLength(1);

    const invalida = await request(app)
      .post(`/api/rotas/${rota.body.id}/posicoes`)
      .set(comToken(tokenMotorista))
      .send({ latitude: 999, longitude: 0 });
    expect(invalida.status).toBe(400);
  });

  it('Autorização — o-motorista não pode aprovar transferências (403)', async () => {
    const app = criarApp(new Container());
    const tokenMotorista = await tokenDe(app, 'motorista');
    const sugestoes = await request(app)
      .post('/api/transferencias/sugerir')
      .set(comToken(await tokenDe(app, 'gestor')));
    const id = sugestoes.body[0].id;

    const negado = await request(app)
      .post(`/api/transferencias/${id}/aprovar`)
      .set(comToken(tokenMotorista));
    expect(negado.status).toBe(403);
  });

  it('Autorização — o corpo da requisição não define a identidade do usuário', async () => {
    const app = criarApp(new Container());
    const tokenMotorista = await tokenDe(app, 'motorista');

    // O corpo tenta se passar pelo gestor (usuarioId 2); o token tem precedência.
    const res = await request(app)
      .post('/api/requisicoes')
      .set(comToken(tokenMotorista))
      .send({
        unidadeSolicitanteId: 2,
        medicamentoId: 1,
        quantidade: 1,
        valorEstimado: 10,
        usuarioId: 2,
      });
    expect(res.status).toBe(403);
  });
});
