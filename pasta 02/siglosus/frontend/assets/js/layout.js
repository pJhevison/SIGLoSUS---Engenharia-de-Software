/* ==========================================================================
   Layout comum das telas (menu lateral + barra superior) e utilidades.
   ========================================================================== */

const NAV = [
  { href: 'dashboard.html', icone: '📊', rotulo: 'Painel' },
  { href: 'estoque.html', icone: '📦', rotulo: 'Estoque' },
  { href: 'alertas.html', icone: '🚨', rotulo: 'Alertas' },
  { href: 'redistribuicao.html', icone: '🔁', rotulo: 'Redistribuição' },
  { href: 'rotas.html', icone: '🚚', rotulo: 'Rotas' },
  { href: 'entregas.html', icone: '✅', rotulo: 'Entregas' },
  { href: 'integracoes.html', icone: '🔌', rotulo: 'Integrações' },
  { href: 'relatorios.html', icone: '📈', rotulo: 'Relatórios' },
  { href: 'cadastros.html', icone: '🗂️', rotulo: 'Cadastros' },
];

function montarLayout(titulo) {
  const atual = location.pathname.split('/').pop() || 'dashboard.html';
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  const sessao = Sessao.obter();

  if (sidebar) {
    sidebar.innerHTML =
      `<div class="brand"><span class="brand-logo">SIGLoSUS</span><small>Logística que salva vidas.</small></div>` +
      `<nav>${NAV.map(
        (i) =>
          `<a class="nav-item ${i.href === atual ? 'ativo' : ''}" href="${i.href}">` +
          `<span class="nav-ico">${i.icone}</span>${i.rotulo}</a>`,
      ).join('')}</nav>` +
      `<div class="sidebar-foot"><a href="#" id="sair">⏻ Sair</a></div>`;
    const sair = document.getElementById('sair');
    if (sair) sair.addEventListener('click', (e) => { e.preventDefault(); Sessao.sair(); });
  }

  if (topbar) {
    topbar.innerHTML =
      `<h1>${titulo}</h1>` +
      `<div class="user">${sessao ? `${sessao.usuario.nome} · <strong>${sessao.usuario.perfil}</strong>` : 'visitante'}</div>`;
  }
}

/* ------------------------------ Utilidades ------------------------------- */
function toast(mensagem, erro = false) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = mensagem;
  el.className = 'toast mostrar' + (erro ? ' erro' : '');
  setTimeout(() => { el.className = 'toast'; }, 3200);
}

function formatarData(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const ROTULO_RISCO = { BAIXO: 'verde', MEDIO: 'amarelo', ALTO: 'laranja', CRITICO: 'vermelho' };

function badgeRisco(risco) {
  return `<span class="badge ${ROTULO_RISCO[risco] || 'cinza'}">${risco}</span>`;
}

const ROTULO_STATUS = {
  SUGERIDA: 'amarelo', APROVADA: 'verde', REJEITADA: 'vermelho', CONCLUIDA: 'azul',
  PLANEJADA: 'azul', EM_ANDAMENTO: 'amarelo', PENDENTE: 'cinza', EM_TRANSITO: 'amarelo',
  ENTREGUE: 'verde', COM_DIVERGENCIA: 'vermelho', ABERTO: 'vermelho', RESOLVIDO: 'verde',
  ATIVA: 'verde', ERRO: 'vermelho', INATIVA: 'cinza',
};

function badgeStatus(status) {
  return `<span class="badge ${ROTULO_STATUS[status] || 'cinza'}">${status}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  montarLayout(document.body.dataset.titulo || 'SIGLoSUS');
});
