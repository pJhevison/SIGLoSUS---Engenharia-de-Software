import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Container } from '../src/application/Container';
import { criarApp } from '../src/infrastructure/http/App';
import { TipoMovimentacao } from '../src/domain/enums';
import { comToken, tokenDe } from './helpers';

describe('Persistência em arquivo (os dados sobrevivem ao reinício)', () => {
  let diretorio: string;
  let arquivo: string;

  beforeEach(() => {
    diretorio = fs.mkdtempSync(path.join(os.tmpdir(), 'siglosus-persistencia-'));
    arquivo = path.join(diretorio, 'siglosus.json');
  });

  afterEach(() => {
    fs.rmSync(diretorio, { recursive: true, force: true });
  });

  it('registra pela API, grava em arquivo e restaura em uma nova instância', async () => {
    const primeira = new Container({ arquivoPersistencia: arquivo });
    const app = criarApp(primeira);
    const token = await tokenDe(app, 'farmaceutico');

    const estoque = primeira.estoques.buscarPorUnidadeEMedicamento(2, 1)!;
    const antes = estoque.quantidadeAtual;

    const movimentacao = await request(app)
      .post('/api/estoque/movimentacoes')
      .set(comToken(token))
      .send({ estoqueId: estoque.id, tipo: TipoMovimentacao.SAIDA, quantidade: 7 });
    expect(movimentacao.status).toBe(201);
    expect(estoque.quantidadeAtual).toBe(antes - 7);

    expect(fs.existsSync(arquivo)).toBe(true);

    // Nova instância (simula o reinício do servidor) carrega o estado do arquivo.
    const segunda = new Container({ arquivoPersistencia: arquivo });
    const estoqueRestaurado = segunda.estoques.buscarPorUnidadeEMedicamento(2, 1)!;
    expect(estoqueRestaurado.quantidadeAtual).toBe(antes - 7);
    expect(typeof estoqueRestaurado.quantidadeAtual).toBe('number');
    expect(estoqueRestaurado.lotes[0].validade).toBeInstanceOf(Date);
    expect(segunda.usuarios.listar()[0].senhaHash.startsWith('$2')).toBe(true);
  });

  it('preserva o histórico de movimentações e a auditoria entre reinícios', async () => {
    const primeira = new Container({ arquivoPersistencia: arquivo });
    const app = criarApp(primeira);
    const token = await tokenDe(app, 'gestor');

    await request(app)
      .post('/api/medicamentos')
      .set(comToken(token))
      .send({
        nome: 'Medicamento Persistido',
        principioAtivo: 'Persistido',
        apresentacao: 'Comprimido',
        codigoCATMAT: 'PERS001',
      });

    const segunda = new Container({ arquivoPersistencia: arquivo });
    const encontrado = segunda.medicamentos.listar().find((m) => m.codigoCATMAT === 'PERS001');
    expect(encontrado).toBeDefined();
    expect(segunda.auditoria.listar().length).toBeGreaterThan(0);
  });

  it('não duplica o cenário de demonstração quando o arquivo já existe', () => {
    new Container({ arquivoPersistencia: arquivo });
    const segunda = new Container({ arquivoPersistencia: arquivo });
    const primeira = new Container({ arquivoPersistencia: arquivo });
    expect(segunda.unidades.listar().length).toBe(primeira.unidades.listar().length);
    expect(segunda.unidades.listar().length).toBeGreaterThan(0);
  });

  it('sem arquivo configurado, o banco permanece somente em memória', () => {
    const container = new Container();
    expect(container.persistencia).toBeNull();
    expect(fs.existsSync(path.join(diretorio, 'nenhum.json'))).toBe(false);
  });
});
