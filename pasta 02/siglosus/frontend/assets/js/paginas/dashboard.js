/* Painel gerencial (RF21) */
async function carregarPainel() {
  const kpis = document.getElementById('kpis');
  const tabelaCriticos = document.getElementById('tabela-criticos');
  const tabelaAlertas = document.getElementById('tabela-alertas');

  try {
    const [painel, criticos, alertas] = await Promise.all([
      api.get('/relatorios/dashboard'),
      api.get('/estoque?apenasCriticos=true'),
      api.get('/alertas'),
    ]);

    const cartoes = [
      { rotulo: 'Unidades atendidas', valor: painel.unidadesAtendidas, icone: 'hospital' },
      { rotulo: 'Itens monitorados', valor: painel.itensMonitorados, icone: 'estoque' },
      { rotulo: 'Itens críticos', valor: painel.itensCriticos, icone: 'aviso', alerta: true },
      { rotulo: 'Alertas abertos', valor: painel.alertasAbertos, icone: 'alertas', alerta: true },
    ];
    kpis.innerHTML = cartoes
      .map(
        (c) =>
          `<div class="card kpi ${c.alerta && c.valor > 0 ? 'alerta' : ''}">` +
          `<div class="rotulo">${iconeSvg(c.icone)}<span>${c.rotulo}</span></div>` +
          `<div class="valor">${c.valor}</div></div>`,
      )
      .join('');

    tabelaCriticos.innerHTML = criticos.length
      ? criticos
          .map(
            (e) =>
              `<tr><td>${e.unidadeNome}</td><td>${e.medicamentoNome}</td>` +
              `<td><strong>${e.quantidadeAtual}</strong></td><td>${e.nivelMinimo}</td>` +
              `<td>${badgeRisco(e.nivelRisco)}</td></tr>`,
          )
          .join('')
      : '<tr><td colspan="5" class="vazio">Nenhum item crítico.</td></tr>';

    tabelaAlertas.innerHTML = alertas.length
      ? alertas
          .slice(0, 8)
          .map(
            (a) =>
              `<tr><td>Unidade #${a.unidadeId}</td><td>Medicamento #${a.medicamentoId}</td>` +
              `<td>${badgeRisco(a.nivelRisco)}</td><td>${formatarData(a.geradoEm)}</td></tr>`,
          )
          .join('')
      : '<tr><td colspan="4" class="vazio">Sem alertas abertos.</td></tr>';
  } catch (ex) {
    toast(ex.message, true);
  }
}

document.getElementById('btn-sincronizar').addEventListener('click', async (e) => {
  const alvo = document.getElementById('resultado-sincronizacao');
  e.target.disabled = true;
  e.target.textContent = 'Sincronizando…';
  try {
    const resultados = await api.post('/integracoes/sincronizar', { usuarioId: 1 });
    alvo.textContent = resultados
      .map((r) => `${r.sistema}: ${r.atualizados}/${r.registrosRecebidos} atualizados (${r.divergencias} divergências)`)
      .join(' · ');
    toast('Sincronização concluída.');
    carregarPainel();
  } catch (ex) {
    toast(ex.message, true);
  } finally {
    e.target.disabled = false;
    e.target.textContent = 'Sincronizar agora (UC07)';
  }
});

carregarPainel();
