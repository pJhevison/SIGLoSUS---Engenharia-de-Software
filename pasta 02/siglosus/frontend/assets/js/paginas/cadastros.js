/* Cadastros e gestão de usuários (RF04 / RF05 / RF06 / RF22) */
let usuarios = [];

async function carregarUsuarios() {
  usuarios = await api.get('/usuarios');
  const tbody = document.getElementById('tabela-usuarios');
  tbody.innerHTML = usuarios
    .map(
      (u) =>
        `<tr><td>${u.id}</td><td>${u.nome}</td><td>${u.email}</td>` +
        `<td><span class="badge azul">${u.perfil}</span></td>` +
        `<td>${u.ativo ? '<span class="badge verde">ATIVO</span>' : '<span class="badge cinza">INATIVO</span>'}</td>` +
        `<td>${
          u.ativo ? `<button class="btn pequeno perigo" onclick="inativar(${u.id})">Inativar</button>` : '—'
        }</td></tr>`,
    )
    .join('');
}

async function carregarUnidades() {
  const unidades = await api.get('/unidades');
  document.getElementById('tabela-unidades').innerHTML = unidades
    .map(
      (u) =>
        `<tr><td>${u.id}</td><td>${u.nome}</td><td>${u.tipo}</td><td>${u.cnes}</td>` +
        `<td>${u.endereco.cidade}/${u.endereco.uf}</td></tr>`,
    )
    .join('');
}

async function carregarMedicamentos() {
  const medicamentos = await api.get('/medicamentos');
  document.getElementById('tabela-medicamentos').innerHTML = medicamentos
    .map(
      (m) =>
        `<tr><td>${m.id}</td><td>${m.nome}</td><td>${m.apresentacao}</td><td>${m.codigoCATMAT}</td>` +
        `<td>${m.controlado ? '<span class="badge vermelho">SIM</span>' : '<span class="badge cinza">NÃO</span>'}</td></tr>`,
    )
    .join('');
}

async function carregarAuditoria() {
  const logs = await api.get('/auditoria');
  document.getElementById('tabela-auditoria').innerHTML = logs.length
    ? logs
        .slice(0, 15)
        .map(
          (l) =>
            `<tr><td>${l.id}</td><td>${l.usuarioId ?? '—'}</td><td>${l.acao}</td><td>${l.recurso}</td>` +
            `<td>${l.detalhe || '—'}</td><td>${formatarData(l.dataHora)}</td>` +
            `<td>${l.sucesso ? '<span class="badge verde">OK</span>' : '<span class="badge vermelho">FALHA</span>'}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="7" class="vazio">Nenhum registro de auditoria.</td></tr>';
}

async function inativar(id) {
  if (!confirm(`Inativar o usuário #${id}?`)) return;
  try {
    await api.patch(`/usuarios/${id}/inativar`, { autorId: 1 });
    toast('Usuário inativado.');
    carregarUsuarios();
  } catch (ex) {
    toast(ex.message, true);
  }
}

document.getElementById('btn-criar-usuario').addEventListener('click', async () => {
  const nome = document.getElementById('u-nome').value.trim();
  const cpf = document.getElementById('u-cpf').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const senha = document.getElementById('u-senha').value;
  const perfil = document.getElementById('u-perfil').value;
  if (!nome || !email || !senha) return toast('Preencha nome, e-mail e senha.', true);
  try {
    await api.post('/usuarios', { nome, cpf, email, senha, perfil, autorId: 1 });
    toast('Usuário cadastrado.');
    document.getElementById('u-nome').value = '';
    document.getElementById('u-cpf').value = '';
    document.getElementById('u-email').value = '';
    document.getElementById('u-senha').value = '';
    carregarUsuarios();
  } catch (ex) {
    toast(ex.message, true);
  }
});

(async () => {
  try {
    await Promise.all([carregarUsuarios(), carregarUnidades(), carregarMedicamentos(), carregarAuditoria()]);
  } catch (ex) {
    toast(ex.message, true);
  }
})();
