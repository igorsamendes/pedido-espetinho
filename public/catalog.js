// Opções transcritas da tabela Espetinhos Filé Mania (agosto de 2026).
export const SKEWERS = [
  { id: 'aipim-carne-seca', name: 'Aipim com carne seca', group: 'Espetinhos' },
  { id: 'almondega-mucarela', name: 'Almôndega com muçarela', group: 'Espetinhos' },
  { id: 'boi-alcatra-fraldinha', name: 'Boi (alcatra ou fraldinha)', group: 'Espetinhos' },
  { id: 'boi-contra-file', name: 'Boi (contrafilé)', group: 'Espetinhos' },
  { id: 'coracao-frango', name: 'Coração de frango', group: 'Espetinhos' },
  { id: 'costelinha-porco', name: 'Costelinha de porco', group: 'Espetinhos' },
  { id: 'frango-peito', name: 'Frango (peito)', group: 'Espetinhos' },
  { id: 'kafta', name: 'Kafta', group: 'Espetinhos' },
  { id: 'linguica-defumada', name: 'Linguiça defumada (porco)', group: 'Espetinhos' },
  { id: 'medalhao-aipim-carne-seca', name: 'Medalhão de aipim com carne seca', group: 'Medalhões' },
  { id: 'medalhao-batata', name: 'Medalhão de batata recheada', group: 'Medalhões' },
  { id: 'medalhao-boi', name: 'Medalhão de boi', group: 'Medalhões' },
  { id: 'medalhao-cebola', name: 'Medalhão de cebola', group: 'Medalhões' },
  { id: 'medalhao-coracao', name: 'Medalhão de coração', group: 'Medalhões' },
  { id: 'medalhao-frango', name: 'Medalhão de frango', group: 'Medalhões' },
  { id: 'medalhao-frango-mucarela', name: 'Medalhão de frango recheado com muçarela', group: 'Medalhões' },
  { id: 'medalhao-mucarela', name: 'Medalhão de muçarela', group: 'Medalhões' },
  { id: 'medalhao-romeu-julieta', name: 'Medalhão Romeu e Julieta', group: 'Medalhões' },
  { id: 'medalhao-suino', name: 'Medalhão suíno', group: 'Medalhões' },
  { id: 'medalhao-tilapia', name: 'Medalhão de tilápia', group: 'Medalhões' },
  { id: 'meio-asa', name: 'Meio da asa (frango)', group: 'Outros espetos' },
  { id: 'mucarela', name: 'Muçarela', group: 'Outros espetos' },
  { id: 'peixe-tilapia', name: 'Peixe tilápia', group: 'Outros espetos' },
  { id: 'porco-pernil', name: 'Porco (pernil)', group: 'Outros espetos' },
  { id: 'salsichao', name: 'Salsichão', group: 'Outros espetos' },
  { id: 'sambiquira', name: 'Sambiquira', group: 'Outros espetos' },
  { id: 'toucinho-barriga', name: 'Toucinho de barriga', group: 'Outros espetos' },
  { id: 'asa-recheada', name: 'Asa recheada napolitana', group: 'Asa recheada' },
];

export const CATALOG_BY_ID = Object.fromEntries(SKEWERS.map(item => [item.id, item]));

export function totalQuantity(items) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function summarize(rows) {
  const people = new Map();
  const flavors = new Map();
  for (const row of rows) {
    const quantity = Number(row.quantity);
    if (!CATALOG_BY_ID[row.flavorId] || !Number.isSafeInteger(quantity) || quantity < 1) continue;
    const name = String(row.person || '').trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase('pt-BR');
    if (!people.has(key)) people.set(key, { name, total: 0, items: new Map() });
    const person = people.get(key);
    person.total += quantity;
    person.items.set(row.flavorId, (person.items.get(row.flavorId) || 0) + quantity);
    flavors.set(row.flavorId, (flavors.get(row.flavorId) || 0) + quantity);
  }
  return {
    people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    flavors: [...flavors.entries()].sort((a, b) => b[1] - a[1] || CATALOG_BY_ID[a[0]].name.localeCompare(CATALOG_BY_ID[b[0]].name, 'pt-BR')),
    total: [...flavors.values()].reduce((a, b) => a + b, 0),
  };
}
