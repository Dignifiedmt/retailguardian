// script.js
import { askGemini } from './ai.js';

// -------------------- SessionStorage Keys --------------------
const STORAGE_KEYS = {
  CASH: 'rg_cash_entries',
  PETTY: 'rg_petty_entries',
  PETTY_FLOAT: 'rg_petty_float',
  PL_DATA: 'rg_pl_data'
};

// -------------------- State Management --------------------
let cashEntries = [];
let pettyEntries = [];
let pettyFloat = 0;

// Load from sessionStorage
function loadFromStorage() {
  try {
    cashEntries = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.CASH)) || [];
    pettyEntries = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.PETTY)) || [];
    pettyFloat = parseFloat(sessionStorage.getItem(STORAGE_KEYS.PETTY_FLOAT)) || 0;
  } catch (e) {
    console.warn('Storage load error', e);
  }
}

function saveCashEntries() {
  sessionStorage.setItem(STORAGE_KEYS.CASH, JSON.stringify(cashEntries));
}
function savePettyEntries() {
  sessionStorage.setItem(STORAGE_KEYS.PETTY, JSON.stringify(pettyEntries));
}
function savePettyFloat() {
  sessionStorage.setItem(STORAGE_KEYS.PETTY_FLOAT, pettyFloat);
}

// -------------------- UI Helpers --------------------
function formatCurrency(amount) {
  return '₦' + parseFloat(amount || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function getTodayDate() {
  return new Date().toISOString().slice(0,10);
}

// -------------------- Tabs --------------------
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      tabs.forEach(b => b.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// -------------------- Wizard --------------------
function initWizard() {
  const steps = document.querySelectorAll('.wizard-step');
  const stepIndicators = document.querySelectorAll('.step');
  const nextBtns = document.querySelectorAll('.next-step');
  const prevBtns = document.querySelectorAll('.prev-step');
  const form = document.getElementById('wizard-form');
  const resultDiv = document.getElementById('wizard-result');
  const profitMsg = document.getElementById('wizard-profit-message');
  const saveBtn = document.getElementById('save-wizard-to-pl');

  let currentStep = 1;

  function showStep(step) {
    steps.forEach((s, idx) => {
      s.classList.toggle('hidden', idx+1 !== step);
    });
    stepIndicators.forEach((ind, idx) => {
      ind.classList.toggle('active', idx+1 === step);
    });
    currentStep = step;
  }

  nextBtns.forEach(btn => btn.addEventListener('click', () => {
    const stepDiv = btn.closest('.wizard-step');
    const inputs = stepDiv.querySelectorAll('input[required]');
    let valid = true;
    inputs.forEach(inp => { if (!inp.value) valid = false; });
    if (valid) showStep(currentStep + 1);
    else alert('Please fill in this field.');
  }));

  prevBtns.forEach(btn => btn.addEventListener('click', () => showStep(currentStep - 1)));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const opening = parseFloat(document.getElementById('wiz-opening').value) || 0;
    const purchases = parseFloat(document.getElementById('wiz-purchases').value) || 0;
    const sales = parseFloat(document.getElementById('wiz-sales').value) || 0;
    const expenses = parseFloat(document.getElementById('wiz-expenses').value) || 0;
    
    const costOfGoods = opening + purchases;
    const grossProfit = sales - costOfGoods;
    const netProfit = grossProfit - expenses;

    let message = '';
    if (netProfit >= 0) {
      message = `✅ You made a profit of ${formatCurrency(netProfit)}. Well done!`;
    } else {
      message = `⚠️ You have a loss of ${formatCurrency(Math.abs(netProfit))}. Review expenses.`;
    }
    profitMsg.textContent = message;
    resultDiv.classList.remove('hidden');
    // Store for potential save
    resultDiv.dataset.plData = JSON.stringify({ opening, purchases, sales, expenses, netProfit });
  });

  saveBtn.addEventListener('click', () => {
    if (resultDiv.dataset.plData) {
      const data = JSON.parse(resultDiv.dataset.plData);
      sessionStorage.setItem(STORAGE_KEYS.PL_DATA, JSON.stringify(data));
      // Update PL form fields
      document.getElementById('pl-opening').value = data.opening;
      document.getElementById('pl-purchases').value = data.purchases;
      document.getElementById('pl-sales').value = data.sales;
      document.getElementById('pl-expenses').value = data.expenses;
      updatePLResult(data.netProfit);
      updateDashboard();
      alert('Saved to Profit & Loss and Dashboard!');
    }
  });
}

// -------------------- Profit & Loss --------------------
function updatePLResult(profit) {
  const msg = document.getElementById('pl-message');
  const resultDiv = document.getElementById('pl-result');
  if (profit >= 0) {
    msg.textContent = `Profit: ${formatCurrency(profit)}`;
  } else {
    msg.textContent = `Loss: ${formatCurrency(Math.abs(profit))}`;
  }
  resultDiv.classList.remove('hidden');
}

function initPLCalculator() {
  const form = document.getElementById('pl-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const opening = parseFloat(document.getElementById('pl-opening').value) || 0;
    const purchases = parseFloat(document.getElementById('pl-purchases').value) || 0;
    const sales = parseFloat(document.getElementById('pl-sales').value) || 0;
    const expenses = parseFloat(document.getElementById('pl-expenses').value) || 0;
    const netProfit = sales - (opening + purchases) - expenses;
    updatePLResult(netProfit);
    sessionStorage.setItem(STORAGE_KEYS.PL_DATA, JSON.stringify({ opening, purchases, sales, expenses, netProfit }));
    updateDashboard();
  });
}

