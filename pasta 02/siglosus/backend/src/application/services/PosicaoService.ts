import { PosicaoRota } from '../../domain/entities';
import { ErroConflito, ErroNaoEncontrado, ErroValidacao } from '../../domain/errors';
import { PosicaoRotaRepository, RotaRepository } from '../../infrastructure/repositories';
import { StatusRota } from '../../domain/enums';
import { AuditoriaService } from './AuditoriaService';

export interface DadosPosicao {
  rotaId: number;
  latitude: number;
  longitude: number;
  velocidadeKmh?: number;
  usuarioId: number;
}

/**
 * Serviço de rastreamento de rota (RF16).
 *
 * As posições são **reportadas pelo dispositivo** do motorista. O protótipo
 * não integra hardware GPS: o serviço implementa o fluxo completo de
 * coleta, validação, armazenamento e consulta, e os dados exibidos provêm
 * do dispositivo que reportou a posição.
 */
export class PosicaoService {
  constructor(
    private readonly posicoes: PosicaoRotaRepository,
    private readonly rotas: RotaRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(rotaId: number): PosicaoRota[] {
    this.exigirRota(rotaId);
    return this.posicoes.listarPorRota(rotaId);
  }

  ultima(rotaId: number): PosicaoRota | undefined {
    this.exigirRota(rotaId);
    return this.posicoes.ultimaPosicao(rotaId);
  }

  registrar(dados: DadosPosicao): PosicaoRota {
    const rota = this.exigirRota(dados.rotaId);
    if (rota.status !== StatusRota.EM_ANDAMENTO) {
      throw new ErroConflito('Só é possível reportar posição de rota em andamento.');
    }

    const latitude = Number(dados.latitude);
    const longitude = Number(dados.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new ErroValidacao('Coordenadas inválidas.');
    }

    const posicao = new PosicaoRota(
      this.posicoes.proximoId(),
      dados.rotaId,
      latitude,
      longitude,
      new Date(),
      dados.velocidadeKmh === undefined ? undefined : Number(dados.velocidadeKmh),
      dados.usuarioId,
    );

    if (!posicao.coordenadasValidas()) {
      throw new ErroValidacao('Coordenadas fora dos limites geográficos válidos.');
    }

    this.posicoes.salvar(posicao);
    this.auditoria.registrar(
      dados.usuarioId,
      'REGISTRAR_POSICAO_ROTA',
      'rota',
      `Rota ${dados.rotaId} — posição registrada`,
      true,
    );
    return posicao;
  }

  private exigirRota(rotaId: number) {
    const rota = this.rotas.buscarPorId(rotaId);
    if (!rota) throw new ErroNaoEncontrado('Rota não encontrada.');
    return rota;
  }
}
