// Gera um Diagrama de Casos de Uso em notação UML clássica (SVG).
const fs = require('fs');

const W = 1250, ROWH = 100, TOP = 130;
const SYS_X = 240, SYS_W = 770;
const COLX = [SYS_X + 128, SYS_X + 385, SYS_X + 642]; // centros das 3 colunas
const RX = 116, RY = 37;

const left = [
  'UC08 - Registrar movimentação de estoque',
  'UC22 - Controlar lotes e validade',
  'UC09 - Consultar estoque em tempo real',
  'UC10 - Configurar níveis de estoque',
  'UC11 - Gerar alertas de desabastecimento',
  'UC13 - Sugerir transferência entre unidades',
  'UC14 - Aprovar transferência',
  'UC15 - Gerenciar requisições',
  'UC16 - Gerar rota de distribuição',
  'UC20 - Registrar dispensação',
];
const mid = [
  'UC01 - Autenticar',
  'UC02 - Recuperar senha',
  'UC03 - Encerrar sessão',
  'UC17 - Despachar entrega',
  'UC12 - Prever demanda',
  'UC18 - Confirmar recebimento',
  'UC21 - Emitir relatórios e painéis',
];
const right = [
  'UC04 - Gerenciar usuários e perfis',
  'UC05 - Gerenciar unidades de saúde',
  'UC06 - Gerenciar catálogo de medicamentos',
  'UC07 - Sincronizar com sistemas de origem',
  'UC19 - Rastrear entrega',
];

const uc = {};
function place(list, col) { list.forEach((name, i) => { uc[name] = { x: COLX[col], y: TOP + i * ROWH, name }; }); }
place(left, 0); place(mid, 1); place(right, 2);

const ROWS = Math.max(left.length, mid.length, right.length);
const H = TOP + ROWS * ROWH + 60;

const actors = [
  { name: 'Gestor de Assistência\nFarmacêutica', x: 90, y: TOP + 1 * ROWH, side: 'L', ucs: ['UC01 - Autenticar','UC10 - Configurar níveis de estoque','UC11 - Gerar alertas de desabastecimento','UC13 - Sugerir transferência entre unidades','UC14 - Aprovar transferência','UC15 - Gerenciar requisições','UC16 - Gerar rota de distribuição','UC21 - Emitir relatórios e painéis'] },
  { name: 'Farmacêutico\nda Unidade', x: 90, y: TOP + 4.5 * ROWH, side: 'L', ucs: ['UC01 - Autenticar','UC08 - Registrar movimentação de estoque','UC09 - Consultar estoque em tempo real','UC18 - Confirmar recebimento','UC20 - Registrar dispensação'] },
  { name: 'Almoxarife / CAF', x: 90, y: TOP + 8 * ROWH, side: 'L', ucs: ['UC01 - Autenticar','UC08 - Registrar movimentação de estoque','UC09 - Consultar estoque em tempo real','UC17 - Despachar entrega','UC22 - Controlar lotes e validade','UC21 - Emitir relatórios e painéis'] },
  { name: 'Administrador\ndo Sistema', x: W - 90, y: TOP + 1 * ROWH, side: 'R', ucs: ['UC04 - Gerenciar usuários e perfis','UC05 - Gerenciar unidades de saúde','UC06 - Gerenciar catálogo de medicamentos','UC07 - Sincronizar com sistemas de origem','UC21 - Emitir relatórios e painéis'] },
  { name: 'Motorista /\nEntregador', x: W - 90, y: TOP + 4.5 * ROWH, side: 'R', ucs: ['UC01 - Autenticar','UC17 - Despachar entrega','UC19 - Rastrear entrega'] },
  { name: 'Sistema de Saúde\nExterno', x: W - 90, y: TOP + 8 * ROWH, side: 'R', ucs: ['UC07 - Sincronizar com sistemas de origem'] },
];

const rels = [
  { from: 'UC02 - Recuperar senha', to: 'UC01 - Autenticar', label: '<<extend>>' },
  { from: 'UC08 - Registrar movimentação de estoque', to: 'UC22 - Controlar lotes e validade', label: '<<include>>' },
  { from: 'UC13 - Sugerir transferência entre unidades', to: 'UC12 - Prever demanda', label: '<<include>>' },
  { from: 'UC16 - Gerar rota de distribuição', to: 'UC09 - Consultar estoque em tempo real', label: '<<include>>' },
];

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function wrap(text, max) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}
function edgePoint(cx, cy, rx, ry, px, py) {
  const th = Math.atan2((py - cy) / ry, (px - cx) / rx);
  return { x: cx + rx * Math.cos(th), y: cy + ry * Math.sin(th) };
}

