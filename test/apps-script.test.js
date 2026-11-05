import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const NOOP_RANGE_METHODS = [
  'setFontWeight', 'setBackground', 'setFontColor', 'setFontSize', 'setFontStyle', 'setFontFamily',
  'setHorizontalAlignment', 'setVerticalAlignment', 'setNumberFormat', 'setWrap', 'setBorder',
  'applyRowBanding', 'merge', 'activate',
];
const NOOP_SHEET_METHODS = [
  'setFrozenRows', 'setRowHeight', 'setColumnWidth', 'setTabColor', 'autoResizeColumn',
  'hideColumns', 'showColumns', 'activate',
];

function parseA1(a1) {
  const [start, end = start] = String(a1).split(':');
  const toCell = ref => {
    const match = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!match) throw new Error(`Referência A1 inválida: ${ref}`);
    let column = 0;
    for (const letter of match[1]) column = column * 26 + (letter.charCodeAt(0) - 64);
    return { row: Number(match[2]), column };
  };
  const from = toCell(start);
  const to = toCell(end);
  return [from.row, from.column, to.row - from.row + 1, to.column - from.column + 1];
}

function createSheet(name, rows, state) {
  function cellKey(row, column) {
    return `${row},${column}`;
  }

  function write(row, column, value) {
    rows[row - 1] ||= [];
    rows[row - 1][column - 1] = value;
  }

  function createRange(startRow, startColumn, rowCount, columnCount) {
    const range = {
      getValues: () => Array.from({ length: rowCount }, (_, i) =>
        Array.from({ length: columnCount }, (_, j) => (rows[startRow - 1 + i] || [])[startColumn - 1 + j])),
      setValues(values) {
        values.forEach((row, i) => row.forEach((cell, j) => write(startRow + i, startColumn + j, cell)));
        return range;
      },
      setValue(value) {
        write(startRow, startColumn, value);
        return range;
      },
      setFormula(formula) {
        state.formulas[cellKey(startRow, startColumn)] = formula;
        write(startRow, startColumn, formula);
        return range;
      },
      createFilter() {
        state.filter = { remove() { state.filter = null; } };
        return state.filter;
      },
    };
    for (const method of NOOP_RANGE_METHODS) range[method] ||= () => range;
    return range;
  }

  const sheet = {
    getName: () => name,
    getLastRow: () => rows.length,
    getLastColumn: () => rows.reduce((max, row) => Math.max(max, row ? row.length : 0), 0),
    getMaxRows: () => 1000,
    getMaxColumns: () => state.maxColumns,
    getFilter: () => state.filter,
    clear() {
      rows.length = 0;
      state.formulas = {};
      return sheet;
    },
    deleteRows(startRow, count) {
      rows.splice(startRow - 1, count);
      return sheet;
    },
    deleteColumns(startColumn, count) {
      state.maxColumns -= count;
      return sheet;
    },
    getRange(...args) {
      const [startRow, startColumn, rowCount = 1, columnCount = 1] =
        typeof args[0] === 'string' ? parseA1(args[0]) : args;
      return createRange(startRow, startColumn, rowCount, columnCount);
    },
  };
  for (const method of NOOP_SHEET_METHODS) sheet[method] ||= () => sheet;
  return sheet;
}

function createSpreadsheet(initialTabNames) {
  const backing = new Map();
  const states = new Map();
  const sheets = [];

  function rowsOf(name) {
    if (!backing.has(name)) backing.set(name, []);
    return backing.get(name);
  }

  function stateOf(name) {
    if (!states.has(name)) states.set(name, { maxColumns: 26, filter: null, formulas: {} });
    return states.get(name);
  }

  const spreadsheet = {
    locale: null,
    timeZone: null,
    rowsOf,
    formulasOf: name => stateOf(name).formulas,
    stateOf,
    tabNames: () => sheets.map(sheet => sheet.getName()),
    setSpreadsheetLocale(value) { spreadsheet.locale = value; return spreadsheet; },
    setSpreadsheetTimeZone(value) { spreadsheet.timeZone = value; return spreadsheet; },
    getSheets: () => sheets.slice(),
    getSheetByName: name => sheets.find(sheet => sheet.getName() === name) || null,
    insertSheet(name, index = sheets.length) {
      const sheet = createSheet(name, rowsOf(name), stateOf(name));
      sheets.splice(index, 0, sheet);
      return sheet;
    },
    deleteSheet(target) {
      const index = sheets.indexOf(target);
      if (index !== -1) sheets.splice(index, 1);
      return spreadsheet;
    },
  };
  for (const name of initialTabNames) spreadsheet.insertSheet(name);
  return spreadsheet;
}

