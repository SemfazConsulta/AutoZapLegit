import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

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

app.post('/enviar', (req, res) => {
  const { restante, ...novoConsumo } = req.body;

  fs.writeFileSync(consumoPath, JSON.stringify(novoConsumo, null, 2));

  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

  const hoje = new Date().getDay();
  const amanha = (hoje + 1) % 7;

  const diaAmanha = diasSemana[amanha];
  const consumoAmanha = novoConsumo[diaAmanha];

  const falta = Math.max(consumoAmanha - restante, 0);
  const quantidadePedir = falta === 0 ? 0 : Math.ceil(falta / 50) * 50;

  const fraldinha = (quantidadePedir * 0.08).toFixed(0);
  const acem = (quantidadePedir * 0.08).toFixed(0);
  const gordura = (quantidadePedir * 0.02).toFixed(0);

  let corpoMensagem = '';

  if (quantidadePedir === 0) {
  corpoMensagem = `Hoje sobrou o suficiente, não precisa pedir mais carne para ${diaAmanha}.`;
  } else {
  corpoMensagem = `Preciso de ${fraldinha}kg de Fraldinha e Acém e preciso de ${gordura}kg de Gordura de peito.`;
  }


  axios.post('https://gate.whapi.cloud/messages/text', {
    to: NUMERO_DESTINO,
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
    detalhes: `Fraldinha: ${fraldinha}kg, Acém: ${acem}kg, Gordura de peito: ${gordura}kg`
  });
  }).catch(err => {
    console.error(err.response?.data || err.message);
    res.status(500).json({ mensagem: '❌ Erro ao enviar o pedido.' });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
