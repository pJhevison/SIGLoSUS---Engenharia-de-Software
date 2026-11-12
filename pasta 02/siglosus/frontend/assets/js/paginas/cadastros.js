/* Cadastros e gestão de usuários (RF04 / RF05 / RF06 / RF22) */
let usuarios = [];

async function carregarUsuarios() {
  usuarios = await api.get('/usuarios');
  const tbody = document.getElementById('tabela-usuarios');
  tbody.innerHTML = usuarios
    .map(
      (u) =>
        `<tr><td>${u.id}</td><td>${esc(u.nome)}</td><td>${esc(u.email)}</td>` +
        `<td><span class="badge azul">${esc(u.perfil)}</span></td>` +
        `<td>${u.ativo ? '<span class="badge verde">ATIVO</span>' : '<span class="badge cinza">INATIVO</span>'}</td>` +
        `<td><button class="btn pequeno" onclick="editar(${u.id})">Editar</button> ` +
        `${
          u.ativo
            ? `<button class="btn pequeno perigo" onclick="inativar(${u.id})">Inativar</button>`
            : `<button class="btn pequeno" onclick="ativar(${u.id})">Ativar</button>`
        }</td></tr>`,
    )
    .join('');
}

async function carregarUnidades() {
  const unidades = await api.get('/unidades');
  document.getElementById('tabela-unidades').innerHTML = unidades
    .map(
      (u) =>
        `<tr><td>${u.id}</td><td>${esc(u.nome)}</td><td>${esc(u.tipo)}</td><td>${esc(u.cnes)}</td>` +
        `<td>${esc(u.endereco.cidade)}/${esc(u.endereco.uf)}</td></tr>`,
    )
    .join('');
}

async function carregarMedicamentos() {
  const medicamentos = await api.get('/medicamentos');
  document.getElementById('tabela-medicamentos').innerHTML = medicamentos
    .map(
      (m) =>
        `<tr><td>${m.id}</td><td>${esc(m.nome)}</td><td>${esc(m.apresentacao)}</td><td>${esc(
          m.codigoCATMAT,
        )}</td>` +
        `<td>${
          m.controlado ? '<span class="badge vermelho">SIM</span>' : '<span class="badge cinza">NÃO</span>'
        }</td></tr>`,
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
            `<tr><td>${l.id}</td><td>${l.usuarioId ?? '-'}</td><td>${esc(l.acao)}</td><td>${esc(
              l.recurso,
            )}</td>` +
            `<td>${esc(l.detalhe) || '-'}</td><td>${formatarData(l.dataHora)}</td>` +
            `<td>${
              l.sucesso ? '<span class="badge verde">OK</span>' : '<span class="badge vermelho">FALHA</span>'
            }</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="7" class="vazio">Nenhum registro de auditoria.</td></tr>';
}

async function inativar(id) {
  if (!confirm(`Inativar o usuário #${id}?`)) return;
  try {
    await api.patch(`/usuarios/${id}/inativar`, {});
    toast('Usuário inativado.');
    carregarUsuarios();
  } catch (ex) {
    toast(ex.message, true);
  }
}

async function ativar(id) {
  try {
    await api.patch(`/usuarios/${id}/ativar`, {});
    toast('Usuário reativado.');
    carregarUsuarios();
  } catch (ex) {
    toast(ex.message, true);
  }
}

/** Edição de conta (RF04): nome e perfil, respeitando as permissões do servidor. */
async function editar(id) {
  const usuario = usuarios.find((u) => u.id === id);
  if (!usuario) return;
  const nome = prompt('Novo nome:', usuario.nome);
  if (nome === null) return;
  const alteracoes = { nome };
  try {
    await api.patch(`/usuarios/${id}`, alteracoes);
    toast('Usuário atualizado.');
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
    await api.post('/usuarios', { nome, cpf, email, senha, perfil });
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

document.getElementById('btn-criar-unidade').addEventListener('click', async () => {
  const nome = document.getElementById('un-nome').value.trim();
  const tipo = document.getElementById('un-tipo').value;
  const cnes = document.getElementById('un-cnes').value.trim();
  const cidade = document.getElementById('un-cidade').value.trim();
  const uf = document.getElementById('un-uf').value.trim().toUpperCase();
  if (!nome || !cnes) return toast('Preencha nome e CNES.', true);
  try {
    await api.post('/unidades', {
      nome,
      tipo,
      cnes,
      endereco: { logradouro: '', numero: '', cidade, uf, cep: '', latitude: 0, longitude: 0 },
    });
    toast('Unidade cadastrada.');
    document.getElementById('un-nome').value = '';
    document.getElementById('un-cnes').value = '';
    carregarUnidades();
  } catch (ex) {
    toast(ex.message, true);
  }
});

document.getElementById('btn-criar-medicamento').addEventListener('click', async () => {
  const nome = document.getElementById('md-nome').value.trim();
  const principioAtivo = document.getElementById('md-principio').value.trim();
  const apresentacao = document.getElementById('md-apresentacao').value.trim();
  const codigoCATMAT = document.getElementById('md-catmat').value.trim().toUpperCase();
  const controlado = document.getElementById('md-controlado').value === 'true';
  if (!nome || !principioAtivo || !codigoCATMAT) {
    return toast('Preencha nome, princípio ativo e código CATMAT.', true);
  }
  try {
    await api.post('/medicamentos', { nome, principioAtivo, apresentacao, codigoCATMAT, controlado });
    toast('Medicamento cadastrado.');
    document.getElementById('md-nome').value = '';
    document.getElementById('md-principio').value = '';
    document.getElementById('md-apresentacao').value = '';
    document.getElementById('md-catmat').value = '';
    carregarMedicamentos();
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
