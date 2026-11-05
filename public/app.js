import { SKEWERS, CATALOG_BY_ID, totalQuantity, summarize } from './catalog.js';

// A ponte com a planilha é o aplicativo da Web do Apps Script, não o link do Google Sheets.
// Contas Workspace recebem a URL com /a/macros/<domínio>/; as duas formas valem.
const EXEC_URL = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/[\w-]+\/exec$/;
const configuredUrl = String(window.APP_SCRIPT_URL || '').trim().replace(/\/+$/, '');
const endpoint = EXEC_URL.test(configuredUrl) ? configuredUrl : '';

// Diz em uma frase o que arrumar em config.js, para não sobrar só o aviso genérico.
function setupProblem() {
  if (endpoint) return '';
  if (!configuredUrl) return 'Falta publicar o Apps Script da planilha e colar a URL dele em public/config.js.';
  if (configuredUrl.includes('docs.google.com')) return 'Em public/config.js está o link da planilha. Ali vai a URL do aplicativo da Web do Apps Script, terminada em /exec.';
  if (configuredUrl.endsWith('/dev')) return 'Em public/config.js está a URL de teste (/dev) do Apps Script. Use a da implantação, terminada em /exec.';
  return 'A URL em public/config.js não parece a de um aplicativo da Web do Apps Script: ela precisa terminar em /exec.';
}
const form = document.querySelector('#order-form');
const catalog = document.querySelector('#catalog');
const status = document.querySelector('#form-status');
const scoreStatus = document.querySelector('#score-status');
const submitButton = document.querySelector('#submit-button');

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function renderCatalog() {
  for (const group of [...new Set(SKEWERS.map(item => item.group))]) {
    const section = el('section', 'catalog-group');
    section.append(el('h3', '', `🍢 ${group.toUpperCase()}`));
    for (const item of SKEWERS.filter(item => item.group === group)) {
      const row = el('div', 'flavor-row');
      const label = el('label', 'flavor-name', item.name);
      label.htmlFor = `qty-${item.id}`;
      const controls = el('div', 'quantity-controls');
      const minus = el('button', 'step-button', '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', `Diminuir ${item.name}`);
      const input = el('input', 'qty-input');
      input.id = `qty-${item.id}`;
      input.name = item.id;
      input.type = 'number';
      input.min = '0';
      input.max = '99';
      input.step = '1';
      input.inputMode = 'numeric';
      input.value = '0';
      input.setAttribute('aria-label', `Quantidade de ${item.name}`);
      const plus = el('button', 'step-button', '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', `Aumentar ${item.name}`);
      minus.addEventListener('click', () => { input.value = String(Math.max(0, Number(input.value || 0) - 1)); updateTotal(); });
      plus.addEventListener('click', () => { input.value = String(Math.min(99, Number(input.value || 0) + 1)); updateTotal(); });
      input.addEventListener('input', updateTotal);
      controls.append(minus, input, plus);
      row.append(label, controls);
      section.append(row);
    }
    catalog.append(section);
  }
}

function selectedItems() {
  return SKEWERS.map(item => ({ flavorId: item.id, quantity: Number(document.getElementById(`qty-${item.id}`).value) }))
    .filter(item => item.quantity > 0);
}

function updateTotal() {
  const n = totalQuantity(selectedItems());
  document.querySelector('#my-total').textContent = `${n} ${n === 1 ? 'espeto' : 'espetos'}`;
}

