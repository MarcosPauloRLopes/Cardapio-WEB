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

/*  
    ///////////////////////////////
    ROTAS DA ENTIDADE DE CATEGORIA.
    ////////////////////////////////
*/

// Rota para Listar todas as categorias.
app.get('/categorias', (req, res) => {
    const query = `
        SELECT c.id_categoria, c.nome_categoria, c.descricao_categoria, COUNT(p.id_prato) AS total_pratos 
        FROM categoria c 
        LEFT JOIN pratos p ON c.id_categoria = p.id_categoria_prato 
        GROUP BY c.id_categoria, c.nome_categoria, c.descricao_categoria
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Erro ao buscar categorias:", err);
            return res.status(500).json({ erro: "Erro ao buscar categorias." });
        }
        res.json(results);
    });
});

// Rota para Adicionar uma nova categoria.
app.post('/categorias', (req, res) => {
    const { nome_categoria, descricao_categoria } = req.body;

    if (!nome_categoria) {
        return res.status(400).json({ erro: "O nome da categoria é obrigatório." });
    }

    const query = "INSERT INTO categoria (nome_categoria, descricao_categoria) VALUES (?, ?)";
    
    // Se a descrição vier vazia, enviamos null para o banco ficar limpo
    const descricaoFinal = descricao_categoria && descricao_categoria.trim() !== "" ? descricao_categoria : null;

    db.query(query, [nome_categoria, descricaoFinal], (err, result) => {
        if (err) {
            console.error("Erro ao cadastrar categoria:", err);
            return res.status(500).json({ erro: "Erro ao cadastrar categoria no banco." });
        }
        res.status(201).json({ mensagem: "Categoria cadastrada com sucesso!" });
    });
});

// Rota para Remover uma categoria existente.
app.delete('/categorias/:id', (req, res) => {
    const { id } = req.id || req.params.id;
    const categoriaId = req.params.id;

    const query = 'DELETE FROM categoria WHERE id_categoria = ?';

    db.query(query, [categoriaId], (err, result) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
                return res.status(400).json({ 
                    erro: "Não é possível excluir esta categoria pois ela possui pratos cadastrados!" 
                });
            }

            console.error("Erro ao excluir categoria:", err);
            return res.status(500).json({ erro: "Erro ao excluir categoria." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Categoria não encontrada." });
        }

        res.json({ mensagem: "Categoria excluída com sucesso!" });
    });
});

// Rota para Modificar uma categoria existente.
app.put('/categorias/:id', (req, res) => {
    const { id } = req.params;
    const { descricao_categoria } = req.body;

    const query = `
        UPDATE categoria
        SET descricao_categoria = ?
        WHERE id_categoria = ?
    `;

    db.query(query, [descricao_categoria ?? '', id], (err, result) => {
        if (err) {
            console.error("Erro ao atualizar categoria:", err);
            return res.status(500).json({ erro: "Erro ao atualizar categoria." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Categoria não encontrada.' });
        }
        res.json({ mensagem: 'Categoria atualizada com sucesso!' });
    });
});

/*  
    ////////////////////////////
    ROTAS DA ENTIDADE DE PRATOS.
    ////////////////////////////
*/ 

// Rota para Lista todos os pratos com a sua categoria.
app.get('/pratos', (req, res) => {
    const query = `
        SELECT 
            p.id_prato, 
            p.nome_prato, 
            p.desc_prato, 
            p.preco_prato,
            p.disponivel, 
            p.id_categoria_prato,
            c.nome_categoria 
        FROM pratos p
        INNER JOIN categoria c ON p.id_categoria_prato = c.id_categoria
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Erro ao buscar pratos:", err);
            return res.status(500).json({ erro: "Erro ao buscar pratos." });
        }
        res.json(results);
    });
});

//Rota para Adicionar um novo prato a uma categoria existente.
app.post('/pratos', (req, res) => {
    const nome = (req.body.nome_prato ?? req.body.nome ?? '').trim();
    const descricao = (req.body.desc_prato ?? req.body.descricao ?? '').trim();
    const precoRaw = req.body.preco_prato ?? req.body.preco;
    const preco = parseFloat(
        typeof precoRaw === 'string' ? precoRaw.replace(',', '.') : precoRaw
    );
    const id_categoria = Number(
        req.body.id_categoria_prato ?? req.body.id_categoria
    );
    const disponivel =
        req.body.disponivel === 0 || req.body.disponivel === false || req.body.disponivel === '0'
            ? 0
            : 1;

    if (!nome) {
        return res.status(400).json({ erro: "O nome do prato é obrigatório." });
    }

    if (Number.isNaN(preco) || preco <= 0) {
        return res.status(400).json({ erro: "O preço do prato precisa ser maior que R$ 0,00." });
    }

    if (!id_categoria) {
        return res.status(400).json({ erro: "A categoria do prato é obrigatória." });
    }

    const query = 'INSERT INTO pratos (nome_prato, desc_prato, preco_prato, id_categoria_prato, disponivel) VALUES (?, ?, ?, ?, ?)';

    db.query(query, [nome, descricao, preco, id_categoria, disponivel], (err, result) => {
        if (err) {
            console.error("Erro ao cadastrar prato no banco:", err);
            return res.status(500).json({ erro: "Erro ao cadastrar prato no banco de dados." });
        }
        res.status(201).json({ mensagem: "Prato cadastrado com sucesso!", id_prato: result.insertId });
    });
});

// Rota para Remover um prato de uma categoria existente.
app.delete('/pratos/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM pratos WHERE id_prato = ?';

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error("Erro ao remover prato:", err);
            return res.status(500).json({ erro: "Erro ao remover prato." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Prato não encontrado.' });
        }
        res.json({ mensagem: 'Prato removido com sucesso!' });
    });
});

// Rota para Modificar um prato existente.
app.put('/pratos/:id', (req, res) => {
    const { id } = req.params;
    const { nome_prato, desc_prato, preco_prato, id_categoria_prato } = req.body;
    const query = 'UPDATE pratos SET nome_prato = ?, desc_prato = ?, preco_prato = ?, id_categoria_prato = ? WHERE id_prato = ?';

    db.query(query, [nome_prato, desc_prato, preco_prato, id_categoria_prato, id], (err, result) => {
        if (err) {
            console.error("Erro ao atualizar prato:", err);
            return res.status(500).json({ erro: "Erro ao atualizar prato." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Prato não encontrado.' });
        }
        res.json({ mensagem: 'Prato atualizado com sucesso!' });
    });
});

// Rota para Modificar a disponibilidade de um prato.
app.patch('/pratos/:id/disponibilidade', (req, res) => {
    const { id } = req.params;
    const { disponivel } = req.body; // Espera receber { disponivel: 0 } ou { disponivel: 1 }

    const query = 'UPDATE pratos SET disponivel = ? WHERE id_prato = ?';

    db.query(query, [disponivel, id], (err, result) => {
        if (err) {
            console.error("Erro ao alterar disponibilidade:", err);
            return res.status(500).json({ erro: "Erro ao atualizar disponibilidade." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Prato não encontrado.' });
        }

        res.json({ mensagem: 'Disponibilidade atualizada com sucesso!' });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});