let s = '';
s += `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, Calibri, Arial, sans-serif">`;
s += `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
s += `<defs>
  <marker id="openArrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">
    <path d="M2,1 L11,6 L2,11" fill="none" stroke="#7c3aed" stroke-width="1.6"/>
  </marker>
</defs>`;

// Fronteira do sistema
s += `<rect x="${SYS_X}" y="${TOP - 80}" width="${SYS_W}" height="${ROWS * ROWH + 100}" rx="14" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>`;
s += `<text x="${SYS_X + SYS_W / 2}" y="${TOP - 50}" text-anchor="middle" font-size="22" font-weight="700" fill="#1e40af">SIGLoSUS</text>`;

// Atores
for (const a of actors) {
  const x = a.x, y = a.y - 20;
  const c = '#1e40af';
  s += `<g stroke="${c}" stroke-width="2.2" fill="none">`;
  s += `<circle cx="${x}" cy="${y - 26}" r="11" fill="#dbeafe"/>`;
  s += `<line x1="${x}" y1="${y - 15}" x2="${x}" y2="${y + 18}"/>`;
  s += `<line x1="${x - 16}" y1="${y - 4}" x2="${x + 16}" y2="${y - 4}"/>`;
  s += `<line x1="${x}" y1="${y + 18}" x2="${x - 13}" y2="${y + 40}"/>`;
  s += `<line x1="${x}" y1="${y + 18}" x2="${x + 13}" y2="${y + 40}"/>`;
  s += `</g>`;
  const lines = a.name.split('\n');
  lines.forEach((ln, i) => {
    s += `<text x="${x}" y="${y + 62 + i * 16}" text-anchor="middle" font-size="14" font-weight="600" fill="#1e3a8a">${esc(ln)}</text>`;
  });
}

// Associações ator -> caso de uso
for (const a of actors) {
  const px = a.side === 'L' ? a.x + 18 : a.x - 18;
  const py = a.y - 20;
  for (const u of a.ucs) {
    const t = uc[u];
    const e = edgePoint(t.x, t.y, RX, RY, px, py);
    s += `<line x1="${px}" y1="${py}" x2="${e.x.toFixed(1)}" y2="${e.y.toFixed(1)}" stroke="#cbd5e1" stroke-width="1.4"/>`;
  }
}

// Casos de uso (elipses)
for (const k in uc) {
  const t = uc[k];
  s += `<ellipse cx="${t.x}" cy="${t.y}" rx="${RX}" ry="${RY}" fill="#fef9c3" stroke="#a16207" stroke-width="1.8"/>`;
  const lines = wrap(t.name, 26);
  const startY = t.y - (lines.length - 1) * 8;
  lines.forEach((ln, i) => {
    s += `<text x="${t.x}" y="${startY + i * 16 + 4}" text-anchor="middle" font-size="12.5" fill="#713f12">${esc(ln)}</text>`;
  });
}

// Relacionamentos include/extend
for (const r of rels) {
  const a = uc[r.from], b = uc[r.to];
  const p1 = edgePoint(a.x, a.y, RX, RY, b.x, b.y);
  const p2 = edgePoint(b.x, b.y, RX, RY, a.x, a.y);
  s += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#7c3aed" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#openArrow)"/>`;
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
  const w = r.label.length * 7 + 10;
  s += `<rect x="${(mx - w / 2).toFixed(1)}" y="${(my - 11).toFixed(1)}" width="${w}" height="18" rx="4" fill="#ffffff" opacity="0.9"/>`;
  s += `<text x="${mx.toFixed(1)}" y="${(my + 2).toFixed(1)}" text-anchor="middle" font-size="12" fill="#6d28d9">${esc(r.label)}</text>`;
}

s += `</svg>`;

fs.writeFileSync(process.argv[2], s, 'utf8');
console.log('SVG casos de uso gerado:', process.argv[2], s.length, 'bytes;', W + 'x' + H);
