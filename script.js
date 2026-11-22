const API_URL = 'https://cardapio-web-production-2d729e78.up.railway.app';
const CHAVE_CARRINHO = 'carrinho';

let categorias = [];
let pratos = [];
let categoriaAtiva = 'TODAS';

// ==========================================
// 1. FUNÇÕES AUXILIARES (usadas em várias páginas)
// ==========================================
function formatarMoeda(valor) {
    return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
}

function mostrarAvisoToast(mensagem, duracao = 2500) {
    const toast = document.getElementById('toastSucesso');
    if (!toast || !mensagem) return;

    document.getElementById('textoToast').textContent = mensagem;
    toast.classList.add('mostrar');
    setTimeout(() => toast.classList.remove('mostrar'), duracao);
}

async function chamarApi(caminho, metodo = 'GET', corpo = null) {
    const opcoes = { method: metodo, cache: 'no-store' };
    if (corpo) {
        opcoes.headers = { 'Content-Type': 'application/json' };
        opcoes.body = JSON.stringify(corpo);
    }

    let resposta;
    try {
        resposta = await fetch(API_URL + caminho, opcoes);
    } catch (erro) {
        throw new Error('Erro de conexão com o servidor.');
    }

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível concluir a operação.');
    }
    return dados;
}

async function executarAcao(caminho, metodo, corpo) {
    try {
        const resposta = await chamarApi(caminho, metodo, corpo);
        mostrarAvisoToast(resposta.mensagem, 3000);
        return true;
    } catch (erro) {
        alert(erro.message);
        return false;
    }
}

// ==========================================
// 2. CARRINHO (guardado no localStorage)
// ==========================================
function lerCarrinho() {
    return JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || [];
}

function salvarCarrinho(itens) {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
    atualizarRodapeCarrinho();
}

function limparCarrinho() {
    localStorage.removeItem(CHAVE_CARRINHO);
}

function calcularTotais(itens) {
    let qtd = 0;
    let total = 0;

    itens.forEach((item) => {
        const quantidade = Number(item.quantidade) || 1;
        qtd += quantidade;
        total += quantidade * (Number(item.preco) || 0);
    });

    return { qtd, total };
}

function atualizarRodapeCarrinho() {
    const elQtd = document.getElementById('rodape-qtd');
    const elTotal = document.getElementById('rodape-total');
    if (!elQtd || !elTotal) return;

    const { qtd, total } = calcularTotais(lerCarrinho());
    elQtd.textContent = qtd;
    elTotal.textContent = formatarMoeda(total);
}

function adicionarItem(prato, quantidade) {
    const qtd = Number(quantidade) || 1;
    if (qtd < 1) return;

    const itens = lerCarrinho();
    const itemExistente = itens.find((item) => item.id_prato === prato.id_prato);

    if (itemExistente) {
        itemExistente.quantidade += qtd;
    } else {
        itens.push({
            id_prato: prato.id_prato,
            nome_prato: prato.nome_prato,
            preco: Number(prato.preco_prato),
            quantidade: qtd
        });
    }

    salvarCarrinho(itens);
    mostrarAvisoToast(`${qtd}x ${prato.nome_prato} adicionado(s) ao carrinho!`);
}

