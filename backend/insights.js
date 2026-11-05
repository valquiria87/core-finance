const fs = require('fs');
const path = require('path');

function loadTransactions(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function detectSubscriptions(transactions, minOccurrences = 3) {
  const byMerchant = {};
  for (const t of transactions) {
    if (t.amount <= 0) continue;
    byMerchant[t.merchant] = byMerchant[t.merchant] || [];
    byMerchant[t.merchant].push(t);
  }
  const subs = [];
  for (const [merchant, items] of Object.entries(byMerchant)) {
    if (items.length >= minOccurrences) {
      const amounts = items.map(i => i.amount);
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((a, b) => a + (b - avg) ** 2, 0) / amounts.length;
      const std = Math.sqrt(variance);
      // regular if std < 10% of avg
      if (std / avg < 0.1) {
        subs.push({ merchant, occurrences: items.length, averageAmount: Number(avg.toFixed(2)), std: Number(std.toFixed(2)) });
      }
    }
  }
  return subs.sort((a, b) => b.averageAmount - a.averageAmount);
}

function detectAnomalies(transactions) {
  const byCategory = {};
  for (const t of transactions) {
    if (t.amount <= 0) continue;
    byCategory[t.true_category] = byCategory[t.true_category] || [];
    byCategory[t.true_category].push(t.amount);
  }
  const stats = {};
  for (const [cat, amounts] of Object.entries(byCategory)) {
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + (b - avg) ** 2, 0) / amounts.length;
    stats[cat] = { avg, std: Math.sqrt(variance) };
  }
  const anomalies = [];
  for (const t of transactions) {
    if (t.amount <= 0) continue;
    const s = stats[t.true_category];
    if (s && s.std > 0 && Math.abs(t.amount - s.avg) > 2 * s.std) {
      anomalies.push({
        id: t.id,
        merchant: t.merchant,
        category: t.true_category,
        amount: t.amount,
        zscore: Number(((t.amount - s.avg) / s.std).toFixed(2)),
      });
    }
  }
  return anomalies;
}

function predictMonthEnd(transactions, today = new Date()) {
  const currentMonth = today.toISOString().slice(0, 7);
  const monthTx = transactions.filter(t => t.date.startsWith(currentMonth));
  const spent = monthTx.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
  const avgDaily = dayOfMonth > 0 ? spent / dayOfMonth : 0;
  const predictedAdditional = avgDaily * remainingDays;
  return {
    currentMonth,
    spentSoFar: Number(spent.toFixed(2)),
    avgDailySpend: Number(avgDaily.toFixed(2)),
    remainingDays,
    predictedMonthEnd: Number((spent + predictedAdditional).toFixed(2)),
  };
}

module.exports = { loadTransactions, detectSubscriptions, detectAnomalies, predictMonthEnd };
