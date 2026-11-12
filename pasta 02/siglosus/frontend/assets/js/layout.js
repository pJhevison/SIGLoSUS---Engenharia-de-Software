/* ==========================================================================
   Layout comum das telas (menu lateral + barra superior) e utilidades.
   ========================================================================== */

/* Ícones em SVG inline (traço herda a cor do texto via currentColor). */
const ICONES = {
  painel:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
    '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  estoque:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M21 8.5v7a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 15.5v-7a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8.5Z"/>' +
    '<path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  alertas:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>' +
    '<path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  redistribuicao:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="m17 2 4 4-4 4"/><path d="M3 6h18"/>' +
    '<path d="m7 22-4-4 4-4"/><path d="M21 18H3"/></svg>',
  rotas:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/>' +
    '<circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
  entregas:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1Z"/>' +
    '<path d="M8 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>' +
    '<path d="m9 14 2 2 4-4"/></svg>',
  integracoes:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M9 2v6"/><path d="M15 2v6"/>' +
    '<path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z"/><path d="M12 17v5"/></svg>',
  relatorios:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M3 3v18h18"/>' +
    '<rect x="7" y="12" width="3" height="6" rx="1"/>' +
    '<rect x="12" y="8" width="3" height="10" rx="1"/>' +
    '<rect x="17" y="5" width="3" height="13" rx="1"/></svg>',
  cadastros:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/></svg>',
  sair:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
    '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
  hospital:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15"/><path d="M2 21h20"/>' +
    '<path d="M12 8v6"/><path d="M9 11h6"/></svg>',
  aviso:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>' +
    '<path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  usuarios:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' +
    '<path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  mais:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  medicamentos:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="m10.5 20.5-7-7a4.95 4.95 0 1 1 7-7l7 7a4.95 4.95 0 1 1-7 7Z"/><path d="m8.5 8.5 7 7"/></svg>',
  trilha:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>' +
    '<path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"/></svg>',
};

/** Devolve o SVG do ícone informado (string vazia se o nome não existir). */
function iconeSvg(nome) {
  return ICONES[nome] || '';
}

const NAV = [
  { href: 'dashboard.html', icone: 'painel', rotulo: 'Painel' },
  { href: 'estoque.html', icone: 'estoque', rotulo: 'Estoque' },
  { href: 'alertas.html', icone: 'alertas', rotulo: 'Alertas' },
  { href: 'redistribuicao.html', icone: 'redistribuicao', rotulo: 'Redistribuição' },
  { href: 'rotas.html', icone: 'rotas', rotulo: 'Rotas' },
  { href: 'entregas.html', icone: 'entregas', rotulo: 'Entregas' },
  { href: 'integracoes.html', icone: 'integracoes', rotulo: 'Integrações' },
  { href: 'relatorios.html', icone: 'relatorios', rotulo: 'Relatórios' },
  { href: 'cadastros.html', icone: 'cadastros', rotulo: 'Cadastros' },
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
          `<span class="nav-ico">${iconeSvg(i.icone)}</span>${i.rotulo}</a>`,
      ).join('')}</nav>` +
      `<div class="sidebar-foot"><a href="#" id="sair">${iconeSvg('sair')} Sair</a></div>`;
    const sair = document.getElementById('sair');
    if (sair) sair.addEventListener('click', (e) => { e.preventDefault(); Sessao.sair(); });
  }

  if (topbar) {
    const nome = sessao ? esc(sessao.usuario.nome) : 'visitante';
    const perfil = sessao ? esc(sessao.usuario.perfil) : '';
    topbar.innerHTML =
      `<h1>${esc(titulo)}</h1>` +
      `<div class="user">${nome}${perfil ? ' · <strong>' + perfil + '</strong>' : ''}</div>`;
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
  return `<span class="badge ${ROTULO_RISCO[risco] || 'cinza'}">${esc(risco)}</span>`;
}

const ROTULO_STATUS = {
  SUGERIDA: 'amarelo', APROVADA: 'verde', REJEITADA: 'vermelho', CONCLUIDA: 'azul',
  PLANEJADA: 'azul', EM_ANDAMENTO: 'amarelo', PENDENTE: 'cinza', EM_TRANSITO: 'amarelo',
  ENTREGUE: 'verde', COM_DIVERGENCIA: 'vermelho', ABERTO: 'vermelho', RESOLVIDO: 'verde',
  ATIVA: 'verde', ERRO: 'vermelho', INATIVA: 'cinza',
};

function badgeStatus(status) {
  return `<span class="badge ${ROTULO_STATUS[status] || 'cinza'}">${esc(status)}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  montarLayout(document.body.dataset.titulo || 'SIGLoSUS');
});