function setFormStatus(message, type = '') {
  status.textContent = message;
  status.className = `status ${type}`;
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callback = `espetos_${crypto.randomUUID().replaceAll('-', '')}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new Error('A planilha demorou demais para responder.')), 12000);
    function finish(error, data) {
      clearTimeout(timer);
      script.remove();
      delete window[callback];
      error ? reject(error) : resolve(data);
    }
    window[callback] = data => finish(null, data);
    script.onerror = () => finish(new Error('O Apps Script não respondeu. Confira se a implantação está publicada para "Qualquer pessoa".'));
    const target = new URL(url);
    target.searchParams.set('callback', callback);
    target.searchParams.set('_', Date.now().toString());
    script.src = target.toString();
    document.head.append(script);
  });
}

function renderScore(rows) {
  const data = summarize(rows);
  document.querySelector('#group-total').textContent = String(data.total);
  document.querySelector('#people-total').textContent = String(data.people.length);
  const peopleList = document.querySelector('#people-list');
  const flavorList = document.querySelector('#flavor-list');
  peopleList.replaceChildren();
  flavorList.replaceChildren();
  if (!data.people.length) {
    peopleList.append(el('p', 'empty', 'Ninguém pediu ainda. Seja o primeiro!'));
    flavorList.append(el('p', 'empty', 'A brasa está esperando...'));
    return;
  }
  for (const person of data.people) {
    const card = el('div', 'person-card');
    const heading = el('div', 'person-heading');
    heading.append(el('strong', '', person.name), el('span', '', `${person.total} ${person.total === 1 ? 'espeto' : 'espetos'}`));
    card.append(heading);
    const list = el('ul');
    for (const [id, quantity] of person.items) list.append(el('li', '', `${quantity}× ${CATALOG_BY_ID[id].name}`));
    card.append(list);
    peopleList.append(card);
  }
  for (const [id, quantity] of data.flavors) {
    const row = el('div', 'flavor-score');
    row.append(el('span', '', CATALOG_BY_ID[id].name), el('strong', '', String(quantity)));
    flavorList.append(row);
  }
}

async function loadOrders() {
  if (!endpoint) {
    scoreStatus.textContent = 'Aguardando o organizador conectar a planilha.';
    renderScore([]);
    return [];
  }
  scoreStatus.textContent = 'Buscando os pedidos da turma...';
  try {
    const result = await jsonp(endpoint);
    if (!result?.ok || !Array.isArray(result.rows)) throw new Error(result?.error || 'Resposta inválida da planilha.');
    renderScore(result.rows);
    scoreStatus.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
    return result.rows;
  } catch (error) {
    scoreStatus.textContent = `Falha ao carregar: ${error.message}`;
    throw error;
  }
}

async function confirmOrder(orderId) {
  for (let attempt = 0; attempt < 7; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const rows = await loadOrders();
      if (rows.some(row => row.orderId === orderId)) return true;
    } catch { /* Tenta de novo: o Google pode levar alguns segundos para atualizar. */ }
  }
  return false;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const person = document.querySelector('#person').value.trim().replace(/\s+/g, ' ');
  const items = selectedItems();
  if (!person || person.length > 60 || /^[=+@-]/.test(person)) {
    setFormStatus('Digite um nome válido (até 60 letras).', 'error');
    document.querySelector('#person').focus();
    return;
  }
  if ([...catalog.querySelectorAll('.qty-input')].some(input => !Number.isInteger(Number(input.value)) || Number(input.value) < 0 || Number(input.value) > 99)) {
    setFormStatus('Cada quantidade deve ser um número inteiro entre 0 e 99.', 'error');
    return;
  }
  if (!items.length) {
    setFormStatus('Escolha pelo menos um espeto.', 'error');
    return;
  }
  if (!endpoint) {
    setFormStatus('A planilha ainda não está conectada. Avise o organizador.', 'error');
    return;
  }
  submitButton.disabled = true;
  setFormStatus('Enviando seu pedido para a planilha...');
  const orderId = crypto.randomUUID();
  try {
    const body = new URLSearchParams({ payload: JSON.stringify({ orderId, person, items }) });
    await fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    setFormStatus('Pedido enviado. Conferindo se entrou na planilha...');
    if (await confirmOrder(orderId)) {
      setFormStatus(`Fechado, ${person}! Seus ${totalQuantity(items)} espetos estão anotados.`, 'success');
      form.reset();
      updateTotal();
    } else {
      setFormStatus('Não consegui confirmar o pedido na planilha. Confira o placar antes de tentar de novo.', 'error');
    }
  } catch (error) {
    setFormStatus(`Falha no envio: ${error.message}. Confira o placar antes de tentar de novo.`, 'error');
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector('#refresh-button').addEventListener('click', () => loadOrders().catch(() => {}));
renderCatalog();
updateTotal();
if (!endpoint) {
  document.querySelector('#setup-warning-detail').textContent = setupProblem();
  document.querySelector('#setup-warning').hidden = false;
}
loadOrders().catch(() => {});
