/* Consulta de estoque (UC09) e registro de movimentação (RF08) */
let itensAtuais = [];

async function carregarSeletores() {
  const [unidades, medicamentos] = await Promise.all([api.get('/unidades'), api.get('/medicamentos')]);
  document.getElementById('f-unidade').innerHTML += unidades
    .map((u) => `<option value="${u.id}">${esc(u.nome)}</option>`)
    .join('');
  document.getElementById('f-medicamento').innerHTML += medicamentos
    .map((m) => `<option value="${m.id}">${esc(m.nome)}</option>`)
    .join('');
}

async function carregarEstoque() {
  const unidadeId = document.getElementById('f-unidade').value;
  const medicamentoId = document.getElementById('f-medicamento').value;
  const criticos = document.getElementById('f-criticos').checked;

  const params = new URLSearchParams();
  if (unidadeId) params.set('unidadeId', unidadeId);
  if (medicamentoId) params.set('medicamentoId', medicamentoId);
  if (criticos) params.set('apenasCriticos', 'true');

  itensAtuais = await api.get('/estoque' + (params.toString() ? `?${params}` : ''));
  const tbody = document.getElementById('tabela-estoque');
  tbody.innerHTML = itensAtuais.length
    ? itensAtuais
        .map(
          (e) =>
            `<tr><td>${esc(e.unidadeNome)}</td><td>${esc(e.medicamentoNome)}</td>` +
            `<td><strong>${esc(e.quantidadeAtual)}</strong></td><td>${esc(e.nivelMinimo)}</td>` +
            `<td>${esc(e.nivelSeguranca)}</td><td>${badgeRisco(e.nivelRisco)}</td>` +
            `<td>${formatarData(e.atualizadoEm)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="7" class="vazio">Nenhum item encontrado.</td></tr>';

  document.getElementById('m-estoque').innerHTML = itensAtuais
    .map(
      (e) =>
        `<option value="${e.estoqueId}">${esc(e.unidadeNome)} — ${esc(e.medicamentoNome)}</option>`,
    )
    .join('');
}

document.getElementById('btn-filtrar').addEventListener('click', carregarEstoque);

document.getElementById('btn-movimentar').addEventListener('click', async () => {
  try {
    await api.post('/estoque/movimentacoes', {
      estoqueId: Number(document.getElementById('m-estoque').value),
      tipo: document.getElementById('m-tipo').value,
      quantidade: Number(document.getElementById('m-quantidade').value),
    });
    toast('Movimentação registrada.');
    await carregarEstoque();
  } catch (ex) {
    toast(ex.message, true);
  }
});

(async () => {
  try {
    await carregarSeletores();
    await carregarEstoque();
  } catch (ex) {
    toast(ex.message, true);
  }
})();
