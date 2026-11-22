const API_URL = 'https://cardapio-web-production-2d729e78.up.railway.app';

let categorias = [];
let pratos = [];
let categoriaAtiva = 'TODAS';
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

// ==========================================
// 1. CATEGORIAS (ADICIONAR, REMOVER, MODIFICAR)
// ==========================================
function carregarCategoriasEmCards() {
    fetch(`${API_URL}/categorias`)
        .then((res) => res.json())
        .then((dados) => {
            const grid = document.getElementById('gridCategorias');
            if (!grid) return;

            grid.innerHTML = '';

            if (!Array.isArray(dados) || dados.length === 0) {
                grid.innerHTML = '<p>Nenhuma categoria cadastrada.</p>';
                return;
            }

            dados.forEach((cat) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card-categoria';

                const htmlDescricao =
                    cat.descricao_categoria && cat.descricao_categoria.trim() !== ''
                        ? ` - ${cat.descricao_categoria}`
                        : '';

                cardDiv.innerHTML = `
                    <div class="card-info">
                        <h3>${cat.nome_categoria}</h3>
                        <p>${cat.total_pratos || 0} prato(s)${htmlDescricao}</p>
                    </div>
                    <div class="card-divider"></div>
                    <div class="card-acoes">
                        <button type="button" class="btn-ver" onclick="window.location.href='gerenciamento_pratos.html?categoria_id=${cat.id_categoria}'">Editar Pratos</button>
                        <button type="button" class="btn-editar" onclick="window.location.href='gerenciamento_categorias.html?categoria_id=${cat.id_categoria}'">Editar Categoria</button>
                        <button type="button" class="btn-excluir" onclick="removerCategoria(${cat.id_categoria})">Excluir Categoria</button>
                    </div>
                `;

                grid.appendChild(cardDiv);
            });
        })
        .catch((err) => console.error('Erro ao carregar os cards de categorias:', err));
}

function adicionarCategoria(dadosCategoria) {
    return fetch(`${API_URL}/categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosCategoria)
    })
        .then(async (res) => {
            const resposta = await res.json();
            if (!res.ok) {
                alert(resposta.erro || 'Não foi possível adicionar a categoria.');
                return null;
            }
            carregarCategoriasEmCards();
            return resposta;
        })
        .catch((err) => {
            console.error('Erro ao adicionar categoria:', err);
            alert('Erro de conexão com o servidor.');
        });
}

function modificarCategoria(id_categoria, nomeAtual = '', descAtual = '', novaDescricaoParam = null) {
    const novaDescricao = novaDescricaoParam !== null
        ? novaDescricaoParam
        : prompt('Nova descrição da categoria:', descAtual ?? '');

    if (novaDescricao === null) return Promise.resolve(null);

    return fetch(`${API_URL}/categorias/${id_categoria}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nome_categoria: nomeAtual,
            descricao_categoria: String(novaDescricao).trim()
        })
    })
        .then(async (res) => {
            const resposta = await res.json();
            if (!res.ok) {
                alert(resposta.erro || 'Não foi possível modificar a categoria.');
                return null;
            }
            alert(resposta.mensagem || 'Categoria atualizada com sucesso!');
            if (typeof carregarCategoriasEmCards === 'function') carregarCategoriasEmCards();
            if (typeof carregarDados === 'function') carregarDados();
            return resposta;
        })
        .catch((err) => {
            console.error('Erro ao modificar categoria:', err);
            alert('Erro de conexão com o servidor.');
            return null;
        });
}

function removerCategoria(id_categoria) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) {
        return Promise.resolve(null);
    }

    return fetch(`${API_URL}/categorias/${id_categoria}`, {
        method: 'DELETE'
    })
        .then(async (res) => {
            const resposta = await res.json();
            if (!res.ok) {
                alert(resposta.erro || 'Não foi possível excluir a categoria.');
                return null;
            }
            if (typeof mostrarAvisoToast === 'function') {
                mostrarAvisoToast(resposta.mensagem || 'Categoria excluída com sucesso!', 3000);
            }
            if (typeof carregarCategoriasEmCards === 'function') carregarCategoriasEmCards();
            if (typeof carregarDados === 'function') carregarDados();
            return resposta;
        })
        .catch((err) => {
            console.error('Erro ao excluir categoria:', err);
            alert('Erro de conexão com o servidor.');
            return null;
        });
}

function abrirCadastroCategoria() {
    window.location.href = 'gerenciamento_categorias.html';
}

// ==========================================
// 2. PRATOS (ADICIONAR, REMOVER, MODIFICAR)
// ==========================================
function abrirCadastroPrato(id_categoria = '') {
    const url = id_categoria
        ? `adicionar_pratos.html?categoria_id=${id_categoria}`
        : 'adicionar_pratos.html';
    window.location.href = url;
}

