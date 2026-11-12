import { Usuario } from '../../domain/entities';
import { PerfilUsuario } from '../../domain/enums';
import { ErroConflito, ErroNaoEncontrado, ErroNaoAutorizado, ErroValidacao } from '../../domain/errors';
import { UsuarioRepository } from '../../infrastructure/repositories';
import { RecuperacaoSenhaService } from './RecuperacaoSenhaService';
import { AuditoriaService } from './AuditoriaService';

export interface DadosNovoUsuario {
  nome: string;
  cpf: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
}

export interface DadosAtualizacaoUsuario {
  nome?: string;
  email?: string;
  cpf?: string;
  perfil?: PerfilUsuario;
  senha?: string;
}

/** Perfis que o gestor pode administering; o administrador não pode ser alterado por gestor. */
const PERFIS_GERENCIAVEIS: PerfilUsuario[] = [
  PerfilUsuario.GESTOR,
  PerfilUsuario.FARMACEUTICO,
  PerfilUsuario.ALMOXARIFE,
  PerfilUsuario.MOTORISTA,
];

/**
 * Serviço de gestão de usuários (RF04).
 *
 * A edição é **autorizada**: o administrador gerencia qualquer conta, o
 * gestor gerencia perfis operacionais e cada usuário pode editar os próprios
 * dados (nome, e-mail e senha).
 */
export class UsuarioService {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(): Usuario[] {
    return this.usuarios.listar();
  }

  buscar(id: number): Usuario {
    const usuario = this.usuarios.buscarPorId(id);
    if (!usuario) throw new ErroNaoEncontrado('Usuário não encontrado.');
    return usuario;
  }

  /** Valida e normaliza os dados de cadastro. */
  private validarDados(dados: DadosNovoUsuario | DadosAtualizacaoUsuario): void {
    if (dados.nome !== undefined) {
      const nome = String(dados.nome ?? '').trim();
      if (nome.length < 3) {
        throw new ErroValidacao('O nome deve ter ao menos 3 caracteres.');
      }
    }
    if (dados.email !== undefined) {
      const email = String(dados.email ?? '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ErroValidacao('E-mail inválido.');
      }
    }
    if (dados.cpf !== undefined) {
      const cpf = String(dados.cpf ?? '').replace(/\D/g, '');
      if (cpf.length !== 11) {
        throw new ErroValidacao('O CPF deve ter 11 dígitos.');
      }
    }
    if (dados.senha !== undefined) {
      RecuperacaoSenhaService.validarSenha(dados.senha);
    }
    if (dados.perfil !== undefined && !Object.values(PerfilUsuario).includes(dados.perfil)) {
      throw new ErroValidacao('Perfil de usuário inválido.');
    }
  }

  criar(dados: DadosNovoUsuario, autor: Usuario): Usuario {
    this.validarDados(dados);
    const email = String(dados.email).trim().toLowerCase();
    if (this.usuarios.buscarPorEmailOuCpf(email)) {
      throw new ErroConflito('Já existe usuário com este e-mail.');
    }
    const cpf = String(dados.cpf ?? '').replace(/\D/g, '');
    if (this.usuarios.listar().some((u) => u.cpf === cpf)) {
      throw new ErroConflito('Já existe usuário com este CPF.');
    }
    const usuario = new Usuario(
      this.usuarios.proximoId(),
      String(dados.nome).trim(),
      cpf,
      email,
      Usuario.hashSenha(dados.senha),
      dados.perfil,
      true,
    );
    this.usuarios.salvar(usuario);
    this.auditoria.registrar(autor.id, 'CRIAR_USUARIO', 'usuario', `${email} (${dados.perfil})`, true);
    return usuario;
  }

  /**
   * RF04 — atualiza os dados de uma conta, conforme o perfil do autor.
   */
  atualizar(id: number, dados: DadosAtualizacaoUsuario, autor: Usuario): Usuario {
    const usuario = this.buscar(id);
    const ehProprio = autor.id === usuario.id;

    if (!ehProprio && !this.podeGerenciar(autor, usuario)) {
      throw new ErroNaoAutorizado('Você não pode alterar a conta de outro usuário.');
    }
    if (ehProprio && dados.perfil !== undefined && dados.perfil !== usuario.perfil) {
      throw new ErroNaoAutorizado('Você não pode alterar o próprio perfil.');
    }

    this.validarDados(dados);

    if (dados.email !== undefined) {
      const email = String(dados.email).trim().toLowerCase();
      const existente = this.usuarios.buscarPorEmailOuCpf(email);
      if (existente && existente.id !== usuario.id) {
        throw new ErroConflito('Já existe usuário com este e-mail.');
      }
      usuario.email = email;
    }
    if (dados.nome !== undefined) usuario.nome = String(dados.nome).trim();
    if (dados.cpf !== undefined) {
      const cpf = String(dados.cpf).replace(/\D/g, '');
      const existente = this.usuarios.listar().find((u) => u.cpf === cpf && u.id !== usuario.id);
      if (existente) throw new ErroConflito('Já existe usuário com este CPF.');
      usuario.cpf = cpf;
    }
    if (dados.perfil !== undefined) usuario.perfil = dados.perfil;
    if (dados.senha !== undefined) usuario.definirSenha(dados.senha);

    this.auditoria.registrar(
      autor.id,
      'ATUALIZAR_USUARIO',
      'usuario',
      `Conta ${usuario.email} atualizada`,
      true,
    );
    return usuario;
  }

  inativar(id: number, autor: Usuario): Usuario {
    const usuario = this.buscar(id);
    if (autor.id === usuario.id) {
      throw new ErroValidacao('Não é possível inativar a própria conta.');
    }
    if (autor.perfil !== PerfilUsuario.ADMINISTRADOR) {
      throw new ErroNaoAutorizado('Somente o administrador pode inativar contas.');
    }
    if (usuario.perfil === PerfilUsuario.ADMINISTRADOR) {
      throw new ErroValidacao('Não é possível inativar a conta de administrador.');
    }
    usuario.inativar();
    this.auditoria.registrar(autor.id, 'INATIVAR_USUARIO', 'usuario', usuario.email, true);
    return usuario;
  }

  ativar(id: number, autor: Usuario): Usuario {
    const usuario = this.buscar(id);
    if (autor.perfil !== PerfilUsuario.ADMINISTRADOR) {
      throw new ErroNaoAutorizado('Somente o administrador pode reativar contas.');
    }
    usuario.ativar();
    this.auditoria.registrar(autor.id, 'ATIVAR_USUARIO', 'usuario', usuario.email, true);
    return usuario;
  }

  /** Regras de permissão para administrar a conta de outro usuário. */
  private podeGerenciar(autor: Usuario, alvo: Usuario): boolean {
    if (autor.perfil === PerfilUsuario.ADMINISTRADOR) return true;
    if (autor.perfil === PerfilUsuario.GESTOR) {
      return PERFIS_GERENCIAVEIS.includes(alvo.perfil) && alvo.perfil !== PerfilUsuario.ADMINISTRADOR;
    }
    return false;
  }
}
