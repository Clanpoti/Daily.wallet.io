/* ============================================================
   SMART FINANCE — script.js
   Personal Finance Manager — Full JavaScript Logic
   ============================================================ */

'use strict';

// ── State ────────────────────────────────────────────────────
let currentUser   = null;
let transactions  = [];
let savingGoals   = [];
let bills         = [];
let categories    = [];
let chartBar      = null;
let chartPie      = null;
let chartLine     = null;
let chartMini     = null;

// ── Default Categories ───────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id:'cat-1', name:'Makanan',      icon:'🍔', type:'both',       isDefault:true },
  { id:'cat-2', name:'Transportasi', icon:'🚗', type:'both',       isDefault:true },
  { id:'cat-3', name:'Pendidikan',   icon:'📚', type:'both',       isDefault:true },
  { id:'cat-4', name:'Hiburan',      icon:'🎮', type:'pengeluaran',isDefault:true },
  { id:'cat-5', name:'Gaji',         icon:'💼', type:'pemasukan',  isDefault:true },
  { id:'cat-6', name:'Investasi',    icon:'📈', type:'pemasukan',  isDefault:true },
  { id:'cat-7', name:'Kesehatan',    icon:'💊', type:'both',       isDefault:true },
  { id:'cat-8', name:'Belanja',      icon:'🛍️', type:'pengeluaran',isDefault:true },
  { id:'cat-9', name:'Lainnya',      icon:'📌', type:'both',       isDefault:true },
];

// ── Utility ──────────────────────────────────────────────────

/** Generate a random ID */
const genId = () => '_' + Math.random().toString(36).substr(2, 9);

/** Format number as Rupiah */
const formatRp = (n) => {
  if (n === undefined || n === null) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
};

/** Short Rupiah (for charts) */
const shortRp = (n) => {
  if (n >= 1_000_000) return 'Rp ' + (n/1_000_000).toFixed(1) + 'jt';
  if (n >= 1_000)     return 'Rp ' + (n/1_000).toFixed(0) + 'rb';
  return 'Rp ' + n;
};

/** Format date string to locale */
const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
};

/** Days until date */
const daysUntil = (dateStr) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86_400_000);
};

/** Save to localStorage */
const save = (key, val) => localStorage.setItem('sf_' + key, JSON.stringify(val));
const load = (key, def) => {
  try { return JSON.parse(localStorage.getItem('sf_' + key)) || def; }
  catch { return def; }
};

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type !== 'success' ? type : ''}`;
  toast.innerHTML = `<span>${icons[type]||'✅'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-fadeout');
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}

// ── Pages ─────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + name);
  if (target) target.classList.add('active');
  if (name === 'dashboard') initDashboard();
}

// ── Dark Mode ─────────────────────────────────────────────────
function toggleDarkMode() {
  const html  = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  save('darkMode', !isDark);
  updateDarkModeUI(!isDark);
}

function updateDarkModeUI(isDark) {
  const icon  = isDark ? '☀️' : '🌙';
  const label = isDark ? 'Light Mode' : 'Dark Mode';
  const di = document.getElementById('dark-icon');
  const dl = document.getElementById('dark-label');
  const dit = document.getElementById('dark-icon-top');
  if (di)  di.textContent  = icon;
  if (dl)  dl.textContent  = label;
  if (dit) dit.textContent = icon;
}

// ── Auth ──────────────────────────────────────────────────────

function togglePassword(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  const errEl    = document.getElementById('reg-error');
  errEl.classList.add('hidden');

  if (!name || !email || !password || !confirm) {
    return showErr(errEl, 'Semua field wajib diisi!');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showErr(errEl, 'Format email tidak valid!');
  }
  if (password.length < 8) {
    return showErr(errEl, 'Password minimal 8 karakter!');
  }
  if (password !== confirm) {
    return showErr(errEl, 'Password dan konfirmasi tidak cocok!');
  }

  const users = load('users', []);
  if (users.find(u => u.email === email)) {
    return showErr(errEl, 'Email sudah terdaftar. Silakan login.');
  }

  const newUser = { id: genId(), name, email, password, avatar: '👤', createdAt: new Date().toISOString() };
  users.push(newUser);
  save('users', users);

  showToast('Pendaftaran berhasil! Silakan login.', 'success');
  showPage('login');
  document.getElementById('register-form').reset();
}

