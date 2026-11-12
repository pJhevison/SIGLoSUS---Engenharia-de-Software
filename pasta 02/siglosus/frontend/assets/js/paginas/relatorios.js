/* Relatórios e previsão de demanda (RF12 / RF21) */
let nomes = { unidades: {}, medicamentos: {} };

async function carregarCadastros() {
  const [unidades, medicamentos] = await Promise.all([api.get('/unidades'), api.get('/medicamentos')]);
  unidades.forEach((u) => (nomes.unidades[u.id] = u.nome));
  medicamentos.forEach((m) => (nomes.medicamentos[m.id] = m.nome));
}

async function carregarKpis() {
  const painel = await api.get('/relatorios/dashboard');
  document.getElementById('kpis').innerHTML = [
    { rotulo: 'Unidades atendidas', valor: painel.unidadesAtendidas },
    { rotulo: 'Itens monitorados', valor: painel.itensMonitorados },
    { rotulo: 'Itens críticos', valor: painel.itensCriticos },
    { rotulo: 'Unidades em risco', valor: painel.totalUnidadesEmRisco },
  ]
    .map((c) => `<div class="card kpi"><div class="rotulo">${c.rotulo}</div><div class="valor">${c.valor}</div></div>`)
    .join('');
}

async function carregarPrevisoes() {
  const previsoes = await api.get('/previsoes');
  const tbody = document.getElementById('tabela-previsoes');
  tbody.innerHTML = previsoes.length
    ? previsoes
        .map(
          (p) =>
            `<tr><td>${nomes.unidades[p.unidadeId] || p.unidadeId}</td>` +
            `<td>${nomes.medicamentos[p.medicamentoId] || p.medicamentoId}</td>` +
            `<td>${p.periodo}</td><td><strong>${p.quantidadePrevista}</strong></td>` +
            `<td>${p.metodo}</td><td>${(p.confianca * 100).toFixed(0)}%</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="6" class="vazio">Nenhuma previsão gerada.</td></tr>';
}

async function carregarRelatorios() {
  const relatorios = await api.get('/relatorios');
  const tbody = document.getElementById('tabela-relatorios');
  tbody.innerHTML = relatorios.length
    ? relatorios
        .map(
          (r) =>
            `<tr><td>${r.id}</td><td>${r.titulo}</td><td>${r.tipo}</td>` +
            `<td>${formatarData(r.geradoEm)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="vazio">Nenhum relatório gerado.</td></tr>';
}

document.getElementById('btn-prever').addEventListener('click', async (e) => {
  e.target.disabled = true;
  try {
    await api.post('/previsoes/gerar', { periodoDias: Number(document.getElementById('p-periodo').value) });
    toast('Previsões geradas.');
    carregarPrevisoes();
  } catch (ex) {
    toast(ex.message, true);
  } finally {
    e.target.disabled = false;
  }
});

document.getElementById('btn-gerar-relatorio').addEventListener('click', async () => {
  try {
    await api.post('/relatorios', { tipo: 'geral', usuarioId: 2 });
    toast('Relatório gerado.');
    carregarRelatorios();
  } catch (ex) {
    toast(ex.message, true);
  }
});

(async () => {
  try {
    await carregarCadastros();
    await Promise.all([carregarKpis(), carregarPrevisoes(), carregarRelatorios()]);
  } catch (ex) {
    toast(ex.message, true);
  }
})();
