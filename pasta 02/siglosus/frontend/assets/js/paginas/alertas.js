/* Alertas de desabastecimento (RF11) */
async function carregarAlertas() {
  const alertas = await api.get('/alertas');
  const tbody = document.getElementById('tabela-alertas');
  tbody.innerHTML = alertas.length
    ? alertas
        .map(
          (a) =>
            `<tr><td>${a.id}</td><td>Unidade #${a.unidadeId}</td><td>Medicamento #${a.medicamentoId}</td>` +
            `<td>${badgeRisco(a.nivelRisco)}</td><td>${badgeStatus(a.status)}</td>` +
            `<td>${formatarData(a.geradoEm)}</td>` +
            `<td>${
              a.status === 'RESOLVIDO'
                ? '—'
                : `<button class="btn pequeno" data-acao="resolver" data-id="${a.id}">Resolver</button>`
            }</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="7" class="vazio">Nenhum alerta registrado.</td></tr>';
}

async function resolver(id) {
  try {
    await api.patch(`/alertas/${id}/resolver`, {});
    toast(`Alerta ${id} resolvido.`);
    carregarAlertas();
  } catch (ex) {
    toast(ex.message, true);
  }
}

/* Delegação de eventos: evita manipuladores inline (CSP sem 'unsafe-inline'). */
document.getElementById('tabela-alertas').addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao="resolver"]');
  if (botao) resolver(Number(botao.dataset.id));
});

carregarAlertas().catch((ex) => toast(ex.message, true));
