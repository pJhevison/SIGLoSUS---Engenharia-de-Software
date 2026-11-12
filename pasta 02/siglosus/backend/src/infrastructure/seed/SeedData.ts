import {
  Endereco,
  Estoque,
  IntegracaoExterna,
  Lote,
  Medicamento,
  UnidadeSaude,
  Usuario,
  Veiculo,
} from '../../domain/entities';
import { PerfilUsuario, StatusIntegracao, TipoUnidade } from '../../domain/enums';
import { DatabaseMemoria } from '../database/DatabaseMemoria';

/**
 * Carga inicial de dados (seed) para demonstração.
 *
 * Cria um cenário realista de uma região de saúde: uma Central de Abastecimento
 * Farmacêutico (CAF), unidades de ponta, catálogo de medicamentos, estoques
 * (alguns em risco de desabastecimento), veículos e integrações configuradas.
 */
export function popularBanco(db: DatabaseMemoria): void {
  const senha = Usuario.hashSenha('siglosus123');
  /** Avança o contador de uma coleção para que os próximos ids não colidam. */
  const avancar = (colecao: string, quantidade: number): void => {
    for (let i = 0; i < quantidade; i++) db.proximoId(colecao);
  };

  // --- Usuários (RF04) ---
  db.usuarios.push(
    new Usuario(1, 'Ana Administradora', '11111111111', 'admin@siglosus.gov.br', senha, PerfilUsuario.ADMINISTRADOR),
    new Usuario(2, 'Gabriel Gestor', '22222222222', 'gestor@siglosus.gov.br', senha, PerfilUsuario.GESTOR),
    new Usuario(3, 'Fernanda Farmacêutica', '33333333333', 'farmaceutico@siglosus.gov.br', senha, PerfilUsuario.FARMACEUTICO),
    new Usuario(4, 'Alberto Almoxarife', '44444444444', 'almoxarife@siglosus.gov.br', senha, PerfilUsuario.ALMOXARIFE),
    new Usuario(5, 'Marcos Motorista', '55555555555', 'motorista@siglosus.gov.br', senha, PerfilUsuario.MOTORISTA),
  );
  avancar('usuarios', 5);

  // --- Unidades de saúde (RF05) ---
  db.unidades.push(
    new UnidadeSaude(1, 'CAF - Central de Abastecimento Farmacêutico', TipoUnidade.CENTRAL_DISTRIBUICAO, '0000001',
      new Endereco('Av. Central', '100', 'Itacoatiara', 'AM', '69100-000', -3.143, -58.444)),
    new UnidadeSaude(2, 'UBS Central', TipoUnidade.UBS, '1234567',
      new Endereco('Rua das Flores', '50', 'Itacoatiara', 'AM', '69100-100', -3.148, -58.450)),
    new UnidadeSaude(3, 'Hospital Regional', TipoUnidade.HOSPITAL, '7654321',
      new Endereco('Av. Hospitalar', '200', 'Itacoatiara', 'AM', '69100-200', -3.135, -58.430)),
    new UnidadeSaude(4, 'UBS Zona Leste', TipoUnidade.UBS, '1112223',
      new Endereco('Rua do Comércio', '900', 'Itacoatiara', 'AM', '69100-300', -3.160, -58.420)),
    new UnidadeSaude(5, 'Farmácia Popular', TipoUnidade.FARMACIA_POPULAR, '9998887',
      new Endereco('Praça Central', '10', 'Itacoatiara', 'AM', '69100-400', -3.150, -58.460)),
  );
  avancar('unidades', 5);

  // --- Medicamentos (RF06) ---
  db.medicamentos.push(
    new Medicamento(1, 'Paracetamol 500 mg', 'Paracetamol', 'Comprimido', 'BR123456', false, true),
    new Medicamento(2, 'Losartana Potássica 50 mg', 'Losartana Potássica', 'Comprimido', 'BR654321', false, true),
    new Medicamento(3, 'Metformina 850 mg', 'Cloridrato de Metformina', 'Comprimido', 'BR999888', false, true),
    new Medicamento(4, 'Amoxicilina 500 mg', 'Amoxicilina', 'Cápsula', 'BR555444', false, false),
    new Medicamento(5, 'Dipirona Sódica 500 mg', 'Dipirona Sódica', 'Comprimido', 'BR777111', false, true),
    new Medicamento(6, 'Clonazepam 2 mg', 'Clonazepam', 'Comprimido', 'BR222333', true, false),
  );
  avancar('medicamentos', 6);

  // --- Estoques (RF09, RF10) ---
  const venc = (meses: number) => new Date(Date.now() + meses * 30 * 86_400_000);
  const criarEstoque = (
    unidadeId: number,
    medicamentoId: number,
    quantidade: number,
    minimo: number,
    seguranca: number,
  ): Estoque => {
    const id = db.proximoId('estoques');
    const estoque = new Estoque(id, unidadeId, medicamentoId, quantidade, minimo, seguranca, [
      new Lote(db.proximoId('lotes'), `L${id}-A`, venc(14), Math.ceil(quantidade / 2)),
      new Lote(db.proximoId('lotes'), `L${id}-B`, venc(2), Math.floor(quantidade / 2)),
    ]);
    return estoque;
  };

  db.estoques.push(
    // CAF possui excedentes
    criarEstoque(1, 1, 5000, 1000, 2000),
    criarEstoque(1, 2, 3000, 500, 1000),
    criarEstoque(1, 3, 2000, 500, 800),
    criarEstoque(1, 4, 1500, 300, 500),
    criarEstoque(1, 5, 4000, 800, 1500),
    // UBS Central — Losartana em risco (abaixo do mínimo)
    criarEstoque(2, 1, 300, 100, 200),
    criarEstoque(2, 2, 40, 100, 200),
    criarEstoque(2, 3, 250, 100, 150),
    // Hospital Regional — Amoxicilina abaixo do mínimo
    criarEstoque(3, 1, 400, 150, 300),
    criarEstoque(3, 4, 50, 120, 250),
    criarEstoque(3, 2, 500, 150, 300),
    // UBS Zona Leste — Dipirona abaixo do mínimo
    criarEstoque(4, 5, 60, 200, 400),
    criarEstoque(4, 1, 500, 150, 300),
    // Farmácia Popular — Metformina em déficit
    criarEstoque(5, 3, 90, 120, 200),
    criarEstoque(5, 5, 700, 200, 400),
  );

  // --- Veículos (RF15, RN07) ---
  db.veiculos.push(
    new Veiculo(1, 'ABC-1234', 1500, 'Caminhão leve'),
    new Veiculo(2, 'XYZ-5678', 400, 'Furgão'),
  );
  avancar('veiculos', 2);

  // --- Integrações externas (RF07) ---
  db.integracoes.push(
    new IntegracaoExterna(1, 'e-SUS APS', 'https://esusaps.local/api', StatusIntegracao.ATIVA),
    new IntegracaoExterna(2, 'HÓRUS/SNA', 'https://horus.local/api', StatusIntegracao.ATIVA),
    new IntegracaoExterna(3, 'BNAFAR', 'https://bnafar.local/api', StatusIntegracao.ATIVA),
  );
  avancar('integracoes', 3);
}