function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('remember-me').checked;
  const errEl    = document.getElementById('login-error');
  errEl.classList.add('hidden');

  const users = load('users', []);
  const user  = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return showErr(errEl, 'Email atau password salah!');
  }

  currentUser = user;
  save('currentUser', user);
  if (remember) save('rememberEmail', email);

  loadUserData();
  showPage('dashboard');
  showToast(`Selamat datang, ${user.name}! 🎉`);
  document.getElementById('login-form').reset();
}

function forgotPassword() {
  showToast('Link reset password telah dikirim ke email Anda. (Simulasi)', 'info');
}

function handleLogout() {
  currentUser = null;
  save('currentUser', null);
  showPage('landing');
  showToast('Berhasil logout. Sampai jumpa!', 'info');
}

function showErr(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── Load User Data ────────────────────────────────────────────
function loadUserData() {
  if (!currentUser) return;
  const uid = currentUser.id;
  transactions = load('transactions_' + uid, []);
  savingGoals  = load('savings_' + uid, []);
  bills        = load('bills_' + uid, []);
  categories   = load('categories_' + uid, DEFAULT_CATEGORIES);
}

function saveUserData() {
  if (!currentUser) return;
  const uid = currentUser.id;
  save('transactions_' + uid, transactions);
  save('savings_' + uid, savingGoals);
  save('bills_' + uid, bills);
  save('categories_' + uid, categories);
}

// ── Dashboard Init ────────────────────────────────────────────
function initDashboard() {
  // Update user info in UI
  if (!currentUser) return;
  document.getElementById('welcome-name').textContent = currentUser.name.split(' ')[0];
  document.getElementById('header-avatar').textContent = currentUser.avatar || '👤';

  const today = new Date();
  document.getElementById('current-date-display').textContent =
    today.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  renderSummaryCards();
  renderRecentTransactions();
  renderMiniChart();
  checkExpenseWarning();
}

// ── Summary Cards ─────────────────────────────────────────────
function renderSummaryCards() {
  const income  = transactions.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0);
  const balance = income;
  const net     = income - expense;

  document.getElementById('total-balance').textContent = formatRp(balance);
  document.getElementById('total-income').textContent  = formatRp(income);
  document.getElementById('total-expense').textContent = formatRp(expense);
  document.getElementById('net-amount').textContent    = formatRp(net);

  // Color net based on value
  const netEl = document.getElementById('net-amount');
  netEl.style.color = net >= 0 ? 'var(--primary)' : '#dc2626';
}

function checkExpenseWarning() {
  const now      = new Date();
  const month    = now.getMonth(); const year = now.getFullYear();
  const monthly  = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const mIncome  = monthly.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0);
  const mExpense = monthly.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0);

  const banner = document.getElementById('expense-warning');
  if (mExpense > mIncome && mIncome > 0) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

// ── Recent Transactions ───────────────────────────────────────
function renderRecentTransactions() {
  const list = document.getElementById('recent-transactions-list');
  const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  if (recent.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;font-size:.875rem;">Belum ada transaksi</p>';
    return;
  }

  list.innerHTML = recent.map(t => {
    const cat = getCategoryById(t.categoryId);
    const isIncome = t.type === 'pemasukan';
    return `
      <div class="tx-mini">
        <div class="tx-mini-icon ${isIncome ? 'income' : 'expense'}">${cat ? cat.icon : '💳'}</div>
        <div class="tx-mini-info">
          <strong>${t.note || (cat ? cat.name : 'Transaksi')}</strong>
          <small>${formatDate(t.date)} · ${cat ? cat.name : '-'}</small>
        </div>
        <div class="tx-mini-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'} ${formatRp(t.amount)}
        </div>
      </div>`;
  }).join('');
}

// ── Transactions Tab ──────────────────────────────────────────