function adicionarPrato(dadosPrato) {
    return fetch(`${API_URL}/pratos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosPrato)
    })
        .then(async (res) => {
            const resposta = await res.json();
            if (!res.ok) {
                alert(resposta.erro || 'Não foi possível adicionar o prato.');
                return null;
            }
            carregarDados();
            return resposta;
        })
        .catch((err) => {
            console.error('Erro ao adicionar prato:', err);
            alert('Erro de conexão com o servidor.');
        });
}

function alternarDisponibilidadePrato(id_prato, disponivelAtual) {
    const listaBase = typeof pratos !== 'undefined' && Array.isArray(pratos) ? pratos : [];
    const pratoEncontrado = listaBase.find((p) => Number(p.id_prato) === Number(id_prato));
    const atual = disponivelAtual !== undefined ? Number(disponivelAtual) : Number(pratoEncontrado?.disponivel ?? 1);
    const novaDisponibilidade = atual === 1 ? 0 : 1;

    return fetch(`${API_URL}/pratos/${id_prato}/disponibilidade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponivel: novaDisponibilidade })
    })
        .then(async (res) => {
            const resposta = await res.json();
            if (!res.ok) {
                alert(resposta.erro || resposta.mensagem || 'Não foi possível alterar a disponibilidade.');
                return null;
            }
            if (typeof carregarDados === 'function') carregarDados();
            return resposta;
        })
        .catch((err) => {
            console.error('Erro ao alterar disponibilidade:', err);
            alert('Erro de conexão com o servidor.');
            return null;
        });
}

function removerPrato(id_prato) {
    if (!confirm('Tem certeza que deseja excluir este prato?')) {
        return;
    }

    fetch(`${API_URL}/pratos/${id_prato}`, {
        method: 'DELETE'
    })
        .then(async (res) => {
            const resposta = await res.json();
            if (!res.ok) {
                alert(resposta.erro || 'Não foi possível excluir o prato.');
                return;
            }
            alert(resposta.mensagem || 'Prato excluído com sucesso!');
            carregarDados();
        })
        .catch((err) => {
            console.error('Erro ao excluir prato:', err);
            alert('Erro de conexão com o servidor.');
        });
}

function verPratos(id_categoria) {
    window.location.href = `gerenciamento_pratos.html?categoria_id=${id_categoria}`;
}
// ==========================================
// 3. CARDÁPIO E CARRINHO
// ==========================================
function mostrarAvisoToast(mensagem, duracao = 2500) {
    const toast = document.getElementById('toastSucesso');
    const textoToast = document.getElementById('textoToast');
    if (!toast || !textoToast || !mensagem) return;

    textoToast.textContent = mensagem;
    toast.classList.add('mostrar');

    setTimeout(() => {
        toast.classList.remove('mostrar');
    }, duracao);
}

function salvarCarrinho() {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarTopoCarrinho();
}

function atualizarTopoCarrinho() {
    let qtdTotal = 0;
    let valorTotal = 0;

    for (let i = 0; i < carrinho.length; i++) {
        qtdTotal += carrinho[i].quantidade;
        valorTotal += carrinho[i].preco * carrinho[i].quantidade;
    }

    const totalFormatado = 'R$ ' + valorTotal.toFixed(2).replace('.', ',');

    const elQtd = document.getElementById('contador-carrinho');
    const elTotal = document.getElementById('total-carrinho');
    const elRodapeQtd = document.getElementById('rodape-qtd');
    const elRodapeTotal = document.getElementById('rodape-total');

    if (elQtd) elQtd.innerText = qtdTotal;
    if (elTotal) elTotal.innerText = totalFormatado;
    if (elRodapeQtd) elRodapeQtd.innerText = qtdTotal;
    if (elRodapeTotal) elRodapeTotal.innerText = totalFormatado;
}

function adicionarItem(prato, quantidade) {
    const qtd = Number(quantidade) || 1;
    if (qtd < 1) return;

    let achou = false;
    for (let i = 0; i < carrinho.length; i++) {
        if (carrinho[i].id_prato === prato.id_prato) {
            carrinho[i].quantidade += qtd;
            achou = true;
            break;
        }
    }

    if (!achou) {
        carrinho.push({
            id_prato: prato.id_prato,
            nome_prato: prato.nome_prato,
            preco: Number(prato.preco_prato),
            quantidade: qtd
        });
    }

    salvarCarrinho();
    mostrarAvisoToast(`${qtd}x ${prato.nome_prato} adicionado(s) ao carrinho!`);
}

async function carregarDados() {
    const filtrosEl = document.getElementById('filtros-categoria');
    const containerEl = document.getElementById('lista-cardapio');

    if (!filtrosEl && !containerEl) return;

    try {
        const [resCat, resPratos] = await Promise.all([
            fetch(`${API_URL}/categorias`),
            fetch(`${API_URL}/pratos`)
        ]);

        if (!resCat.ok || !resPratos.ok) {
            throw new Error('Falha ao buscar categorias ou pratos');
        }

        const dadosCat = await resCat.json();
        const dadosPratos = await resPratos.json();

        categorias = Array.isArray(dadosCat) ? dadosCat : [];
        pratos = Array.isArray(dadosPratos) ? dadosPratos : [];

        renderizarFiltros();
        renderizarCardapio();
    } catch (err) {
        console.error('Erro ao carregar cardápio:', err);
        if (containerEl) {
            containerEl.innerHTML = '<p>Não foi possível carregar o cardápio agora.</p>';
        }
    }
}

