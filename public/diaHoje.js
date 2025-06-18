function atualizarDiaHoje() {
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const hoje = new Date();

  // Se for antes das 03:00, consideramos o dia anterior
  if (hoje.getHours() < 3) {
    hoje.setDate(hoje.getDate() - 1);
  }

  const indiceDia = hoje.getDay();
  const nomeDia = diasSemana[indiceDia];

  const pDiaHoje = document.getElementById('dia_hoje');
  pDiaHoje.textContent = `Hoje é ${nomeDia}.`;
}


  // Atualiza o dia agora
  atualizarDiaHoje();

  // Atualiza o dia novamente às 3h da manhã do próximo dia
  function agendarAtualizacao3h() {
    const agora = new Date();
    const proximo3h = new Date();

    proximo3h.setHours(3, 0, 0, 0);
    if (agora >= proximo3h) {
      proximo3h.setDate(proximo3h.getDate() + 1);
    }

    const msAte3h = proximo3h.getTime() - agora.getTime();

    setTimeout(() => {
      atualizarDiaHoje();
      agendarAtualizacao3h();
    }, msAte3h);
  }

  agendarAtualizacao3h();