// ==========================================
// 3. CATEGORIAS (listar, adicionar, modificar, remover)
// ==========================================
async function carregarCategoriasEmCards() {
    const grid = document.getElementById('gridCategorias');

    try {
        const dados = await chamarApi('/categorias');
        grid.innerHTML = '';

        if (dados.length === 0) {
            grid.innerHTML = '<p>Nenhuma categoria cadastrada.</p>';
            return;
        }

        dados.forEach((cat) => {
            const descricao = cat.descricao_categoria ? ` - ${cat.descricao_categoria}` : '';

            const card = document.createElement('div');
            card.className = 'card-categoria';
            card.innerHTML = `
                <div class="card-info">
                    <h3>${cat.nome_categoria}</h3>
                    <p>${cat.total_pratos || 0} prato(s)${descricao}</p>
                </div>
                <div class="card-divider"></div>
                <div class="card-acoes">
                    <button type="button" class="btn-ver" onclick="window.location.href='gerenciamento_pratos.html?categoria_id=${cat.id_categoria}'">Editar Pratos</button>
                    <button type="button" class="btn-editar" onclick="window.location.href='gerenciamento_categorias.html'">Editar Categoria</button>
                    <button type="button" class="btn-excluir" onclick="removerCategoria(${cat.id_categoria}).then((ok) => ok && carregarCategoriasEmCards())">Excluir Categoria</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (erro) {
        console.error('Erro ao carregar as categorias:', erro);
        grid.innerHTML = '<p>Erro ao carregar as categorias.</p>';
    }
}

function adicionarCategoria(dadosCategoria) {
    return executarAcao('/categorias', 'POST', dadosCategoria);
}

function modificarCategoria(id_categoria, novaDescricao) {
    return executarAcao(`/categorias/${id_categoria}`, 'PUT', { descricao_categoria: novaDescricao });
}

async function removerCategoria(id_categoria) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return false;
    return executarAcao(`/categorias/${id_categoria}`, 'DELETE');
}

// ==========================================
// 4. PRATOS (adicionar, modificar disponibilidade, remover)
// ==========================================
function adicionarPrato(dadosPrato) {
    return executarAcao('/pratos', 'POST', dadosPrato);
}

function alternarDisponibilidadePrato(id_prato, disponivelAtual) {
    const novaDisponibilidade = Number(disponivelAtual) === 1 ? 0 : 1;
    return executarAcao(`/pratos/${id_prato}/disponibilidade`, 'PATCH', { disponivel: novaDisponibilidade });
}

async function removerPrato(id_prato) {
    if (!confirm('Tem certeza que deseja excluir este prato?')) return false;
    return executarAcao(`/pratos/${id_prato}`, 'DELETE');
}

// ==========================================
// 5. CARDÁPIO (index.html)
// ==========================================
async function carregarDados() {
    try {
        // Busca as duas listas ao mesmo tempo.
        [categorias, pratos] = await Promise.all([chamarApi('/categorias'), chamarApi('/pratos')]);
        renderizarFiltros();
        renderizarCardapio();
    } catch (erro) {
        console.error('Erro ao carregar cardápio:', erro);
        document.getElementById('lista-cardapio').innerHTML = '<p>Não foi possível carregar o cardápio agora.</p>';
    }
}

function criarBotaoFiltro(texto, idCategoria) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = texto;
    botao.onclick = () => {
        categoriaAtiva = idCategoria;
        renderizarCardapio();
    };
    return botao;
}

function renderizarFiltros() {
    const divFiltros = document.getElementById('filtros-categoria');
    divFiltros.innerHTML = '';
    divFiltros.appendChild(criarBotaoFiltro('Todas', 'TODAS'));

    categorias.forEach((cat) => {
        const temPrato = pratos.some((p) => p.id_categoria_prato === cat.id_categoria && p.disponivel !== 0);
        if (temPrato) {
            divFiltros.appendChild(criarBotaoFiltro(cat.nome_categoria, cat.id_categoria));
        }
    });
}

function renderizarCardapio() {
    const container = document.getElementById('lista-cardapio');
    const busca = document.getElementById('campo-busca').value.toLowerCase();
    const mostrarEsgotados = document.getElementById('toggle-esgotados').checked;
    let totalPratosVisiveis = 0;

    container.innerHTML = '';

    categorias.forEach((cat) => {
        if (categoriaAtiva !== 'TODAS' && cat.id_categoria !== categoriaAtiva) return;

        const pratosDaCategoria = pratos.filter((p) => {
            const mesmaCategoria = p.id_categoria_prato === cat.id_categoria;
            const disponivelOk = mostrarEsgotados || p.disponivel !== 0;
            const buscaOk =
                (p.nome_prato || '').toLowerCase().includes(busca) ||
                (p.desc_prato || '').toLowerCase().includes(busca);
            return mesmaCategoria && disponivelOk && buscaOk;
        });

        if (pratosDaCategoria.length === 0) return;

        totalPratosVisiveis += pratosDaCategoria.length;

        const secao = document.createElement('section');
        secao.className = 'secao-categoria';
        secao.innerHTML = `<h2 class="titulo-categoria-destaque">${cat.nome_categoria}</h2>`;

        pratosDaCategoria.forEach((prato) => {
            const esgotado = prato.disponivel === 0;
            const desc = (prato.desc_prato || '').trim();

            const card = document.createElement('div');
            card.className = 'card-prato';
            card.innerHTML = `
                <div class="prato-esquerda">
                    <strong class="prato-nome">${prato.nome_prato}</strong>
                </div>
                <div class="prato-meio">
                    ${desc ? `<span class="prato-desc">${desc}</span>` : ''}
                </div>
                <div class="prato-direita">
                    <span class="prato-preco">${formatarMoeda(prato.preco_prato)}</span>
                    <div class="prato-controles">
                        <input type="number" min="1" value="1" ${esgotado ? 'disabled' : ''} />
                        <button type="button" ${esgotado ? 'disabled' : ''}>${esgotado ? 'Esgotado' : 'Adicionar'}</button>
                    </div>
                </div>
            `;

            const inputQtd = card.querySelector('input');
            card.querySelector('button').onclick = () => {
                adicionarItem(prato, inputQtd.value);
                inputQtd.value = 1;
            };

            secao.appendChild(card);
        });

        container.appendChild(secao);
    });

    document.getElementById('resumo-opcoes').textContent = `${totalPratosVisiveis} opções disponíveis hoje`;

    if (totalPratosVisiveis === 0) {
        container.innerHTML = '<p>Nenhum prato encontrado.</p>';
    }
}

// ==========================================
// 6. INICIALIZAÇÃO (roda em todas as páginas que carregam este arquivo)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    atualizarRodapeCarrinho();

    if (document.getElementById('gridCategorias')) {
        carregarCategoriasEmCards();
    }

    if (document.getElementById('lista-cardapio')) {
        document.getElementById('campo-busca').addEventListener('input', renderizarCardapio);
        document.getElementById('toggle-esgotados').addEventListener('change', renderizarCardapio);
        carregarDados();
    }
});