function renderizarFiltros() {
    const divFiltros = document.getElementById('filtros-categoria');
    if (!divFiltros) return;

    divFiltros.innerHTML = '';

    const btnTodas = document.createElement('button');
    btnTodas.type = 'button';
    btnTodas.innerText = 'Todas';
    btnTodas.onclick = () => {
        categoriaAtiva = 'TODAS';
        renderizarCardapio();
    };
    divFiltros.appendChild(btnTodas);

    for (let i = 0; i < categorias.length; i++) {
        const cat = categorias[i];
        const temPrato = pratos.some(
            (p) => Number(p.id_categoria_prato) === Number(cat.id_categoria) && p.disponivel !== 0
        );

        if (temPrato) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.innerText = cat.nome_categoria;
            btn.onclick = () => {
                categoriaAtiva = cat.id_categoria;
                renderizarCardapio();
            };
            divFiltros.appendChild(btn);
        }
    }
}

function renderizarCardapio() {
    const container = document.getElementById('lista-cardapio');
    if (!container) return;

    const busca = (document.getElementById('campo-busca')?.value || '').toLowerCase();
    const mostrarEsgotados = document.getElementById('toggle-esgotados')?.checked || false;
    const resumoEl = document.getElementById('resumo-opcoes');

    container.innerHTML = '';
    let totalPratosVisiveis = 0;

    for (let i = 0; i < categorias.length; i++) {
        const cat = categorias[i];

        if (categoriaAtiva !== 'TODAS' && Number(cat.id_categoria) !== Number(categoriaAtiva)) {
            continue;
        }

        const pratosDaCategoria = pratos.filter((p) => {
            const mesmaCategoria = Number(p.id_categoria_prato) === Number(cat.id_categoria);
            const disponivelOk = mostrarEsgotados ? true : p.disponivel !== 0;
            const buscaOk =
                (p.nome_prato || '').toLowerCase().includes(busca) ||
                (p.desc_prato || '').toLowerCase().includes(busca);
            return mesmaCategoria && disponivelOk && buscaOk;
        });

        if (pratosDaCategoria.length === 0) {
            continue;
        }

        totalPratosVisiveis += pratosDaCategoria.length;

        const secao = document.createElement('section');
        secao.className = 'secao-categoria';
        secao.innerHTML = `<h2 class="titulo-categoria-destaque">${cat.nome_categoria}</h2>`;

        for (let j = 0; j < pratosDaCategoria.length; j++) {
            const prato = pratosDaCategoria[j];
            const estaEsgotado = prato.disponivel === 0;
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
                    <span class="prato-preco">R$ ${Number(prato.preco_prato).toFixed(2).replace('.', ',')}</span>
                    <div class="prato-controles">
                        <input type="number" min="1" value="1" id="qtd-${prato.id_prato}" ${estaEsgotado ? 'disabled' : ''} />
                        <button type="button" id="btn-${prato.id_prato}" ${estaEsgotado ? 'disabled' : ''}>
                            ${estaEsgotado ? 'Esgotado' : 'Adicionar'}
                        </button>
                    </div>
                </div>
            `;
            secao.appendChild(card);

            const btnAdd = card.querySelector(`#btn-${prato.id_prato}`);
            const inputQtd = card.querySelector(`#qtd-${prato.id_prato}`);

            if (btnAdd && !estaEsgotado) {
                btnAdd.onclick = () => {
                    adicionarItem(prato, inputQtd.value);
                    inputQtd.value = 1;
                };
            }
        }

        container.appendChild(secao);
    }

    if (resumoEl) {
        resumoEl.innerText = `${totalPratosVisiveis} opções disponíveis hoje`;
    }

    if (container.innerHTML === '') {
        container.innerHTML = '<p>Nenhum prato encontrado.</p>';
    }
}

// ==========================================
// 4. EVENTOS GLOBAIS
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('gridCategorias');
    if (grid && typeof carregarCategoriasEmCards === 'function') {
        carregarCategoriasEmCards();
    }

    const urlParams = new URLSearchParams(window.location.search);
    let mensagem = '';

    if (urlParams.get('adicionarCategoria') === 'true') {
        mensagem = 'Categoria cadastrada com sucesso!';
    } else if (urlParams.get('pratoCadastrado') === 'true') {
        mensagem = 'Prato cadastrado com sucesso!';
    } else if (urlParams.get('produtoCadastradoCarrinho') === 'true') {
        mensagem = 'Produto adicionado ao carrinho com sucesso!';
    }

    if (mensagem !== '') {
        mostrarAvisoToast(mensagem, 3500);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    atualizarTopoCarrinho();
    carregarDados();
});

document.getElementById('campo-busca')?.addEventListener('input', renderizarCardapio);
document.getElementById('toggle-esgotados')?.addEventListener('change', renderizarCardapio);