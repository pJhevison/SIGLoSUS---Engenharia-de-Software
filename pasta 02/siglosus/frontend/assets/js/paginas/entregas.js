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
            `<td>${esc(nomesUnidades[e.unidadeDestinoId] || e.unidadeDestinoId)}</td>` +
            `<td>${formatarData(e.dataHoraPrevista)}</td><td>${badgeStatus(e.status)}</td>` +
            `<td>${e.dataHoraReal ? formatarData(e.dataHoraReal) : '—'}</td>` +
            `<td>${
              e.status === 'EM_TRANSITO' || e.status === 'PENDENTE'
                ? `<button class="btn pequeno sucesso" data-acao="confirmar" data-id="${e.id}">Confirmar</button> ` +
                  `<button class="btn pequeno perigo" data-acao="confirmar-divergencia" data-id="${e.id}">Com divergência</button>`
                : '—'
            }</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="7" class="vazio">Nenhuma entrega registrada. Despache uma rota primeiro.</td></tr>';
}

async function confirmar(id, divergencia = false) {
  try {
    // A confirmação entra na fila local quando não há conexão (uso offline do
    // motorista) e é sincronizada automaticamente quando a rede voltar.
    const resposta = await api.post(
      `/entregas/${id}/confirmar`,
      {
        divergencia,
        observacao: divergencia ? 'Divergência registrada na conferência' : 'Recebimento conferido',
      },
      { idem: `entrega-${id}-confirmar` },
    );
    if (resposta && resposta.offline) {
      toast(`Entrega ${id} registrada na fila offline. Ela será sincronizada na reconexão.`);
    } else {
      toast(`Entrega ${id} ${divergencia ? 'registrada com divergência' : 'confirmada'}.`);
    }
    carregarEntregas();
  } catch (ex) {
    toast(ex.message, true);
  }
}

/* Delegação de eventos: evita manipuladores inline (CSP sem 'unsafe-inline'). */
document.getElementById('tabela-entregas').addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;
  const id = Number(botao.dataset.id);
  if (botao.dataset.acao === 'confirmar') confirmar(id, false);
  if (botao.dataset.acao === 'confirmar-divergencia') confirmar(id, true);
});

(async () => {
  try {
    await carregarUnidades();
    await carregarEntregas();
  } catch (ex) {
    toast(ex.message, true);
  }
})();