/** Populate category filter and transaction category select */
function populateCategorySelects() {
  const filterCat = document.getElementById('filter-category');
  const tCat      = document.getElementById('t-category');
  if (!filterCat || !tCat) return;

  filterCat.innerHTML = '<option value="">Semua Kategori</option>' +
    categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

  tCat.innerHTML = categories.map(c =>
    `<option value="${c.id}">${c.icon} ${c.name}</option>`
  ).join('');
}

function renderTransactionsTable(list) {
  const tbody = document.getElementById('transactions-tbody');
  const noEl  = document.getElementById('no-transactions');

  if (!list || list.length === 0) {
    tbody.innerHTML = '';
    noEl.classList.remove('hidden');
    return;
  }
  noEl.classList.add('hidden');

  const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  tbody.innerHTML = sorted.map(t => {
    const cat = getCategoryById(t.categoryId);
    const isIncome = t.type === 'pemasukan';
    return `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td>${cat ? cat.icon + ' ' + cat.name : '-'}</td>
        <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${isIncome ? '📈 Pemasukan' : '📉 Pengeluaran'}</span></td>
        <td class="${isIncome ? 'amount-income' : 'amount-expense'}">${isIncome ? '+' : '-'} ${formatRp(t.amount)}</td>
        <td style="color:var(--text-secondary);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.note || '-'}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn action-btn-edit" onclick="editTransaction('${t.id}')" title="Edit">✏️</button>
            <button class="action-btn action-btn-del" onclick="deleteTransaction('${t.id}')" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function filterTransactions() {
  const q    = document.getElementById('search-input').value.toLowerCase();
  const type = document.getElementById('filter-type').value;
  const cat  = document.getElementById('filter-category').value;
  const ds   = document.getElementById('filter-date-start').value;
  const de   = document.getElementById('filter-date-end').value;

  const filtered = transactions.filter(t => {
    const catObj = getCategoryById(t.categoryId);
    const text = (t.note + ' ' + (catObj ? catObj.name : '')).toLowerCase();
    if (q && !text.includes(q)) return false;
    if (type && t.type !== type) return false;
    if (cat && t.categoryId !== cat) return false;
    if (ds && t.date < ds) return false;
    if (de && t.date > de) return false;
    return true;
  });

  renderTransactionsTable(filtered);
}

function resetFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-date-start').value = '';
  document.getElementById('filter-date-end').value = '';
  renderTransactionsTable(transactions);
}

/** Open add transaction modal with today's date */
function openAddTransactionModal() {
  document.getElementById('modal-transaction-title').textContent = 'Tambah Transaksi';
  document.getElementById('transaction-id').value = '';
  document.getElementById('transaction-form').reset();
  document.getElementById('t-date').value = new Date().toISOString().split('T')[0];
  populateCategorySelects();
  openModal('modal-add-transaction');
}

function editTransaction(id) {
  const t = transactions.find(x => x.id === id);
  if (!t) return;
  populateCategorySelects();
  document.getElementById('modal-transaction-title').textContent = 'Edit Transaksi';
  document.getElementById('transaction-id').value = t.id;
  document.getElementById('t-date').value = t.date;
  document.getElementById('t-type').value = t.type;
  document.getElementById('t-category').value = t.categoryId;
  document.getElementById('t-amount').value = t.amount;
  document.getElementById('t-note').value = t.note || '';
  openModal('modal-add-transaction');
}

function saveTransaction(e) {
  e.preventDefault();
  const id     = document.getElementById('transaction-id').value;
  const date   = document.getElementById('t-date').value;
  const type   = document.getElementById('t-type').value;
  const catId  = document.getElementById('t-category').value;
  const amount = parseFloat(document.getElementById('t-amount').value);
  const note   = document.getElementById('t-note').value.trim();

  if (!date || !type || !catId || isNaN(amount) || amount <= 0) {
    return showToast('Lengkapi semua field yang wajib diisi!', 'error');
  }

  if (id) {
    // Edit
    const idx = transactions.findIndex(t => t.id === id);
    if (idx > -1) transactions[idx] = { ...transactions[idx], date, type, categoryId: catId, amount, note };
    showToast('Transaksi berhasil diperbarui! ✨');
  } else {
    // Add
    transactions.push({ id: genId(), date, type, categoryId: catId, amount, note, createdAt: new Date().toISOString() });
    showToast('Transaksi berhasil ditambahkan! 🎉');
  }

  saveUserData();
  closeModal('modal-add-transaction');
  renderTransactionsTable(transactions);
  renderSummaryCards();
  renderRecentTransactions();
  renderMiniChart();
  renderCharts();
  checkExpenseWarning();
}

function deleteTransaction(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  transactions = transactions.filter(t => t.id !== id);
  saveUserData();
  renderTransactionsTable(transactions);
  renderSummaryCards();
  renderRecentTransactions();
  renderMiniChart();
  renderCharts();
  checkExpenseWarning();
  showToast('Transaksi berhasil dihapus.', 'warning');
}

// ── Statistics ────────────────────────────────────────────────

function renderCharts() {
  renderBarChart();
  renderPieChart();
  renderLineChart();
}

function getMonthlyData() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('id-ID', { month: 'short', year:'2-digit' }),
      month: d.getMonth(),
      year:  d.getFullYear(),
    });
  }
  return months.map(m => {
    const txs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    });
    return {
      label:   m.label,
      income:  txs.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0),
      expense: txs.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0),
    };
  });
}

function renderBarChart() {
  const ctx = document.getElementById('bar-chart');
  if (!ctx) return;
  const data = getMonthlyData();

  if (chartBar) chartBar.destroy();
  chartBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'Pemasukan',
          data: data.map(d => d.income),
          backgroundColor: 'rgba(22,163,74,0.8)',
          borderRadius: 6,
        },
        {
          label: 'Pengeluaran',
          data: data.map(d => d.expense),
          backgroundColor: 'rgba(239,68,68,0.75)',
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => shortRp(v) },
          grid: { color: 'rgba(148,163,184,0.15)' },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

function renderPieChart() {
  const ctx = document.getElementById('pie-chart');
  if (!ctx) return;

  const expenses = transactions.filter(t => t.type === 'pengeluaran');
  const byCategory = {};
  expenses.forEach(t => {
    const cat = getCategoryById(t.categoryId);
    const name = cat ? cat.name : 'Lainnya';
    byCategory[name] = (byCategory[name] || 0) + t.amount;
  });

  const labels = Object.keys(byCategory);
  const values = Object.values(byCategory);
  const colors = ['#16a34a','#22c55e','#4ade80','#86efac','#ef4444','#f97316','#3b82f6','#8b5cf6','#ec4899'];

  if (chartPie) chartPie.destroy();
  chartPie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff',
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatRp(ctx.raw)}` } },
      },
      cutout: '60%',
    },
  });
}

