// ===== VARIÁVEIS GLOBAIS =====
let todosProdutos = [];
let produtosFiltrados = [];

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
  carregarProdutos();
  configurarEventos();
  atualizarEstatisticas();
});

// ===== CONFIGURAÇÃO DE EVENTOS =====
function configurarEventos() {
  // Busca em tempo real
  document.getElementById('search-input').addEventListener('input', function() {
    filtrarProdutos();
  });

  // Filtro por status
  document.getElementById('filter-status').addEventListener('change', function() {
    filtrarProdutos();
  });

  // Enter na busca
  document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      buscarProdutos();
    }
  });
}

// ===== CARREGAMENTO DE DADOS =====
async function carregarProdutos() {
  mostrarLoading(true);
  
  try {
    const response = await fetch('/produtos');
    const produtos = await response.json();
    
    todosProdutos = produtos;
    produtosFiltrados = produtos;
    
    renderizarProdutos();
    atualizarEstatisticas();
    
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    mostrarErro('Erro ao carregar produtos. Tente novamente.');
  } finally {
    mostrarLoading(false);
  }
}

async function atualizarEstatisticas() {
  try {
    const response = await fetch('/estatisticas');
    const stats = await response.json();
    
    document.getElementById('total-produtos').textContent = stats.total_produtos || 0;
    document.getElementById('produtos-ativos').textContent = stats.produtos_ativos || 0;
    document.getElementById('fornecedores').textContent = stats.fornecedores_cadastrados || 0;
    
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// ===== RENDERIZAÇÃO =====
function renderizarProdutos() {
  const grid = document.getElementById('produtos-grid');
  const emptyState = document.getElementById('empty-state');
  
  // Mantém o card exemplo do Blend sempre visível
  const cardExemplo = grid.querySelector('.produto-card.exemplo');
  
  // Limpa apenas os produtos dinâmicos
  const produtosDinamicos = grid.querySelectorAll('.produto-card:not(.exemplo)');
  produtosDinamicos.forEach(card => card.remove());
  
  if (produtosFiltrados.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  produtosFiltrados.forEach(produto => {
    const card = criarCardProduto(produto);
    grid.appendChild(card);
  });
}

function criarCardProduto(produto) {
  const card = document.createElement('div');
  card.className = 'produto-card';
  card.onclick = () => abrirProduto(produto.id);
  
  const dataFormatada = new Date(produto.data_cadastro).toLocaleDateString('pt-BR');
  const totalConsumo = produto.total_consumo_semanal || 0;
  const statusClass = produto.ativo ? 'ativo' : 'inativo';
  const statusText = produto.ativo ? 'Ativo' : 'Inativo';
  
  card.innerHTML = `
    <div class="produto-header">
      <h3 class="produto-nome">${produto.nome}</h3>
      <span class="produto-status ${statusClass}">${statusText}</span>
    </div>
    <div class="produto-info">
      <p class="produto-fornecedor">📱 ${formatarWhatsApp(produto.fornecedor)}</p>
      <p class="produto-consumo">📊 Consumo: ${totalConsumo} unidades/semana</p>
      <p class="produto-data">📅 Cadastrado em: ${dataFormatada}</p>
    </div>
    <div class="produto-footer">
      <span class="produto-tipo">${produto.categoria || 'Produto'}</span>
      <button class="produto-btn" onclick="event.stopPropagation(); abrirProduto(${produto.id})">Ver Detalhes</button>
    </div>
  `;
  
  return card;
}

// ===== FILTROS E BUSCA =====
function filtrarProdutos() {
  const termoBusca = document.getElementById('search-input').value.toLowerCase();
  const filtroStatus = document.getElementById('filter-status').value;
  
  produtosFiltrados = todosProdutos.filter(produto => {
    const matchBusca = produto.nome.toLowerCase().includes(termoBusca) ||
                      produto.fornecedor.includes(termoBusca);
    
    const matchStatus = filtroStatus === 'todos' ||
                       (filtroStatus === 'ativos' && produto.ativo) ||
                       (filtroStatus === 'inativos' && !produto.ativo);
    
    return matchBusca && matchStatus;
  });
  
  renderizarProdutos();
}

function buscarProdutos() {
  filtrarProdutos();
}

// ===== NAVEGAÇÃO =====
function abrirProduto(produtoId) {
  if (produtoId === 'blend') {
    // Redireciona para a página específica do Blend
    window.location.href = 'produto-blend.html';
  } else {
    // Redireciona para página genérica de produto com ID
    window.location.href = `produto-detalhes.html?id=${produtoId}`;
  }
}

function voltarHome() {
  if (confirm('Deseja voltar ao menu principal?')) {
    window.location.href = 'index.html';
  }
}

// ===== UTILITÁRIOS =====
function mostrarLoading(mostrar) {
  const loading = document.getElementById('loading');
  const grid = document.getElementById('produtos-grid');
  
  if (mostrar) {
    loading.style.display = 'block';
    grid.style.display = 'none';
  } else {
    loading.style.display = 'none';
    grid.style.display = 'grid';
  }
}

function mostrarErro(mensagem) {
  const grid = document.getElementById('produtos-grid');
  grid.innerHTML = `
    <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
      <div style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;">⚠️</div>
      <h3 style="color: var(--error-red); margin-bottom: 15px;">${mensagem}</h3>
      <button onclick="carregarProdutos()" style="background: var(--primary-blue); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
        Tentar Novamente
      </button>
    </div>
  `;
}

function formatarWhatsApp(numero) {
  // Remove caracteres não numéricos
  const limpo = numero.replace(/\D/g, '');
  
  // Formata conforme padrão brasileiro
  if (limpo.length === 13) {
    return `+${limpo.substring(0, 2)} (${limpo.substring(2, 4)}) ${limpo.substring(4, 9)}-${limpo.substring(9)}`;
  } else if (limpo.length === 11) {
    return `(${limpo.substring(0, 2)}) ${limpo.substring(2, 7)}-${limpo.substring(7)}`;
  }
  
  return numero;
}

function formatarData(dataISO) {
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// ===== AÇÕES RÁPIDAS =====
function adicionarProduto() {
  window.location.href = 'cadastrar-item.html';
}

function exportarProdutos() {
  const dados = {
    data_exportacao: new Date().toISOString(),
    total_produtos: todosProdutos.length,
    produtos: todosProdutos
  };
  
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `produtos-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

// ===== ATALHOS DE TECLADO =====
document.addEventListener('keydown', function(e) {
  // Ctrl+F para focar na busca
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    document.getElementById('search-input').focus();
  }
  
  // Esc para limpar busca
  if (e.key === 'Escape') {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-status').value = 'todos';
    filtrarProdutos();
  }
  
  // Ctrl+N para novo produto
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    adicionarProduto();
  }
});

// ===== ATUALIZAÇÃO AUTOMÁTICA =====
setInterval(() => {
  atualizarEstatisticas();
}, 30000); // Atualiza estatísticas a cada 30 segundos

console.log('🎯 Sistema de Produtos Cadastrados carregado com sucesso!');
console.log('📋 Atalhos disponíveis:');
console.log('   Ctrl+F: Focar na busca');
console.log('   Ctrl+N: Novo produto');
console.log('   Esc: Limpar filtros');