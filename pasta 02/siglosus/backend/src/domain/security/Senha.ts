import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Armazenamento e verificação de senhas (RNF01 — RNF02).
 *
 * A senha nunca é gravada em texto puro. Utiliza-se **bcrypt** com salt
 * individual por senha e fator de custo configurável, o que torna ataques
 * de força bruta e de rainbow table computacionalmente caros.
 *
 * Por compatibilidade com bases criadas antes da correção, hashes legados em
 * SHA-256 (64 caracteres hexadecimais) ainda são aceitos na verificação e
 * são **rehashados para bcrypt no primeiro login bem-sucedido** (migração
 * transparente).
 */

/** Fator de custo do bcrypt (2^10 iterações por padrão). */
export const FATOR_COSTO_BCRYPT = Number(process.env.BCRYPT_COST ?? 10);

const PREFIXO_BCRYPT = /^\$2[aby]?\$/;
const HASH_SHA256 = /^[a-f0-9]{64}$/i;

/** Gera hash bcrypt da senha, com salt aleatório individual. */
export function gerarHashSenha(senha: string): string {
  return bcrypt.hashSync(senha, FATOR_COSTO_BCRYPT);
}

/** Gera hash SHA-256 de senha (uso exclusivo na verificação de hashes legados). */
function hashSha256(senha: string): string {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

/** Compara dois valores em tempo constante, evitando vazamento por timing. */
export function compararSeguro(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    // Ainda assim realiza a comparação para manter o custo constante.
    crypto.timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/** Indica se o hash armazenado é do formato legado (SHA-256 simples). */
export function ehHashLegado(hash: string): boolean {
  return HASH_SHA256.test(hash) && !PREFIXO_BCRYPT.test(hash);
}

/**
 * Verifica a senha contra o hash armazenado.
 *
 * Aceita hashes bcrypt (formato atual) e hashes SHA-256 legados
 * (migrados para bcrypt no primeiro acesso bem-sucedido).
 */
export function verificarSenha(senha: string, hashArmazenado: string): boolean {
  if (!senha || !hashArmazenado) return false;

  if (PREFIXO_BCRYPT.test(hashArmazenado)) {
    try {
      return bcrypt.compareSync(senha, hashArmazenado);
    } catch {
      return false;
    }
  }

  if (ehHashLegado(hashArmazenado)) {
    return compararSeguro(hashSha256(senha), hashArmazenado.toLowerCase());
  }

  return false;
}

/**
 * Gera token aleatório seguro (usado na recuperação de senha).
 * Devolve o token em claro e o hash que deve ser persistido.
 */
export function gerarTokenTemporario(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashSha256(token) };
}

/** Gera o hash SHA-256 de um token, para comparação sem armazenar o token. */
export function hashToken(token: string): string {
  return hashSha256(token);
}
