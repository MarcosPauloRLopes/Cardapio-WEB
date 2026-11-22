const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'Cardapio_WEB',
    port: process.env.MYSQLPORT || 3306
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados com sucesso!');
});

// ==========================================
// FUNÇÕES AUXILIARES (evitam repetir código em todas as rotas)
// ==========================================

function listar(res, sql, mensagemErro) {
    db.query(sql, (err, resultados) => {
        if (err) {
            console.error(mensagemErro, err);
            return res.status(500).json({ erro: mensagemErro });
        }
        res.json(resultados);
    });
}

function alterar(res, sql, valores, mensagens) {
    db.query(sql, valores, (err, resultado) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2' && mensagens.emUso) {
                return res.status(400).json({ erro: mensagens.emUso });
            }
            console.error(mensagens.erro, err);
            return res.status(500).json({ erro: mensagens.erro });
        }
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: mensagens.naoEncontrado });
        }
        res.json({ mensagem: mensagens.ok });
    });
}

// ==========================================
// ROTAS DE CATEGORIA
// ==========================================

app.get('/categorias', (req, res) => {
    const sql = `
        SELECT c.id_categoria, c.nome_categoria, c.descricao_categoria, COUNT(p.id_prato) AS total_pratos
        FROM categoria c
        LEFT JOIN pratos p ON c.id_categoria = p.id_categoria_prato
        GROUP BY c.id_categoria, c.nome_categoria, c.descricao_categoria
    `;
    listar(res, sql, 'Erro ao buscar categorias.');
});

app.post('/categorias', (req, res) => {
    const nome = (req.body.nome_categoria || '').trim();
    const descricao = (req.body.descricao_categoria || '').trim();

    if (!nome) {
        return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });
    }

    const sql = 'INSERT INTO categoria (nome_categoria, descricao_categoria) VALUES (?, ?)';
    db.query(sql, [nome, descricao], (err) => {
        if (err) {
            console.error('Erro ao cadastrar categoria:', err);
            return res.status(500).json({ erro: 'Erro ao cadastrar categoria no banco.' });
        }
        res.status(201).json({ mensagem: 'Categoria cadastrada com sucesso!' });
    });
});

app.put('/categorias/:id', (req, res) => {
    alterar(
        res,
        'UPDATE categoria SET descricao_categoria = ? WHERE id_categoria = ?',
        [req.body.descricao_categoria || '', req.params.id],
        {
            ok: 'Categoria atualizada com sucesso!',
            naoEncontrado: 'Categoria não encontrada.',
            erro: 'Erro ao atualizar categoria.'
        }
    );
});

app.delete('/categorias/:id', (req, res) => {
    alterar(res, 'DELETE FROM categoria WHERE id_categoria = ?', [req.params.id], {
        ok: 'Categoria excluída com sucesso!',
        naoEncontrado: 'Categoria não encontrada.',
        erro: 'Erro ao excluir categoria.',
        emUso: 'Não é possível excluir esta categoria pois ela possui pratos cadastrados!'
    });
});

// ==========================================
// ROTAS DE PRATOS
// ==========================================

app.get('/pratos', (req, res) => {
    const sql = `
        SELECT p.id_prato, p.nome_prato, p.desc_prato, p.preco_prato, p.disponivel,
               p.id_categoria_prato, c.nome_categoria
        FROM pratos p
        INNER JOIN categoria c ON p.id_categoria_prato = c.id_categoria
    `;
    listar(res, sql, 'Erro ao buscar pratos.');
});

app.post('/pratos', (req, res) => {
    const nome = (req.body.nome_prato || '').trim();
    const descricao = (req.body.desc_prato || '').trim();
    const preco = parseFloat(String(req.body.preco_prato).replace(',', '.'));
    const idCategoria = Number(req.body.id_categoria_prato);

    if (!nome) {
        return res.status(400).json({ erro: 'O nome do prato é obrigatório.' });
    }
    if (isNaN(preco) || preco <= 0) {
        return res.status(400).json({ erro: 'O preço do prato precisa ser maior que R$ 0,00.' });
    }
    if (!idCategoria) {
        return res.status(400).json({ erro: 'A categoria do prato é obrigatória.' });
    }

    const sql = 'INSERT INTO pratos (nome_prato, desc_prato, preco_prato, id_categoria_prato) VALUES (?, ?, ?, ?)';
    db.query(sql, [nome, descricao, preco, idCategoria], (err, resultado) => {
        if (err) {
            console.error('Erro ao cadastrar prato:', err);
            return res.status(500).json({ erro: 'Erro ao cadastrar prato no banco de dados.' });
        }
        res.status(201).json({ mensagem: 'Prato cadastrado com sucesso!', id_prato: resultado.insertId });
    });
});
app.delete('/pratos/:id', (req, res) => {
    alterar(res, 'DELETE FROM pratos WHERE id_prato = ?', [req.params.id], {
        ok: 'Prato removido com sucesso!',
        naoEncontrado: 'Prato não encontrado.',
        erro: 'Erro ao remover prato.'
    });
});

app.patch('/pratos/:id/disponibilidade', (req, res) => {
    alterar(
        res,
        'UPDATE pratos SET disponivel = ? WHERE id_prato = ?',
        [req.body.disponivel, req.params.id],
        {
            ok: 'Disponibilidade atualizada com sucesso!',
            naoEncontrado: 'Prato não encontrado.',
            erro: 'Erro ao atualizar disponibilidade.'
        }
    );
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});