function createScript({ initialTabNames = ['Página1'] } = {}) {
  const spreadsheet = createSpreadsheet(initialTabNames);
  const lock = { held: false, waitLock() { this.held = true; }, hasLock() { return this.held; }, releaseLock() { this.held = false; } };
  const context = {
    console: { log() {} },
    SpreadsheetApp: {
      BorderStyle: { SOLID: 'SOLID' },
      openById: () => spreadsheet,
      getActive: () => spreadsheet,
      getUi: () => { throw new Error('Sem interface neste contexto.'); },
      flush: () => {},
    },
    LockService: { getScriptLock: () => lock },
    ContentService: {
      MimeType: { JSON: 'json', JAVASCRIPT: 'js' },
      createTextOutput(body) { return { body, setMimeType() { return this; } }; },
    },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
  return { context, spreadsheet, rows: spreadsheet.rowsOf('Pedidos') };
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

test('configurarPlanilha monta as abas, o cabeçalho e o resumo', () => {
  const { context, spreadsheet } = createScript();
  context.configurarPlanilha();

  assert.deepEqual(spreadsheet.tabNames(), ['Pedidos', 'Resumo']);
  assert.equal(spreadsheet.locale, 'pt_BR');
  assert.equal(spreadsheet.timeZone, 'America/Sao_Paulo');

  const pedidos = spreadsheet.rowsOf('Pedidos');
  assert.deepEqual(pedidos[0], ['Data e hora', 'Pedido ID', 'Pessoa', 'Sabor ID', 'Sabor', 'Quantidade']);
  assert.equal(pedidos.length, 1);
  assert.equal(spreadsheet.stateOf('Pedidos').maxColumns, 6);
  assert.ok(spreadsheet.stateOf('Pedidos').filter, 'a aba Pedidos deve ganhar filtro no cabeçalho');

  const formulas = spreadsheet.formulasOf('Resumo');
  assert.equal(formulas['4,2'], '=SUM(Pedidos!F2:F)');
  assert.match(formulas['10,1'], /QUERY\(Pedidos!A2:F, "select C, sum\(F\)/);
  assert.match(formulas['10,4'], /QUERY\(Pedidos!A2:F, "select E, sum\(F\)/);
  assert.match(formulas['10,1'], /label C 'Pessoa', sum\(F\) 'Espetos'/);
});

test('configurarPlanilha roda de novo sem apagar os pedidos já feitos', () => {
  const { context, spreadsheet, rows } = createScript();
  const order = { orderId: '12345678-1234-1234-1234-123456789abc', person: 'Igor', items: [{ flavorId: 'kafta', quantity: 2 }] };
  assert.equal(JSON.parse(context.doPost({ parameter: { payload: JSON.stringify(order) } }).body).ok, true);
  assert.equal(rows.length, 2);

  context.configurarPlanilha();
  context.configurarPlanilha();

  assert.equal(spreadsheet.rowsOf('Pedidos').length, 2);
  assert.equal(spreadsheet.rowsOf('Pedidos')[1][2], 'Igor');
  assert.deepEqual(spreadsheet.tabNames(), ['Pedidos', 'Resumo']);
});

test('limparPedidos apaga os dados mas mantém o cabeçalho', () => {
  const { context, spreadsheet } = createScript();
  const order = { orderId: '12345678-1234-1234-1234-123456789abc', person: 'Igor', items: [{ flavorId: 'kafta', quantity: 2 }] };
  context.doPost({ parameter: { payload: JSON.stringify(order) } });
  assert.equal(spreadsheet.rowsOf('Pedidos').length, 2);

  context.limparPedidos();

  const pedidos = spreadsheet.rowsOf('Pedidos');
  assert.equal(pedidos.length, 1);
  assert.deepEqual(pedidos[0], ['Data e hora', 'Pedido ID', 'Pessoa', 'Sabor ID', 'Sabor', 'Quantidade']);
});
