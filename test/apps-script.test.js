import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function createScript() {
  const rows = [];
  const sheet = {
    getLastRow: () => rows.length,
    setFrozenRows: () => {},
    getRange(startRow, startCol, rowCount, colCount) {
      return {
        getValues: () => Array.from({ length: rowCount }, (_, i) => rows[startRow - 1 + i].slice(startCol - 1, startCol - 1 + colCount)),
        setValues(values) {
          values.forEach((value, i) => {
            const index = startRow - 1 + i;
            rows[index] ||= [];
            value.forEach((cell, j) => { rows[index][startCol - 1 + j] = cell; });
          });
          return this;
        },
        setFontWeight() { return this; },
        setBackground() { return this; },
      };
    },
  };
  let created = false;
  const lock = { held: false, waitLock() { this.held = true; }, hasLock() { return this.held; }, releaseLock() { this.held = false; } };
  const context = {
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: () => created ? sheet : null,
        insertSheet: () => { created = true; return sheet; },
      }),
      flush: () => {},
    },
    LockService: { getScriptLock: () => lock },
    ContentService: {
      MimeType: { JSON: 'json', JAVASCRIPT: 'js' },
      createTextOutput(body) { return { body, setMimeType() { return this; } }; },
    },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
  return { context, rows };
}

test('salva as linhas, lê o pedido e evita envio duplicado', () => {
  const { context, rows } = createScript();
  const order = { orderId: '12345678-1234-1234-1234-123456789abc', person: 'Igor', items: [
    { flavorId: 'kafta', quantity: 2 },
    { flavorId: 'frango-peito', quantity: 1 },
  ] };
  const event = { parameter: { payload: JSON.stringify(order) } };
  assert.equal(JSON.parse(context.doPost(event).body).ok, true);
  assert.equal(rows.length, 3);
  assert.equal(JSON.parse(context.doPost(event).body).duplicate, true);
  assert.equal(rows.length, 3);
  const response = JSON.parse(context.doGet({ parameter: {} }).body);
  assert.equal(response.rows.length, 2);
  assert.equal(response.rows[0].person, 'Igor');
  assert.equal(response.rows[0].flavor, 'Kafta');
  assert.equal(response.rows[0].quantity, 2);
});

test('rejeita sabor desconhecido e quantidade inválida', () => {
  const { context, rows } = createScript();
  const base = { orderId: '12345678-1234-1234-1234-123456789abc', person: 'Igor' };
  for (const items of [[{ flavorId: 'fake', quantity: 2 }], [{ flavorId: 'kafta', quantity: 0 }]]) {
    const result = JSON.parse(context.doPost({ parameter: { payload: JSON.stringify({ ...base, items }) } }).body);
    assert.equal(result.ok, false);
  }
  assert.equal(rows.length, 0);
});
