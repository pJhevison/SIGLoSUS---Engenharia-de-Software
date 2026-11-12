/* Sugerir e aprovar transferências (UC13/UC14) */
let nomes = { unidades: {}, medicamentos: {} };

async function carregarCadastros() {
  const [unidades, medicamentos] = await Promise.all([api.get('/unidades'), api.get('/medicamentos')]);
  unidades.forEach((u) => (nomes.unidades[u.id] = u.nome));
  medicamentos.forEach((m) => (nomes.medicamentos[m.id] = m.nome));
}

async function carregarTransferencias() {
  const transferencias = await api.get('/transferencias');
  const tbody = document.getElementById('tabela-transferencias');
  tbody.innerHTML = transferencias.length
    ? transferencias
        .map(
          (t) =>
            `<tr><td>${t.id}</td><td>${esc(nomes.medicamentos[t.medicamentoId] || t.medicamentoId)}</td>` +
            `<td>${esc(nomes.unidades[t.unidadeOrigemId] || t.unidadeOrigemId)}</td>` +
            `<td>${esc(nomes.unidades[t.unidadeDestinoId] || t.unidadeDestinoId)}</td>` +
            `<td><strong>${t.quantidade}</strong></td><td>${badgeStatus(t.status)}</td>` +
            `<td>${
              t.status === 'SUGERIDA'
                ? `<button class="btn pequeno sucesso" data-acao="aprovar" data-id="${t.id}">Aprovar</button> ` +
                  `<button class="btn pequeno perigo" data-acao="rejeitar" data-id="${t.id}">Rejeitar</button>`
                : '—'
            }</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="7" class="vazio">Nenhuma sugestão. Clique em "Gerar sugestões".</td></tr>';
}

async function aprovar(id) {
  try {
    await api.post(`/transferencias/${id}/aprovar`, {});
    toast(`Transferência ${id} aprovada.`);
    carregarTransferencias();
  } catch (ex) {
    toast(ex.message, true);
  }
}

async function rejeitar(id) {
  const justificativa = prompt('Justificativa da rejeição:', 'Sem necessidade no momento');
  if (justificativa === null) return;
  try {
    await api.post(`/transferencias/${id}/rejeitar`, { justificativa });
    toast(`Transferência ${id} rejeitada.`);
    carregarTransferencias();
  } catch (ex) {
    toast(ex.message, true);
  }
}

/* Delegação de eventos: evita manipuladores inline (CSP sem 'unsafe-inline'). */
document.getElementById('tabela-transferencias').addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;
  const id = Number(botao.dataset.id);
  if (botao.dataset.acao === 'aprovar') aprovar(id);
  if (botao.dataset.acao === 'rejeitar') rejeitar(id);
});

document.getElementById('btn-sugerir').addEventListener('click', async (e) => {
  e.target.disabled = true;
  e.target.textContent = 'Calculando…';
  try {
    const sugestoes = await api.post('/transferencias/sugerir', {});
    toast(`${sugestoes.length} sugestão(ões) gerada(s).`);
    carregarTransferencias();
  } catch (ex) {
    toast(ex.message, true);
  } finally {
    e.target.disabled = false;
    e.target.textContent = 'Gerar sugestões de transferência (UC13)';
  }
});

(async () => {
  try {
    await carregarCadastros();
    await carregarTransferencias();
  } catch (ex) {
    toast(ex.message, true);
  }
})();
