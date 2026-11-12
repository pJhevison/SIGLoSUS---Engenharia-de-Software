/* Integração com sistemas de saúde externos (UC07 / RF07) — padrão Adapter */
async function carregarIntegracoes() {
  const dados = await api.get('/integracoes');
  const tbody = document.getElementById('tabela-integracoes');
  tbody.innerHTML = dados.configuradas.length
    ? dados.configuradas
        .map(
          (i) =>
            `<tr><td><strong>${esc(i.sistema)}</strong></td><td>${esc(i.endpoint)}</td>` +
            `<td>${badgeStatus(i.status)}</td>` +
            `<td>${i.ultimaSincronizacao ? formatarData(i.ultimaSincronizacao) : '—'}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="vazio">Nenhuma integração configurada.</td></tr>';

  document.getElementById('i-sistema').innerHTML =
    '<option value="">Todos</option>' +
    dados.adaptadores.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
}

document.getElementById('btn-sincronizar').addEventListener('click', async (e) => {
  const alvo = document.getElementById('resultado');
  const sistema = document.getElementById('i-sistema').value;
  e.target.disabled = true;
  e.target.textContent = 'Sincronizando…';
  try {
    const resultados = await api.post('/integracoes/sincronizar', {
      sistema: sistema || undefined,
    });
    alvo.innerHTML = resultados
      .map(
        (r) =>
          `<div class="linha-ok">${iconeSvg('check')}<span><strong>${esc(r.sistema)}</strong>: ` +
          `${esc(r.atualizados)}/${esc(r.registrosRecebidos)} registros atualizados` +
          `${r.divergencias ? ` · <span style="color:var(--vermelho)">${esc(r.divergencias)} divergência(s)</span>` : ''}` +
          `</span></div>`,
      )
      .join('');
    toast('Sincronização concluída.');
    carregarIntegracoes();
  } catch (ex) {
    toast(ex.message, true);
  } finally {
    e.target.disabled = false;
    e.target.textContent = 'Sincronizar';
  }
});

carregarIntegracoes().catch((ex) => toast(ex.message, true));
