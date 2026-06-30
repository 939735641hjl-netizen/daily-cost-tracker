'use strict';

const STORAGE_KEY = 'daily_cost_tracker_expenses';

const CATEGORY_EMOJI = {
  餐饮: '🍜', 交通: '🚇', 购物: '🛍️', 娱乐: '🎮',
  医疗: '💊', 居家: '🏠', 教育: '📚', 其他: '📦',
};

function loadExpenses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function formatAmount(n) {
  return '¥' + Number(n).toFixed(2);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStr(dateStr) {
  return dateStr.slice(0, 7);
}

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

function updateSummary(expenses) {
  const today = todayStr();
  const curMonth = currentMonthStr();

  const todayExp = expenses.filter(e => e.date === today);
  const monthExp = expenses.filter(e => e.date.startsWith(curMonth));

  const todayTotal = todayExp.reduce((s, e) => s + e.amount, 0);
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);

  const uniqueDays = new Set(monthExp.map(e => e.date)).size;
  const dayOfMonth = new Date().getDate();
  const divisor = Math.max(uniqueDays, 1);
  const monthlyAvg = monthTotal / divisor;

  const allDays = new Set(expenses.map(e => e.date)).size;

  document.getElementById('todayTotal').textContent = formatAmount(todayTotal);
  document.getElementById('monthlyAvg').textContent = formatAmount(monthlyAvg);
  document.getElementById('monthTotal').textContent = formatAmount(monthTotal);
  document.getElementById('recordDays').textContent = allDays + ' 天';
}

function updateFilterMonths(expenses) {
  const months = [...new Set(expenses.map(e => getMonthStr(e.date)))].sort().reverse();
  const sel = document.getElementById('filterMonth');
  const current = sel.value;
  sel.innerHTML = '<option value="">全部月份</option>';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m.replace('-', '年') + '月';
    sel.appendChild(opt);
  });
  if (months.includes(current)) sel.value = current;
}

function getFilteredExpenses(expenses) {
  const month = document.getElementById('filterMonth').value;
  const cat = document.getElementById('filterCategory').value;
  return expenses.filter(e =>
    (!month || e.date.startsWith(month)) &&
    (!cat || e.category === cat)
  );
}

function renderExpenses(expenses) {
  const container = document.getElementById('expenseItems');
  const filtered = getFilteredExpenses(expenses);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-hint">暂无匹配记录</div>';
    return;
  }

  // Sort by date desc, then by id desc within same date
  const sorted = [...filtered].sort((a, b) =>
    b.date.localeCompare(a.date) || b.id - a.id
  );

  let html = '';
  let lastDate = null;

  sorted.forEach(e => {
    if (e.date !== lastDate) {
      const label = e.date === todayStr() ? '今天 ' + e.date : e.date;
      html += `<div class="date-separator">${label}</div>`;
      lastDate = e.date;
    }
    const emoji = CATEGORY_EMOJI[e.category] || '📦';
    const noteHtml = e.note ? `<span>${e.note}</span>` : '';
    html += `
      <div class="expense-item" data-id="${e.id}">
        <div class="expense-item-left">
          <div class="expense-emoji">${emoji}</div>
          <div class="expense-info">
            <div class="category">${e.category}</div>
            <div class="meta">${noteHtml}</div>
          </div>
        </div>
        <div class="expense-item-right">
          <div class="expense-amount">${formatAmount(e.amount)}</div>
          <button class="btn-delete" data-id="${e.id}" title="删除">✕</button>
        </div>
      </div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteExpense(Number(btn.dataset.id)));
  });
}

function renderCategoryBreakdown(expenses) {
  const curMonth = currentMonthStr();
  const monthExp = expenses.filter(e => e.date.startsWith(curMonth));
  const container = document.getElementById('categoryBreakdown');

  if (monthExp.length === 0) {
    container.innerHTML = '<div class="empty-breakdown">本月暂无记录</div>';
    return;
  }

  const totals = {};
  monthExp.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = sorted[0][1];

  container.innerHTML = sorted.map(([cat, amt]) => `
    <div class="breakdown-item">
      <div class="breakdown-label">${CATEGORY_EMOJI[cat] || ''} ${cat}</div>
      <div class="breakdown-bar-wrap">
        <div class="breakdown-bar" style="width:${(amt / max * 100).toFixed(1)}%"></div>
      </div>
      <div class="breakdown-amount">${formatAmount(amt)}</div>
    </div>
  `).join('');
}

function render() {
  const expenses = loadExpenses();
  updateSummary(expenses);
  updateFilterMonths(expenses);
  renderExpenses(expenses);
  renderCategoryBreakdown(expenses);
}

function deleteExpense(id) {
  const expenses = loadExpenses().filter(e => e.id !== id);
  saveExpenses(expenses);
  render();
}

document.getElementById('expenseForm').addEventListener('submit', e => {
  e.preventDefault();
  const date = document.getElementById('expDate').value;
  const amount = parseFloat(document.getElementById('expAmount').value);
  const category = document.getElementById('expCategory').value;
  const note = document.getElementById('expNote').value.trim();

  if (!date || isNaN(amount) || amount <= 0) return;

  const expenses = loadExpenses();
  expenses.push({ id: Date.now(), date, amount, category, note });
  saveExpenses(expenses);

  document.getElementById('expAmount').value = '';
  document.getElementById('expNote').value = '';
  render();
});

document.getElementById('filterMonth').addEventListener('change', render);
document.getElementById('filterCategory').addEventListener('change', render);

document.getElementById('clearAllBtn').addEventListener('click', () => {
  if (confirm('确定要清空所有支出记录吗？此操作不可撤销。')) {
    saveExpenses([]);
    render();
  }
});

// Init: set today's date as default
document.getElementById('expDate').value = todayStr();

render();