// -------------------- Cash Book --------------------
function renderCashBook() {
  const tbody = document.querySelector('#cash-table tbody');
  const balanceSpan = document.getElementById('cash-balance');
  tbody.innerHTML = '';
  let balance = 0;
  cashEntries.forEach(entry => {
    const tr = document.createElement('tr');
    const inAmount = entry.type === 'in' ? entry.amount : 0;
    const outAmount = entry.type === 'out' ? entry.amount : 0;
    balance = balance + inAmount - outAmount;
    tr.innerHTML = `<td>${entry.date}</td><td>${entry.desc}</td><td>${inAmount ? formatCurrency(inAmount) : '-'}</td><td>${outAmount ? formatCurrency(outAmount) : '-'}</td>`;
    tbody.appendChild(tr);
  });
  balanceSpan.textContent = formatCurrency(balance);
}

function initCashBook() {
  const form = document.getElementById('cash-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('cash-type').value;
    const amount = parseFloat(document.getElementById('cash-amount').value);
    const desc = document.getElementById('cash-desc').value.trim();
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    cashEntries.push({
      date: getTodayDate(),
      type,
      amount,
      desc
    });
    saveCashEntries();
    renderCashBook();
    form.reset();
  });

  document.getElementById('clear-cash').addEventListener('click', () => {
    if (confirm('Clear all cash records?')) {
      cashEntries = [];
      saveCashEntries();
      renderCashBook();
    }
  });
}

// -------------------- Petty Cash --------------------
function renderPettyCash() {
  const tbody = document.querySelector('#petty-table tbody');
  const spentSpan = document.getElementById('petty-spent');
  const remainingSpan = document.getElementById('petty-remaining');
  tbody.innerHTML = '';
  let totalSpent = 0;
  pettyEntries.forEach(entry => {
    totalSpent += entry.amount;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${entry.date}</td><td>${entry.desc}</td><td>${formatCurrency(entry.amount)}</td>`;
    tbody.appendChild(tr);
  });
  const remaining = pettyFloat - totalSpent;
  spentSpan.textContent = formatCurrency(totalSpent);
  remainingSpan.textContent = formatCurrency(remaining);
  document.getElementById('petty-float').value = pettyFloat;
  updateDashboard();
}

function initPettyCash() {
  const floatInput = document.getElementById('petty-float');
  floatInput.value = pettyFloat;
  
  document.getElementById('set-float').addEventListener('click', () => {
    pettyFloat = parseFloat(floatInput.value) || 0;
    savePettyFloat();
    renderPettyCash();
  });

  const form = document.getElementById('petty-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('petty-amount').value);
    const desc = document.getElementById('petty-desc').value.trim();
    if (!amount || amount <= 0) return alert('Enter valid amount');
    pettyEntries.push({ date: getTodayDate(), amount, desc });
    savePettyEntries();
    renderPettyCash();
    form.reset();
  });

  document.getElementById('clear-petty').addEventListener('click', () => {
    if (confirm('Clear all petty cash records?')) {
      pettyEntries = [];
      savePettyEntries();
      renderPettyCash();
    }
  });
}

// -------------------- Dashboard --------------------
function updateDashboard() {
  const plData = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.PL_DATA) || '{}');
  const sales = plData.sales || 0;
  const expenses = plData.expenses || 0;
  const profit = plData.netProfit || 0;
  
  const totalSpent = pettyEntries.reduce((sum, e) => sum + e.amount, 0);
  const pettyRemaining = pettyFloat - totalSpent;

  document.getElementById('dash-sales').textContent = formatCurrency(sales);
  document.getElementById('dash-expenses').textContent = formatCurrency(expenses);
  document.getElementById('dash-profit').textContent = formatCurrency(profit);
  document.getElementById('dash-petty').textContent = formatCurrency(pettyRemaining);
}

// -------------------- AI Assistant (real Gemini) --------------------
function initAIAssistant() {
  const form = document.getElementById('ai-form');
  const input = document.getElementById('ai-prompt');
  const chatHistory = document.getElementById('chat-history');
  const loadingDiv = document.getElementById('ai-loading');
  const errorDiv = document.getElementById('ai-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    // Add user message
    addChatMessage(question, 'user');
    input.value = '';
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');

    try {
      const response = await askGemini(question);
      addChatMessage(response, 'bot');
    } catch (err) {
      errorDiv.textContent = '⚠️ AI service error. Check your API key or network.';
      errorDiv.classList.remove('hidden');
      console.error(err);
    } finally {
      loadingDiv.classList.add('hidden');
    }
  });

  function addChatMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.textContent = text;
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

// -------------------- Initial Load --------------------
function init() {
  loadFromStorage();
  initTabs();
  initWizard();
  initPLCalculator();
  initCashBook();
  initPettyCash();
  initAIAssistant();
  
  renderCashBook();
  renderPettyCash();
  updateDashboard();

  // Prefill PL from storage if exists
  const savedPL = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.PL_DATA) || '{}');
  if (savedPL.opening !== undefined) {
    document.getElementById('pl-opening').value = savedPL.opening;
    document.getElementById('pl-purchases').value = savedPL.purchases;
    document.getElementById('pl-sales').value = savedPL.sales;
    document.getElementById('pl-expenses').value = savedPL.expenses;
    updatePLResult(savedPL.netProfit);
  }
}

init();
