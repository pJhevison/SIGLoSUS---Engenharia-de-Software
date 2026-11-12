import { describe, expect, it } from 'vitest';
import * as crypto from 'crypto';
import { Container } from '../src/application/Container';
import { Usuario } from '../src/domain/entities';
import { ErroNaoAutenticado } from '../src/domain/errors';
import { ehHashLegado, gerarHashSenha, verificarSenha } from '../src/domain/security/Senha';
import { GerenciadorJWT } from '../src/infrastructure/security/GerenciadorJWT';

describe('Segurança — senhas, tokens e autorização (RNF01)', () => {
  it('hashSenha gera bcrypt com salt individual (nunca SHA-256 simples)', () => {
    const a = Usuario.hashSenha('senha-forte-123');
    const b = Usuario.hashSenha('senha-forte-123');
    expect(a.startsWith('$2')).toBe(true);
    expect(a).not.toBe(b); // salts diferentes para a mesma senha
    expect(a).not.toContain('senha-forte-123');
    expect(ehHashLegado(a)).toBe(false);
  });

  it('verificarSenha aceita a senha correta e rejeita a incorreta', () => {
    const hash = gerarHashSenha('senha-forte-123');
    expect(verificarSenha('senha-forte-123', hash)).toBe(true);
    expect(verificarSenha('senha-errada', hash)).toBe(false);
    expect(verificarSenha('', hash)).toBe(false);
  });

  it('hash legado em SHA-256 é aceito e sinalizado para migração', () => {
    const legado = crypto.createHash('sha256').update('senha-antiga').digest('hex');
    expect(ehHashLegado(legado)).toBe(true);
    expect(verificarSenha('senha-antiga', legado)).toBe(true);
    expect(verificarSenha('outra', legado)).toBe(false);
  });

  it('login migra automaticamente a senha legada para bcrypt', () => {
    const container = new Container();
    const usuario = container.usuarios.listar()[0];
    usuario.senhaHash = crypto.createHash('sha256').update('siglosus123').digest('hex');

    const resultado = container.autenticacao.autenticar(usuario.email, 'siglosus123');
    expect(resultado.usuario.senhaHash.startsWith('$2')).toBe(true);
    expect(ehHashLegado(resultado.usuario.senhaHash)).toBe(false);
  });

  it('JWT assinado valida, detecta adulteração e expiração', () => {
    const gerenciador = new GerenciadorJWT({
      segredo: 'segredo-de-teste-com-tamanho-minimo-de-32-caracteres',
      expiraEmMinutos: 60,
      emissor: 'siglosus',
    });
    const token = gerenciador.emitir({
      id: 1,
      perfil: 'GESTOR' as never,
      nome: 'Gestor',
      email: 'gestor@siglosus.gov.br',
      versaoToken: 1,
    });
    expect(token.split('.')).toHaveLength(3);
    expect(gerenciador.validar(token).usuarioId).toBe(1);

    // Adulteração do payload invalida a assinatura.
    const partes = token.split('.');
    const adulterado = `${partes[0]}.${Buffer.from('{"sub":"2"}').toString('base64url')}.${partes[2]}`;
    expect(() => gerenciador.validar(adulterado)).toThrow(ErroNaoAutenticado);

    // Token expirado é rejeitado.
    const expirado = new GerenciadorJWT({
      segredo: 'segredo-de-teste-com-tamanho-minimo-de-32-caracteres',
      expiraEmMinutos: -1,
      emissor: 'siglosus',
    });
    const tokenExpirado = expirado.emitir({
      id: 1,
      perfil: 'GESTOR' as never,
      nome: 'Gestor',
      email: 'gestor@siglosus.gov.br',
      versaoToken: 1,
    });
    expect(() => expirado.validar(tokenExpirado)).toThrow(ErroNaoAutenticado);
  });

  it('token emitido com outro segredo é rejeitado', () => {
    const emissor = new GerenciadorJWT({
      segredo: 'segredo-de-teste-com-tamanho-minimo-de-32-caracteres',
      expiraEmMinutos: 60,
      emissor: 'siglosus',
    });
    const outro = new GerenciadorJWT({
      segredo: 'outro-segredo-com-tamanho-minimo-de-32-caracteres',
      expiraEmMinutos: 60,
      emissor: 'siglosus',
    });
    const token = emissor.emitir({
      id: 1,
      perfil: 'GESTOR' as never,
      nome: 'Gestor',
      email: 'gestor@siglosus.gov.br',
      versaoToken: 1,
    });
    expect(() => outro.validar(token)).toThrow(ErroNaoAutenticado);
  });

  it('logout revoga o token e impede o uso posterior', () => {
    const container = new Container();
    const resultado = container.autenticacao.autenticar('gestor@siglosus.gov.br', 'siglosus123');
    expect(() => container.autenticacao.autenticarToken(resultado.token)).not.toThrow();

    container.autenticacao.encerrarSessao(resultado.token, resultado.usuario.id);
    expect(() => container.autenticacao.autenticarToken(resultado.token)).toThrow(ErroNaoAutenticado);
  });

  it('troca de senha invalida as sessões anteriores (versaoToken)', () => {
    const container = new Container();
    const token = container.autenticacao.autenticar('gestor@siglosus.gov.br', 'siglosus123').token;
    const usuario = container.usuarios.listar().find((u) => u.email === 'gestor@siglosus.gov.br')!;

    container.recuperacaoSenha.trocar(usuario, 'siglosus123', 'nova-senha-forte');
    expect(() => container.autenticacao.autenticarToken(token)).toThrow(ErroNaoAutenticado);
    expect(container.autenticacao.autenticar('gestor@siglosus.gov.br', 'nova-senha-forte').token).toBeTruthy();
  });
});
