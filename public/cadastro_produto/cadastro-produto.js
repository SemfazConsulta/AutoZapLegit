import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.TOKEN;
const NUMERO_DESTINO = process.env.NUMERO_DESTINO;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const produtosPath = path.join(__dirname, 'produtos.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializa arquivo de produtos se não existir
if (!fs.existsSync(produtosPath)) {
  fs.writeFileSync(produtosPath, JSON.stringify([], null, 2));
}

// Função para obter o dia atual (considerando horário de corte às 3h)
function obterDiaAtual() {
  const agora = new Date();
  if (agora.getHours() < 3) {
    agora.setDate(agora.getDate() - 1);
  }
  return agora.getDay();
}

// Rota para obter produtos cadastrados
app.get('/produtos', (req, res) => {
  try {
    const produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf-8'));
    res.json(produtos);
  } catch (error) {
    res.json([]);
  }
});

// Rota principal para cadastrar produto e enviar pedido
app.post('/cadastrar-produto', (req, res) => {
  const { 
    nome_produto, 
    numero_fornecedor, 
    estoque_atual, 
    domingo, 
    segunda, 
    terca, 
    quarta, 
    quinta, 
    sexta, 
    sabado 
  } = req.body;

  // Validações básicas
  if (!nome_produto || !numero_fornecedor || estoque_atual === undefined) {
    return res.status(400).json({ 
      mensagem: '❌ Dados obrigatórios não fornecidos.',
      sucesso: false 
    });
  }

  const consumoSemanal = {
    domingo: domingo || 0,
    segunda: segunda || 0,
    terca: terca || 0,
    quarta: quarta || 0,
    quinta: quinta || 0,
    sexta: sexta || 0,
    sabado: sabado || 0
  };

  // Cria objeto do produto
  const novoProduto = {
    id: Date.now(),
    nome: nome_produto,
    fornecedor: numero_fornecedor,
    estoque_atual: estoque_atual,
    consumo_semanal: consumoSemanal,
    data_cadastro: new Date().toISOString(),
    ativo: true
  };

  // Salva o produto
  try {
    const produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf-8'));
    produtos.push(novoProduto);
    fs.writeFileSync(produtosPath, JSON.stringify(produtos, null, 2));
  } catch (error) {
    return res.status(500).json({ 
      mensagem: '❌ Erro ao salvar produto.',
      sucesso: false 
    });
  }

  // Calcula necessidade para amanhã
  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const hoje = obterDiaAtual();
  const amanha = (hoje + 1) % 7;
  const diaAmanha = diasSemana[amanha];
  const consumoAmanha = consumoSemanal[diaAmanha];

  const falta = Math.max(consumoAmanha - estoque_atual, 0);
  const quantidadePedir = falta === 0 ? 0 : Math.ceil(falta / 10) * 10; // Arredonda para múltiplos de 10

  let corpoMensagem = quantidadePedir === 0
    ? `✅ Produto: ${nome_produto}\nEstoque atual é suficiente para ${diaAmanha}.\nNão é necessário fazer pedido.`
    : `🛒 *NOVO PEDIDO*\n\n` +
      `📦 Produto: *${nome_produto}*\n` +
      `📅 Para: ${diaAmanha}\n` +
      `📊 Estoque atual: ${estoque_atual}\n` +
      `📈 Consumo previsto: ${consumoAmanha}\n` +
      `🎯 Quantidade a pedir: *${quantidadePedir} unidades*\n\n` +
      `Por favor, confirme a disponibilidade.`;

  // Envia mensagem via WhatsApp
  axios.post('https://gate.whapi.cloud/messages/text', {
    to: numero_fornecedor || NUMERO_DESTINO,
    body: corpoMensagem
  }, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  }).then(() => {
    res.json({
      mensagem: `✅ Produto "${nome_produto}" cadastrado e pedido enviado!`,
      detalhes: corpoMensagem,
      sucesso: true,
      produto_id: novoProduto.id,
      quantidade_pedida: quantidadePedir
    });
  }).catch(err => {
    console.error('Erro ao enviar WhatsApp:', err.response?.data || err.message);
    
    // Mesmo com erro no WhatsApp, o produto foi cadastrado
    res.json({
      mensagem: `⚠️ Produto "${nome_produto}" cadastrado, mas houve erro ao enviar WhatsApp.`,
      detalhes: 'Produto salvo no sistema. Verifique as configurações do WhatsApp.',
      sucesso: true,
      produto_id: novoProduto.id,
      erro_whatsapp: true
    });
  });
});

// Rota para atualizar consumo de um produto específico
app.post('/atualizar-consumo/:id', (req, res) => {
  const produtoId = parseInt(req.params.id);
  const novoConsumo = req.body;

  try {
    const produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf-8'));
    const produtoIndex = produtos.findIndex(p => p.id === produtoId);

    if (produtoIndex === -1) {
      return res.status(404).json({ mensagem: 'Produto não encontrado.' });
    }

    // Atualiza o consumo semanal
    Object.assign(produtos[produtoIndex].consumo_semanal, novoConsumo);
    produtos[produtoIndex].ultima_atualizacao = new Date().toISOString();

    fs.writeFileSync(produtosPath, JSON.stringify(produtos, null, 2));
    res.json({ mensagem: 'Consumo atualizado com sucesso.' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar consumo.' });
  }
});

// Rota para obter produto específico
app.get('/produto/:id', (req, res) => {
  const produtoId = parseInt(req.params.id);

  try {
    const produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf-8'));
    const produto = produtos.find(p => p.id === produtoId);

    if (!produto) {
      return res.status(404).json({ mensagem: 'Produto não encontrado.' });
    }

    res.json(produto);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar produto.' });
  }
});

// Rota para desativar produto
app.patch('/produto/:id/desativar', (req, res) => {
  const produtoId = parseInt(req.params.id);

  try {
    const produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf-8'));
    const produtoIndex = produtos.findIndex(p => p.id === produtoId);

    if (produtoIndex === -1) {
      return res.status(404).json({ mensagem: 'Produto não encontrado.' });
    }

    produtos[produtoIndex].ativo = false;
    produtos[produtoIndex].data_desativacao = new Date().toISOString();

    fs.writeFileSync(produtosPath, JSON.stringify(produtos, null, 2));
    res.json({ mensagem: 'Produto desativado com sucesso.' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao desativar produto.' });
  }
});

// Rota para estatísticas
app.get('/estatisticas', (req, res) => {
  try {
    const produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf-8'));
    const produtosAtivos = produtos.filter(p => p.ativo);
    
    const hoje = new Date().toDateString();
    const pedidosHoje = produtos.filter(p => 
      new Date(p.data_cadastro).toDateString() === hoje
    ).length;

    const fornecedoresUnicos = [...new Set(produtos.map(p => p.fornecedor))].length;

    res.json({
      total_produtos: produtos.length,
      produtos_ativos: produtosAtivos.length,
      pedidos_hoje: pedidosHoje,
      fornecedores_cadastrados: fornecedoresUnicos
    });
  } catch (error) {
    res.json({
      total_produtos: 0,
      produtos_ativos: 0,
      pedidos_hoje: 0,
      fornecedores_cadastrados: 0
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📁 Produtos salvos em: ${produtosPath}`);
});