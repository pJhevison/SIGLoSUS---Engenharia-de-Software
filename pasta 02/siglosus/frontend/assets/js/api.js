/* ==========================================================================
   Cliente da API do SIGLoSUS
   ========================================================================== */

const API_BASE =
  location.protocol === 'file:' ? 'http://localhost:3000/api' : location.origin + '/api';

async function requisicao(metodo, caminho, corpo) {
  const opcoes = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (corpo !== undefined) opcoes.body = JSON.stringify(corpo);
  const resposta = await fetch(API_BASE + caminho, opcoes);
  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!resposta.ok) {
    const erro = new Error((dados && (dados.erro || dados.message)) || 'Falha na requisição');
    erro.status = resposta.status;
    erro.codigo = dados && dados.codigo;
    throw erro;
  }
  return dados;
}

const api = {
  get: (caminho) => requisicao('GET', caminho),
  post: (caminho, corpo) => requisicao('POST', caminho, corpo),
  patch: (caminho, corpo) => requisicao('PATCH', caminho, corpo),
};

/* ------------------------------ Sessão ----------------------------------- */
const Sessao = {
  salvar(dados) {
    localStorage.setItem('siglosus.sessao', JSON.stringify(dados));
  },
  obter() {
    try {
      return JSON.parse(localStorage.getItem('siglosus.sessao'));
    } catch {
      return null;
    }
  },
  sair() {
    localStorage.removeItem('siglosus.sessao');
    location.href = 'index.html';
  },
};
