/* Confirmação de recebimento (UC18 / RF17) */
let nomesUnidades = {};

async function carregarUnidades() {
  const unidades = await api.get('/unidades');
  unidades.forEach((u) => (nomesUnidades[u.id] = u.nome));
}

async function carregarEntregas() {
  const entregas = await api.get('/entregas');
  const tbody = document.getElementById('tabela-entregas');
  tbody.innerHTML = entregas.length
    ? entregas
        .map(
          (e) =>
            `<tr><td>${e.id}</td><td>#${e.rotaId}</td>` +
            `<td>${nomesUnidades[e.unidadeDestinoId] || e.unidadeDestinoId}</td>` +
            `<td>${formatarData(e.dataHoraPrevista)}</td><td>${badgeStatus(e.status)}</td>` +
            `<td>${e.dataHoraReal ? formatarData(e.dataHoraReal) : '—'}</td>` +
            `<td>${
              e.status === 'EM_TRANSITO' || e.status === 'PENDENTE'
                ? `<button class="btn pequeno sucesso" onclick="confirmar(${e.id})">Confirmar</button> ` +
                  `<button class="btn pequeno perigo" onclick="confirmar(${e.id}, true)">Com divergência</button>`
                : '—'
            }</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="7" class="vazio">Nenhuma entrega registrada. Despache uma rota primeiro.</td></tr>';
}

async function confirmar(id, divergencia = false) {
  try {
    await api.post(`/entregas/${id}/confirmar`, {
      usuarioId: 3,
      divergencia,
      observacao: divergencia ? 'Divergência registrada na conferência' : 'Recebimento conferido',
    });
    toast(`Entrega ${id} ${divergencia ? 'registrada com divergência' : 'confirmada'}.`);
    carregarEntregas();
  } catch (ex) {
    toast(ex.message, true);
  }
}

(async () => {
  try {
    await carregarUnidades();
    await carregarEntregas();
  } catch (ex) {
    toast(ex.message, true);
  }
})();
