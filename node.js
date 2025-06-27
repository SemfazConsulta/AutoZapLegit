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

const consumoPath = path.join(__dirname, 'consumo.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/consumo', (req, res) => {
  const consumo = JSON.parse(fs.readFileSync(consumoPath, 'utf-8'));
  res.json(consumo);
});

function obterDiaAtual() {
  const agora = new Date();
  if (agora.getHours() < 3) {
    agora.setDate(agora.getDate() - 1);
  }
  return agora.getDay();
}

app.post('/enviar', (req, res) => {
const { restante, numero_entregador, ...novoConsumo } = req.body;

  fs.writeFileSync(consumoPath, JSON.stringify(novoConsumo, null, 2));

  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

  const hoje = obterDiaAtual();
  const amanha = (hoje + 1) % 7;

  const diaAmanha = diasSemana[amanha];
  const consumoAmanha = novoConsumo[diaAmanha];

  const falta = Math.max(consumoAmanha - restante, 0);
  const quantidadePedir = falta === 0 ? 0 : Math.ceil(falta / 50) * 50;

  const fraldinha = (quantidadePedir * 0.08).toFixed(0);
  const acem = (quantidadePedir * 0.08).toFixed(0);
  const gordura = (quantidadePedir * 0.02).toFixed(0);

  let corpoMensagem = quantidadePedir === 0
    ? `Hoje sobrou o suficiente, não precisa pedir mais carne para ${diaAmanha}.`
    : `Bom dia! Segue nosso pedido do dia:
  - ${fraldinha}kg de fraldinha
  - ${acem}kg de acém
  - ${gordura}kg de gordura de peito`;


  axios.post('https://gate.whapi.cloud/messages/text', {
  to: numero_entregador || NUMERO_DESTINO,
    body: corpoMensagem
  }, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  }).then(() => {
    res.json({
      mensagem: `✅ Pedido de ${quantidadePedir} Blends enviado para ${diaAmanha}.`,
      detalhes: corpoMensagem
    });
  }).catch(err => {
    console.error(err.response?.data || err.message);
    res.status(500).json({ mensagem: '❌ Erro ao enviar o pedido.' });
  });
});

  app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

app.post('/alterar-consumo', (req, res) => {
  const novoValor = req.body;

  const consumo = JSON.parse(fs.readFileSync(consumoPath, 'utf-8'));
  Object.assign(consumo, novoValor);

  fs.writeFileSync(consumoPath, JSON.stringify(consumo, null, 2));
  res.json({ mensagem: 'Consumo atualizado com sucesso.' });
});
