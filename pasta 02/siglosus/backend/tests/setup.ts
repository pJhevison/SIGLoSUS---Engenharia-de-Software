/**
 * Configuração comum aos testes.
 *
 * - `BCRYPT_COST` reduzido: mantém a suíte rápida sem alterar o algoritmo.
 * - `JWT_SECRET` fixo: permite assinar e validar tokens de forma determinística.
 * - `NODE_ENV=test`: impede que a configuração exija segredo em produção.
 */
process.env.NODE_ENV = 'test';
process.env.BCRYPT_COST = process.env.BCRYPT_COST ?? '4';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'segredo-de-teste-siglosus-com-tamanho-minimo-de-32-caracteres';
process.env.TOKEN_ACESSO_VALIDADE_MIN = process.env.TOKEN_ACESSO_VALIDADE_MIN ?? '60';
process.env.TOKEN_RECUPERACAO_VALIDADE_MIN = process.env.TOKEN_RECUPERACAO_VALIDADE_MIN ?? '30';
// A suíte autentica muitas vezes; o limite por IP é testado em caso próprio.
process.env.LIMITE_LOGIN_POR_MINUTO = process.env.LIMITE_LOGIN_POR_MINUTO ?? '1000';
