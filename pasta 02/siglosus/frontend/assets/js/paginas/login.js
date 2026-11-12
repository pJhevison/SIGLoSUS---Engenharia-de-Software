/* ==========================================================================
   Tela de acesso: login (RF01), recuperação de senha (RF02) e logout (RF03).
   Script carregado por arquivo externo — a Content Security Policy do
   servidor não permite scripts inline.
   ========================================================================== */

const form = document.getElementById('form-login');
const erro = document.getElementById('erro');
const areaRecuperacao = document.getElementById('recuperacao');

/** Exibe a mensagem de erro no cartão de acesso. */
function mostrarErro(mensagem) {
  erro.textContent = mensagem;
  erro.style.display = 'block';
}

/** Se já houver sessão válida, encaminha diretamente ao painel. */
async function verificarSessao() {
  const sessao = Sessao.obter();
  if (!sessao || !sessao.token) return;
  try {
    await api.get('/auth/eu');
    location.href = 'dashboard.html';
  } catch (ex) {
    // Sessão expirada ou inválida: limpa o estado local e permanece na tela.
    localStorage.removeItem('siglosus.sessao');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.style.display = 'none';
  const botao = form.querySelector('button');
  botao.disabled = true;
  botao.textContent = 'Entrando…';
  try {
    const dados = await api.post('/auth/login', {
      identificador: document.getElementById('identificador').value,
      senha: document.getElementById('senha').value,
    });
    Sessao.salvar(dados);
    location.href = 'dashboard.html';
  } catch (ex) {
    mostrarErro(ex.message || 'Não foi possível autenticar.');
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
});

/* Recuperação de senha (RF02): gera um token temporário de uso único. */
document.getElementById('btn-recuperar').addEventListener('click', async () => {
  const email = document.getElementById('email-recuperacao').value.trim();
  if (!email) {
    areaRecuperacao.textContent = 'Informe o e-mail cadastrado.';
    return;
  }
  try {
    const resposta = await api.post('/auth/recuperar-senha', { email });
    areaRecuperacao.textContent = resposta.token
      ? `Token temporário: ${resposta.token} (em produção ele é enviado por e-mail).`
      : 'Se o e-mail estiver cadastrado, o token de recuperação foi enviado.';
  } catch (ex) {
    areaRecuperacao.textContent = ex.message;
  }
});

verificarSessao();
