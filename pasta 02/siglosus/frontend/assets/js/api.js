/* ==========================================================================
   Cliente da API do SIGLoSUS
   --------------------------------------------------------------------------
   - Autenticação por token JWT (cabeçalho Authorization: Bearer).
   - Interrompe a sessão quando o token expira ou é invalidado (401).
   - Fila local de operações para uso offline (RNF13) com sincronização
     posterior e identificador de idempotência para evitar duplicidade.
   ========================================================================== */

/**
 * Endereço da API.
 *
 * - `window.SIGLOSUS_API_BASE` tem precedência (configuração explícita).
 * - Se as telas são servidas pela própria API (http://localhost:3000), usa a
 *   mesma origem.
 * - Se as telas forem abertas por outro servidor estático (por exemplo, o Live
 *   Server do VS Code na porta 5500) ou por `file://`, aponta para o backend
 *   na porta padrão — evita que a chamada vá para um servidor sem API.
 */
function resolverBaseApi() {
  if (window.SIGLOSUS_API_BASE) return window.SIGLOSUS_API_BASE;
  if (location.protocol === 'file:') return 'http://localhost:3000/api';
  const origem = location.origin;
  const porta = location.port;
  if (porta && porta !== '3000') return 'http://localhost:3000/api';
  return origem + '/api';
}

const API_BASE = resolverBaseApi();

const CHAVE_SESSAO = 'siglosus.sessao';
const CHAVE_FILA = 'siglosus.filaOffline';

/* ------------------------------ Sessão ----------------------------------- */
const Sessao = {
  salvar(dados) {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(dados));
  },
  obter() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    } catch {
      return null;
    }
  },
  token() {
    const sessao = Sessao.obter();
    return sessao && sessao.token ? sessao.token : null;
  },
  sair() {
    const token = Sessao.token();
    if (token) {
      // Encerramento no servidor (revogação do token — RF03).
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    localStorage.removeItem(CHAVE_SESSAO);
    location.href = 'index.html';
  },
};

/* --------------------------- Proteção do DOM ----------------------------- */
/**
 * Escapa texto vindo da API antes de inseri-lo no HTML.
 * Evita que um dado (nome de usuário, medicamento, unidade) seja interpretado
 * como marcação (XSS).
 */
function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------ Fila de operações offline ---------------------- */
const FilaOffline = {
  listar() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_FILA)) || [];
    } catch {
      return [];
    }
  },

  gravar(operacoes) {
    localStorage.setItem(CHAVE_FILA, JSON.stringify(operacoes));
  },

  enfileirar(operacao) {
    const operacoes = FilaOffline.listar();
    // Idempotência: a mesma operação não entra duas vezes na fila.
    if (!operacoes.some((o) => o.idem === operacao.idem)) {
      operacoes.push(operacao);
      FilaOffline.gravar(operacoes);
    }
  },

  /** Reenvia as operações pendentes; mantém as que falharam. */
  async sincronizar() {
    const operacoes = FilaOffline.listar();
    if (!operacoes.length) return 0;

    let enviadas = 0;
    const restantes = [];
    for (const operacao of operacoes) {
      // Uma fila de outro usuário nunca deve ser enviada com a sessão atual.
      const usuarioAtual = Sessao.obter()?.usuario?.id;
      if (!usuarioAtual || operacao.usuarioId !== usuarioAtual) {
        restantes.push(operacao);
        continue;
      }
      try {
        await requisicao(operacao.metodo, operacao.caminho, operacao.corpo, {
          semFila: true, idem: operacao.idem,
        });
        enviadas += 1;
      } catch (erro) {
        if (erro.status && erro.status >= 400 && erro.status < 500) {
          // Erro do servidor: a operação é inválida e não deve ser repetida.
          continue;
        }
        restantes.push(operacao);
      }
    }
    FilaOffline.gravar(restantes);
    return enviadas;
  },
};

window.addEventListener('online', () => {
  FilaOffline.sincronizar().then((n) => {
    if (n > 0) toast(`${n} operação(ões) offline sincronizada(s).`);
  });
});

/* ---------------------------- Requisições -------------------------------- */
function novaChaveIdempotencia() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function requisicao(metodo, caminho, corpo, opcoes = {}) {
  const sessao = Sessao.obter();
  // Uma operação nova recebe chave única; os reenvios reutilizam a mesma chave.
  const idem = metodo !== 'GET' ? (opcoes.idem || novaChaveIdempotencia()) : undefined;
  const cabecalhos = { 'Content-Type': 'application/json' };
  if (sessao && sessao.token) cabecalhos.Authorization = `Bearer ${sessao.token}`;
  if (idem) cabecalhos['Idempotency-Key'] = idem;

  let resposta;
  try {
    resposta = await fetch(API_BASE + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch (erro) {
    // Falha de rede: a operação entra na fila offline (quando permitido).
    if (!opcoes.semFila && metodo !== 'GET') {
      FilaOffline.enfileirar({ metodo, caminho, corpo, idem, usuarioId: sessao?.usuario?.id });
      return { offline: true, mensagem: 'Operação registrada na fila offline.' };
    }
    throw new Error(
      `Sem conexão com a API (${API_BASE}). Verifique se o backend está rodando (npm start).`,
    );
  }

  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    const mensagem = dados && (dados.erro || dados.message);
    const erro = new Error(
      mensagem ||
        `Falha na requisição (HTTP ${resposta.status}). ` +
          `Verifique se a API está disponível em ${API_BASE}.`,
    );
    erro.status = resposta.status;
    erro.codigo = dados && dados.codigo;
    if (resposta.status === 401) {
      // Sessão expirada ou inválida: encerra o acesso local.
      localStorage.removeItem(CHAVE_SESSAO);
      if (!location.pathname.endsWith('index.html')) location.href = 'index.html';
    }
    throw erro;
  }
  return dados;
}

const api = {
  get: (caminho) => requisicao('GET', caminho),
  post: (caminho, corpo, opcoes) => requisicao('POST', caminho, corpo, opcoes),
  patch: (caminho, corpo, opcoes) => requisicao('PATCH', caminho, corpo, opcoes),
  filaOffline: FilaOffline,
};
