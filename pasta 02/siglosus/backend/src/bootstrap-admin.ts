/** Inicialização segura do primeiro administrador em produção, sem seed público. */
import { Container } from './application/Container';
import { Usuario } from './domain/entities';
import { PerfilUsuario } from './domain/enums';
import { ConfiguracaoSistema } from './patterns/singleton/ConfiguracaoSistema';

const config = ConfiguracaoSistema.obterInstancia();
if (config.obter('ambiente') !== 'production') {
  throw new Error('O bootstrap de administrador só é permitido em production.');
}
const arquivoPersistencia = config.obter('arquivoPersistencia');
if (!arquivoPersistencia) {
  throw new Error('SIGLOSUS_ARQUIVO_PERSISTENCIA deve apontar para o arquivo de dados.');
}

const nome = process.env.SIGLOSUS_ADMIN_NOME?.trim() ?? '';
const email = process.env.SIGLOSUS_ADMIN_EMAIL?.trim().toLowerCase() ?? '';
const cpf = (process.env.SIGLOSUS_ADMIN_CPF ?? '').replace(/\D/g, '');
const senha = process.env.SIGLOSUS_ADMIN_SENHA ?? '';
if (nome.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    cpf.length !== 11 || senha.length < 12) {
  throw new Error('Defina SIGLOSUS_ADMIN_NOME, SIGLOSUS_ADMIN_EMAIL, SIGLOSUS_ADMIN_CPF (11 dígitos) e SIGLOSUS_ADMIN_SENHA (mínimo 12 caracteres).');
}

const container = new Container({ arquivoPersistencia });
if (container.usuarios.listar().length !== 0) {
  throw new Error('Bootstrap recusado: já existem usuários. Utilize o cadastro autorizado da aplicação.');
}
container.usuarios.salvar(new Usuario(
  container.usuarios.proximoId(), nome, cpf, email,
  Usuario.hashSenha(senha), PerfilUsuario.ADMINISTRADOR,
));
container.persistir();
console.log(`Administrador inicial cadastrado: ${email}. Revogue imediatamente as variáveis de bootstrap.`);
