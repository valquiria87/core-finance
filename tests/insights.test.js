const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { detectSubscriptions, detectAnomalies, predictMonthEnd, loadTransactions } = require(path.join(__dirname, '..', 'backend', 'insights.js'));

const DATA_PATH = path.join(__dirname, '..', 'data', 'transactions_labeled.json');

test('dataset has 100-200 labeled transactions', () => {
  const txs = loadTransactions(DATA_PATH);
  assert.ok(txs.length >= 100 && txs.length <= 200);
  for (const t of txs) {
    assert.ok(t.true_category);
    assert.ok(typeof t.amount === 'number');
  }
});

test('detectSubscriptions returns array', () => {
  const txs = loadTransactions(DATA_PATH);
  const subs = detectSubscriptions(txs);
  assert.ok(Array.isArray(subs));
});

test('detectAnomalies returns array', () => {
  const txs = loadTransactions(DATA_PATH);
  const an = detectAnomalies(txs);
  assert.ok(Array.isArray(an));
});

test('predictMonthEnd returns prediction', () => {
  const txs = loadTransactions(DATA_PATH);
  const pred = predictMonthEnd(txs, new Date('2026-10-15'));
  assert.ok(typeof pred.predictedMonthEnd === 'number');
  assert.ok(pred.remainingDays >= 0);
});