function renderLineChart() {
  const ctx = document.getElementById('line-chart');
  if (!ctx) return;
  const data = getMonthlyData();

  if (chartLine) chartLine.destroy();
  chartLine = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'Pemasukan',
          data: data.map(d => d.income),
          borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)',
          fill: true, tension: 0.4, pointRadius: 5,
        },
        {
          label: 'Pengeluaran',
          data: data.map(d => d.expense),
          borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true, tension: 0.4, pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => shortRp(v) },
          grid: { color: 'rgba(148,163,184,0.15)' },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

function renderMiniChart() {
  const ctx = document.getElementById('mini-chart');
  if (!ctx) return;
  const data = getMonthlyData();

  if (chartMini) chartMini.destroy();
  chartMini = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        { label: 'Masuk', data: data.map(d => d.income),  backgroundColor: 'rgba(22,163,74,0.75)', borderRadius: 4 },
        { label: 'Keluar', data: data.map(d => d.expense), backgroundColor: 'rgba(239,68,68,0.65)', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => shortRp(v) }, grid: { color: 'rgba(148,163,184,0.1)' } },
        x: { grid: { display: false } },
      },
    },
  });
}

// ── Saving Goals ──────────────────────────────────────────────

function renderSavingGoals() {
  const list = document.getElementById('savings-list');
  const noEl = document.getElementById('no-savings');

  if (savingGoals.length === 0) {
    list.innerHTML = '';
    noEl.classList.remove('hidden');
    return;
  }
  noEl.classList.add('hidden');

  list.innerHTML = savingGoals.map(g => {
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    const remain = Math.max(0, g.target - g.current);
    return `
      <div class="saving-card">
        <div class="saving-header">
          <div class="saving-title">
            <div class="saving-icon">${g.icon || '🎯'}</div>
            <div>
              <h3>${g.name}</h3>
              <small style="color:var(--text-muted)">${pct >= 100 ? '🎉 Tercapai!' : `Sisa: ${formatRp(remain)}`}</small>
            </div>
          </div>
          <div class="saving-percent">${pct}%</div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-labels">
            <span>${formatRp(g.current)}</span>
            <span>${formatRp(g.target)}</span>
          </div>
        </div>
        <div class="saving-actions">
          <button class="action-btn action-btn-edit" onclick="editSaving('${g.id}')">✏️</button>
          <button class="action-btn action-btn-del" onclick="deleteSaving('${g.id}')">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function saveSavingGoal(e) {
  e.preventDefault();
  const name    = document.getElementById('s-name').value.trim();
  const target  = parseFloat(document.getElementById('s-target').value);
  const current = parseFloat(document.getElementById('s-current').value);
  const icon    = document.getElementById('s-icon').value.trim() || '🎯';

  if (!name || isNaN(target) || isNaN(current)) return showToast('Lengkapi semua field!', 'error');
  if (target <= 0) return showToast('Nominal target harus lebih dari 0!', 'error');

  savingGoals.push({ id: genId(), name, target, current, icon, createdAt: new Date().toISOString() });
  saveUserData();
  closeModal('modal-add-saving');
  document.getElementById('s-name').value = '';
  document.getElementById('s-target').value = '';
  document.getElementById('s-current').value = '';
  document.getElementById('s-icon').value = '';
  renderSavingGoals();
  updateProfileStats();
  showToast('Target tabungan berhasil ditambahkan! 🎯');
}

function editSaving(id) {
  const g = savingGoals.find(x => x.id === id);
  if (!g) return;
  document.getElementById('es-id').value      = g.id;
  document.getElementById('es-name').value    = g.name;
  document.getElementById('es-target').value  = g.target;
  document.getElementById('es-current').value = g.current;
  document.getElementById('es-icon').value    = g.icon || '';
  openModal('modal-edit-saving');
}

function updateSavingGoal(e) {
  e.preventDefault();
  const id      = document.getElementById('es-id').value;
  const name    = document.getElementById('es-name').value.trim();
  const target  = parseFloat(document.getElementById('es-target').value);
  const current = parseFloat(document.getElementById('es-current').value);
  const icon    = document.getElementById('es-icon').value.trim() || '🎯';

  const idx = savingGoals.findIndex(g => g.id === id);
  if (idx > -1) savingGoals[idx] = { ...savingGoals[idx], name, target, current, icon };
  saveUserData();
  closeModal('modal-edit-saving');
  renderSavingGoals();
  showToast('Target tabungan berhasil diperbarui!');
}

function deleteSaving(id) {
  if (!confirm('Hapus target tabungan ini?')) return;
  savingGoals = savingGoals.filter(g => g.id !== id);
  saveUserData();
  renderSavingGoals();
  updateProfileStats();
  showToast('Target tabungan dihapus.', 'warning');
}

// ── Bills ─────────────────────────────────────────────────────

function renderBills() {
  const list = document.getElementById('bills-list');
  const noEl = document.getElementById('no-bills');

  if (bills.length === 0) {
    list.innerHTML = '';
    noEl.classList.remove('hidden');
    return;
  }
  noEl.classList.add('hidden');

  const sorted = [...bills].sort((a, b) => new Date(a.due) - new Date(b.due));
  list.innerHTML = sorted.map(b => {
    const days = daysUntil(b.due);
    let statusClass = 'status-ok'; let statusText = `${days} hari lagi`;
    let cardClass = '';
    if (days < 0) { statusClass = 'status-overdue'; statusText = `Terlambat ${Math.abs(days)} hari`; cardClass = 'overdue'; }
    else if (days <= 3) { statusClass = 'status-soon'; statusText = days === 0 ? 'Hari ini!' : `${days} hari lagi`; cardClass = 'soon'; }

    return `
      <div class="bill-card ${cardClass}">
        <div class="bill-icon">🔔</div>
        <div class="bill-info">
          <strong>${b.name}</strong>
          <span>Jatuh tempo: ${formatDate(b.due)}</span>
        </div>
        <div class="bill-amount">${formatRp(b.amount)}</div>
        <span class="bill-status ${statusClass}">${statusText}</span>
        <div class="table-actions">
          <button class="action-btn action-btn-del" onclick="deleteBill('${b.id}')">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function saveBill(e) {
  e.preventDefault();
  const name   = document.getElementById('b-name').value.trim();
  const due    = document.getElementById('b-due').value;
  const amount = parseFloat(document.getElementById('b-amount').value);

  if (!name || !due || isNaN(amount)) return showToast('Lengkapi semua field!', 'error');

  bills.push({ id: genId(), name, due, amount, createdAt: new Date().toISOString() });
  saveUserData();
  closeModal('modal-add-bill');
  document.getElementById('b-name').value = '';
  document.getElementById('b-due').value = '';
  document.getElementById('b-amount').value = '';
  renderBills();
  updateProfileStats();
  showToast('Tagihan berhasil ditambahkan! 🔔');
}

function deleteBill(id) {
  if (!confirm('Hapus tagihan ini?')) return;
  bills = bills.filter(b => b.id !== id);
  saveUserData();
  renderBills();
  updateProfileStats();
  showToast('Tagihan dihapus.', 'warning');
}

// ── Categories ────────────────────────────────────────────────

function renderCategories() {
  const list = document.getElementById('categories-list');
  list.innerHTML = categories.map(c => `
    <div class="category-chip ${c.isDefault ? 'is-default' : ''}">
      <div class="cat-icon">${c.icon || '🏷️'}</div>
      <div class="cat-name">${c.name}</div>
      <div class="cat-tag">${c.type === 'both' ? 'Semua' : c.type === 'pemasukan' ? 'Masuk' : 'Keluar'}</div>
      ${!c.isDefault ? `<button class="cat-del-btn" onclick="deleteCategory('${c.id}')">✕</button>` : ''}
    </div>`).join('');
}

function saveCategory(e) {
  e.preventDefault();
  const name = document.getElementById('cat-name').value.trim();
  const icon = document.getElementById('cat-icon').value.trim() || '🏷️';
  const type = document.getElementById('cat-type').value;

  if (!name) return showToast('Nama kategori wajib diisi!', 'error');
  if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    return showToast('Kategori sudah ada!', 'warning');
  }

  categories.push({ id: genId(), name, icon, type, isDefault: false });
  saveUserData();
  closeModal('modal-add-category');
  document.getElementById('cat-name').value = '';
  document.getElementById('cat-icon').value = '';
  renderCategories();
  showToast(`Kategori "${name}" berhasil ditambahkan!`);
}

function deleteCategory(id) {
  const inUse = transactions.find(t => t.categoryId === id);
  if (inUse) return showToast('Kategori sedang digunakan oleh transaksi!', 'error');
  if (!confirm('Hapus kategori ini?')) return;
  categories = categories.filter(c => c.id !== id);
  saveUserData();
  renderCategories();
  showToast('Kategori dihapus.', 'warning');
}

function getCategoryById(id) {
  return categories.find(c => c.id === id) || null;
}

// ── Profile ───────────────────────────────────────────────────

function loadProfileForm() {
  if (!currentUser) return;
  document.getElementById('profile-name-input').value  = currentUser.name;
  document.getElementById('profile-email-input').value = currentUser.email;
  document.getElementById('profile-name-display').textContent  = currentUser.name;
  document.getElementById('profile-email-display').textContent = currentUser.email;
  document.getElementById('profile-avatar-display').textContent = currentUser.avatar || '👤';
  updateProfileStats();
}

function updateProfileStats() {
  const ps = document.getElementById('pstat-transactions');
  const sg = document.getElementById('pstat-savings');
  const pb = document.getElementById('pstat-bills');
  if (ps) ps.textContent = transactions.length;
  if (sg) sg.textContent = savingGoals.length;
  if (pb) pb.textContent = bills.length;
}

function saveProfile(e) {
  e.preventDefault();
  const name     = document.getElementById('profile-name-input').value.trim();
  const email    = document.getElementById('profile-email-input').value.trim();
  const password = document.getElementById('profile-password-input').value;

  if (!name || !email) return showToast('Nama dan email wajib diisi!', 'error');

  const users = load('users', []);
  const idx   = users.findIndex(u => u.id === currentUser.id);

  if (idx > -1) {
    users[idx].name  = name;
    users[idx].email = email;
    if (password && password.length >= 8) {
      users[idx].password = password;
      showToast('Password berhasil diperbarui!');
    } else if (password && password.length < 8) {
      return showToast('Password minimal 8 karakter!', 'error');
    }
    save('users', users);
    currentUser = users[idx];
    save('currentUser', currentUser);
  }

  document.getElementById('profile-name-display').textContent  = name;
  document.getElementById('profile-email-display').textContent = email;
  document.getElementById('welcome-name').textContent = name.split(' ')[0];
  document.getElementById('profile-password-input').value = '';
  showToast('Profil berhasil diperbarui! ✨');
}

function changeAvatar() {
  const avatars = ['👤','😊','🧑','👨','👩','🧑‍💼','👨‍💼','👩‍💼','🦸','🧙'];
  const current = currentUser.avatar || '👤';
  const idx = avatars.indexOf(current);
  const next = avatars[(idx + 1) % avatars.length];

  currentUser.avatar = next;
  const users = load('users', []);
  const ui = users.findIndex(u => u.id === currentUser.id);
  if (ui > -1) { users[ui].avatar = next; save('users', users); }
  save('currentUser', currentUser);

  document.getElementById('profile-avatar-display').textContent = next;
  document.getElementById('header-avatar').textContent = next;
  showToast('Avatar berhasil diubah!');
}

// ── Tab Switching ─────────────────────────────────────────────

function switchTab(name) {
  // Close sidebar on mobile
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');

  // Update nav active
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-tab') === name);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('tab-' + name);
  if (target) target.classList.add('active');

  // Update top bar title
  const titles = {
    overview: 'Dashboard', transactions: 'Transaksi', statistics: 'Statistik',
    savings: 'Target Tabungan', bills: 'Pengingat Tagihan',
    categories: 'Kategori', profile: 'Profil',
  };
  const titleEl = document.getElementById('top-bar-title');
  if (titleEl) titleEl.textContent = titles[name] || 'Dashboard';

  // Render relevant data
  switch (name) {
    case 'overview':     renderSummaryCards(); renderRecentTransactions(); renderMiniChart(); break;
    case 'transactions': populateCategorySelects(); renderTransactionsTable(transactions); break;
    case 'statistics':   setTimeout(renderCharts, 100); break;
    case 'savings':      renderSavingGoals(); break;
    case 'bills':        renderBills(); break;
    case 'categories':   renderCategories(); break;
    case 'profile':      loadProfileForm(); break;
  }
}

// ── Modals ────────────────────────────────────────────────────

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
  // Special case for add-transaction
  if (id === 'modal-add-transaction') {
    if (!document.getElementById('transaction-id').value) {
      // New transaction
      document.getElementById('modal-transaction-title').textContent = 'Tambah Transaksi';
      document.getElementById('transaction-form').reset();
      document.getElementById('t-date').value = new Date().toISOString().split('T')[0];
      populateCategorySelects();
    }
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function closeModalOnOverlay(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

// ── Sidebar ───────────────────────────────────────────────────

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Export: PDF ───────────────────────────────────────────────

function exportPDF() {
  if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
    showToast('Library PDF belum dimuat. Coba lagi.', 'error'); return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(22, 163, 74);
  doc.text('Smart Finance — Laporan Transaksi', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 26);
  doc.text(`Pengguna: ${currentUser.name}`, 14, 32);

  // Summary
  const income  = transactions.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0);
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Total Pemasukan : ${formatRp(income)}`, 14, 42);
  doc.text(`Total Pengeluaran: ${formatRp(expense)}`, 14, 50);
  doc.text(`Saldo Bersih    : ${formatRp(income - expense)}`, 14, 58);

  // Table header
  let y = 70;
  doc.setFillColor(22, 163, 74);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFontSize(9); doc.setTextColor(255);
  doc.text('Tanggal', 16, y+5.5);
  doc.text('Kategori', 40, y+5.5);
  doc.text('Jenis', 90, y+5.5);
  doc.text('Nominal', 120, y+5.5);
  doc.text('Keterangan', 155, y+5.5);
  y += 10;

  doc.setTextColor(0); doc.setFontSize(8);
  const sorted = [...transactions].sort((a,b) => new Date(b.date)-new Date(a.date));
  sorted.forEach((t, i) => {
    if (y > 280) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(240, 253, 244); doc.rect(14, y-3, 182, 8, 'F'); }
    const cat = getCategoryById(t.categoryId);
    doc.text(formatDate(t.date), 16, y+2);
    doc.text(cat ? cat.name : '-', 40, y+2);
    doc.text(t.type === 'pemasukan' ? 'Masuk' : 'Keluar', 90, y+2);
    doc.text(formatRp(t.amount), 120, y+2);
    doc.text((t.note || '-').substring(0, 25), 155, y+2);
    y += 8;
  });

  doc.save(`smart-finance-${new Date().toISOString().split('T')[0]}.pdf`);
  showToast('Laporan PDF berhasil diunduh! 📄');
}

// ── Export: Excel ─────────────────────────────────────────────

function exportExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Library Excel belum dimuat. Coba lagi.', 'error'); return;
  }

  const income  = transactions.filter(t => t.type === 'pemasukan').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.amount, 0);

  const rows = transactions.map(t => {
    const cat = getCategoryById(t.categoryId);
    return {
      'Tanggal':     formatDate(t.date),
      'Kategori':    cat ? cat.name : '-',
      'Jenis':       t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
      'Nominal':     t.amount,
      'Keterangan':  t.note || '-',
    };
  });

  // Add summary rows
  rows.push({});
  rows.push({ 'Tanggal': 'RINGKASAN', 'Kategori': '', 'Jenis': '', 'Nominal': '', 'Keterangan': '' });
  rows.push({ 'Tanggal': 'Total Pemasukan',   'Nominal': income });
  rows.push({ 'Tanggal': 'Total Pengeluaran', 'Nominal': expense });
  rows.push({ 'Tanggal': 'Saldo Bersih',      'Nominal': income - expense });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
  XLSX.writeFile(wb, `smart-finance-${new Date().toISOString().split('T')[0]}.xlsx`);
  showToast('Laporan Excel berhasil diunduh! 📊');
}

// ── Init App ──────────────────────────────────────────────────

function initApp() {
  // Dark mode
  const isDark = load('darkMode', false);
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateDarkModeUI(true);
  }

  // Check existing session
  const saved = load('currentUser', null);
  if (saved && saved.id) {
    currentUser = saved;
    loadUserData();
    showPage('dashboard');
    initDashboard();
  } else {
    showPage('landing');
  }

  // Auto-fill remember me
  const rememberedEmail = load('rememberEmail', '');
  if (rememberedEmail) {
    const el = document.getElementById('login-email');
    if (el) el.value = rememberedEmail;
    const cb = document.getElementById('remember-me');
    if (cb) cb.checked = true;
  }

  // Remove loading screen after 2.5s
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) ls.remove();
  }, 2700);
}

// ── Start ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
