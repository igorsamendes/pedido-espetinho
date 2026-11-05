import test from 'node:test';
import assert from 'node:assert/strict';
import { SKEWERS, summarize, totalQuantity } from '../public/catalog.js';

test('o cardápio tem IDs únicos e inclui asa recheada', () => {
  assert.equal(SKEWERS.length, 28);
  assert.equal(new Set(SKEWERS.map(item => item.id)).size, SKEWERS.length);
  assert.ok(SKEWERS.some(item => item.id === 'asa-recheada'));
});

test('o placar agrega por pessoa e sabor', () => {
  const rows = [
    { person: 'Igor', flavorId: 'kafta', quantity: 2 },
    { person: 'igor', flavorId: 'frango-peito', quantity: 1 },
    { person: 'Ana', flavorId: 'kafta', quantity: 3 },
    { person: 'Ana', flavorId: 'inventado', quantity: 99 },
  ];
  const summary = summarize(rows);
  assert.equal(summary.total, 6);
  assert.equal(summary.people.length, 2);
  assert.equal(summary.people.find(person => person.name === 'Igor').total, 3);
  assert.deepEqual(summary.flavors, [['kafta', 5], ['frango-peito', 1]]);
  assert.equal(totalQuantity([{ quantity: 2 }, { quantity: 3 }]), 5);
});
