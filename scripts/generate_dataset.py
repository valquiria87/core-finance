import json, random, datetime

random.seed(42)

categories = {
    "alimentacao": ["Supermercado X", "Restaurante Z", "Padaria Pao Bom", "iFood", "Cafe Central"],
    "transporte": ["Uber", "99", "Posto Shell", "Metro SP", "Estacionamento"],
    "moradia": ["Aluguel", "Condominio", "Conta de Luz", "Conta de Agua", "Internet"],
    "saude": ["Farmacia Y", "Drogaria SP", "Clinica Vida", "Academia Fit", "Plano Saude"],
    "lazer": ["Cinema", "Netflix", "Spotify", "Teatro", "Parque"],
    "compras": ["Amazon", "Mercado Livre", "Loja Centro", "Shopee", "Americanas"],
    "assinaturas": ["Netflix", "Spotify", "Adobe", "Microsoft 365", "iCloud"],
    "renda": ["Salario", "Freelance", "Reembolso", "Bonus", "Dividendos"],
}

accounts = ["Conta Corrente", "Cartao Credito"]

start = datetime.date(2026, 9, 1)
txs = []
for i in range(150):
    cat = random.choice(list(categories.keys()))
    merchant = random.choice(categories[cat])
    # renda as negative (money in), others positive (money out)
    if cat == "renda":
        amount = -round(random.uniform(100, 4000), 2)
    else:
        amount = round(random.uniform(5, 950), 2)
    day_offset = random.randint(0, 89)
    d = start + datetime.timedelta(days=day_offset)
    txs.append({
        "id": f"tx-{i+1:03d}",
        "date": d.isoformat(),
        "description": merchant,
        "merchant": merchant,
        "account": random.choice(accounts),
        "amount": amount,
        "true_category": cat
    })

with open("data/transactions_labeled.json", "w", encoding="utf-8") as f:
    json.dump(txs, f, ensure_ascii=False, indent=2)

print("generated", len(txs))
