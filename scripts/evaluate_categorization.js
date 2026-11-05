const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'transactions_labeled.json');
const txs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function predict(tx) {
  const text = `${tx.description} ${tx.merchant}`.toLowerCase();
  const rules = [
    { cat: 'assinaturas', keys: ['netflix', 'spotify', 'adobe', 'microsoft 365', 'icloud'] },
    { cat: 'alimentacao', keys: ['supermercado', 'restaurante', 'padaria', 'ifood', 'cafe'] },
    { cat: 'transporte', keys: ['uber', '99', 'posto', 'metro', 'estacionamento'] },
    { cat: 'moradia', keys: ['aluguel', 'condominio', 'luz', 'agua', 'internet'] },
    { cat: 'saude', keys: ['farmacia', 'drogaria', 'clinica', 'academia', 'plano'] },
    { cat: 'lazer', keys: ['cinema', 'teatro', 'parque'] },
    { cat: 'compras', keys: ['amazon', 'mercado livre', 'loja', 'shopee', 'americanas'] },
    { cat: 'renda', keys: ['salario', 'freelance', 'reembolso', 'bonus', 'dividendos'] },
  ];
  for (const r of rules) {
    if (r.keys.some(k => text.includes(k))) return r.cat;
  }
  return 'compras';
}

let correct = 0;
const confusion = {};
for (const tx of txs) {
  const pred = predict(tx);
  if (pred === tx.true_category) correct++;
  const key = `${tx.true_category}->${pred}`;
  confusion[key] = (confusion[key] || 0) + 1;
}

const accuracy = correct / txs.length;
console.log(JSON.stringify({
  total: txs.length,
  correct,
  accuracy: Number((accuracy * 100).toFixed(2)),
  confusion
}, null, 2));
