/* Gerar rota de distribuição (UC16) — padrão Strategy */
let unidades = [];

async function carregarParametros() {
  const listaUnidades = await api.get('/unidades');
  unidades = listaUnidades.filter((u) => u.tipo !== 'CENTRAL_DISTRIBUICAO');

  // Veículos do cenário de demonstração (seed).
  document.getElementById('r-veiculo').innerHTML =
    '<option value="1">ABC-1234 — Caminhão leve (1500 kg)</option>' +
    '<option value="2">XYZ-5678 — Furgão (400 kg)</option>';

  document.getElementById('r-destinos').innerHTML = unidades
    .map(
      (u) =>
        `<label style="font-weight:500;color:var(--cinza-900);display:flex;gap:8px;align-items:center;border:1px solid var(--cinza-200);border-radius:8px;padding:8px 10px">` +
        `<input type="checkbox" class="destino" value="${u.id}" style="width:auto" /> ${esc(u.nome)}</label>`,
    )
    .join('');
}

async function carregarRotas() {
  const rotas = await api.get('/rotas');
  const tbody = document.getElementById('tabela-rotas');
  tbody.innerHTML = rotas.length
    ? rotas
        .map(
          (r) =>
            `<tr><td>${r.id}</td><td>Veículo #${r.veiculoId}</td><td>${r.paradas.length}</td>` +
            `<td>${r.distanciaTotalKm.toFixed(1)} km</td><td>${r.tempoEstimadoMin} min</td>` +
            `<td>${r.estrategia || '—'}</td><td>${badgeStatus(r.status)}</td>` +
            `<td>${
              r.status === 'PLANEJADA'
                ? `<button class="btn pequeno" onclick="despachar(${r.id})">Despachar (UC17)</button>`
                : '—'
            }</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="8" class="vazio">Nenhuma rota gerada.</td></tr>';
}

async function despachar(id) {
  try {
    const entregas = await api.post(`/rotas/${id}/despachar`, {});
    toast(`Rota ${id} despachada — ${entregas.length} entrega(s) gerada(s).`);
    carregarRotas();
  } catch (ex) {
    toast(ex.message, true);
  }
}

document.getElementById('btn-gerar').addEventListener('click', async (e) => {
  const destinos = [...document.querySelectorAll('.destino:checked')].map((c) => Number(c.value));
  if (destinos.length === 0) return toast('Selecione ao menos uma unidade de destino.', true);
  e.target.disabled = true;
  try {
    const rota = await api.post('/rotas', {
      veiculoId: Number(document.getElementById('r-veiculo').value),
      unidadesDestinoIds: destinos,
      estrategia: document.getElementById('r-estrategia').value,
    });
    const card = document.getElementById('card-resultado');
    card.style.display = 'block';
    document.getElementById('resultado-titulo').textContent = `Rota #${rota.id} — ${rota.estrategia}`;
    document.getElementById('resultado-corpo').innerHTML =
      `<p><strong>Distância total:</strong> ${rota.distanciaTotalKm.toFixed(1)} km · ` +
      `<strong>Tempo estimado:</strong> ${rota.tempoEstimadoMin} min</p>` +
      `<table><thead><tr><th>Ordem</th><th>Unidade</th><th>Prioridade</th></tr></thead><tbody>` +
      rota.paradas
        .map(
          (p) =>
            `<tr><td>${p.ordem}</td><td>${esc(p.unidade.nome)}</td>` +
            `<td>${p.prioridade > 0 ? `<span class="badge laranja">${esc(p.prioridade)}</span>` : '—'}</td></tr>`,
        )
        .join('') +
      '</tbody></table>';
    toast('Rota gerada com sucesso.');
    carregarRotas();
  } catch (ex) {
    toast(ex.message, true);
  } finally {
    e.target.disabled = false;
  }
});

(async () => {
  try {
    await carregarParametros();
    await carregarRotas();
  } catch (ex) {
    toast(ex.message, true);
  }
})();
