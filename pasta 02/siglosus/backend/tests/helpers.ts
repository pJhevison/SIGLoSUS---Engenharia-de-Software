import request from 'supertest';
import type { Express } from 'express';

/** Perfis de demonstração criados pelo seed. */
export const CONTAS = {
  admin: { email: 'admin@siglosus.gov.br', senha: 'siglosus123' },
  gestor: { email: 'gestor@siglosus.gov.br', senha: 'siglosus123' },
  farmaceutico: { email: 'farmaceutico@siglosus.gov.br', senha: 'siglosus123' },
  almoxarife: { email: 'almoxarife@siglosus.gov.br', senha: 'siglosus123' },
  motorista: { email: 'motorista@siglosus.gov.br', senha: 'siglosus123' },
};

/** Autentica uma conta de demonstração e devolve o token de acesso. */
export async function login(app: Express, email: string, senha: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ identificador: email, senha });
  if (res.status !== 200) {
    throw new Error(`Falha ao autenticar ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

/** Atalho para autenticar a conta indicada. */
export async function tokenDe(app: Express, conta: keyof typeof CONTAS): Promise<string> {
  const { email, senha } = CONTAS[conta];
  return login(app, email, senha);
}

/** Requisição autenticada com cabeçalho Authorization. */
export function comToken(token: string) {
  return { Authorization: `Bearer ${token}` };
}
