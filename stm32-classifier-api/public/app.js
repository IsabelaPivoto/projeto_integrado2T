const COLORS = {
  good: '#3f9142',
  medium: '#c9861a',
  bad: '#b23a3a',
};

const LABELS = {
  good: 'Good',
  medium: 'Medium',
  bad: 'Bad',
};

let medicoes = [];
let currentFilter = 'all';
let sortState = { key: 'createdAt', dir: 'desc' };
let valueCount = 3;

const form = document.getElementById('medicao-form');
const formFields = document.getElementById('form-fields');
const submitBtn = document.getElementById('submit-btn');
const resultBanner = document.getElementById('result-banner');
const refreshBtn = document.getElementById('refresh-btn');
const filtersEl = document.getElementById('filters');
const tbody = document.getElementById('medicoes-tbody');
const emptyState = document.getElementById('empty-state');
const canvas = document.getElementById('chart-canvas');

const settingsForm = document.getElementById('settings-form');
const valueCountInput = document.getElementById('value-count-input');
const settingsBanner = document.getElementById('settings-banner');

const howtoCount = document.getElementById('howto-count');
const howtoPlaceholders = document.getElementById('howto-placeholders');

const navLinks = document.querySelectorAll('.nav-link');

form.addEventListener('submit', onSubmit);
refreshBtn.addEventListener('click', loadMedicoes);
filtersEl.addEventListener('click', onFilterClick);
settingsForm.addEventListener('submit', onSaveSettings);
document.querySelectorAll('th[data-sort]').forEach((th) => {
  th.addEventListener('click', () => onSort(th.dataset.sort));
});
navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
  });
});

function renderFormFields() {
  formFields.innerHTML = '';
  for (let i = 1; i <= valueCount; i++) {
    const group = document.createElement('div');
    group.className = 'field-group';
    group.innerHTML = `
      <label for="value-${i}">Value ${i}</label>
      <input type="number" step="any" id="value-${i}" required />
    `;
    formFields.appendChild(group);
  }
}

function updateHowTo() {
  howtoCount.textContent = valueCount;
  howtoPlaceholders.textContent = Array.from({ length: valueCount }, (_, i) => `v${i + 1}`).join(', ');
}

async function loadConfig() {
  try {
    const res = await fetch('/config');
    const config = await res.json();
    valueCount = config.valueCount;
  } catch (err) {
    valueCount = 3;
  }
  valueCountInput.value = valueCount;
  renderFormFields();
  updateHowTo();
}

async function onSaveSettings(e) {
  e.preventDefault();
  const newValueCount = parseInt(valueCountInput.value, 10);

  try {
    const res = await fetch('/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueCount: newValueCount }),
    });
    const data = await res.json();

    if (!res.ok) {
      showSettingsBanner('error', data.error || 'Failed to update settings.');
      return;
    }

    valueCount = data.valueCount;
    renderFormFields();
    updateHowTo();
    showSettingsBanner('good', `Measurements now require exactly ${valueCount} value(s).`);
  } catch (err) {
    showSettingsBanner('error', 'Could not connect to the server.');
  }
}

function showSettingsBanner(type, message) {
  settingsBanner.textContent = message;
  settingsBanner.className = `result-banner ${type}`;
}

async function onSubmit(e) {
  e.preventDefault();
  const sample = [];
  for (let i = 1; i <= valueCount; i++) {
    sample.push(parseFloat(document.getElementById(`value-${i}`).value));
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Classifying...';
  hideBanner();

  try {
    const res = await fetch('/medicoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample }),
    });
    const data = await res.json();

    if (!res.ok) {
      showBanner('error', data.error || 'Failed to classify the measurement.');
    } else {
      const pct = Math.round((data.probabilities?.[data.classification] ?? 0) * 100);
      showBanner(data.classification, `Classified as ${LABELS[data.classification]} (confidence ${pct}%).`);
      form.reset();
      await loadMedicoes();
    }
  } catch (err) {
    showBanner('error', 'Could not connect to the server.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Classify & Save';
  }
}

function showBanner(type, message) {
  resultBanner.textContent = message;
  resultBanner.className = `result-banner ${type}`;
}

function hideBanner() {
  resultBanner.className = 'result-banner hidden';
}

function onFilterClick(e) {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  [...filtersEl.children].forEach((b) => b.classList.toggle('active', b === btn));
  render();
}

function onSort(key) {
  if (sortState.key === key) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState = { key, dir: 'asc' };
  }
  render();
}

async function loadMedicoes() {
  try {
    const res = await fetch('/medicoes');
    medicoes = await res.json();
    render();
  } catch (err) {
    emptyState.textContent = 'Could not load measurements.';
    emptyState.classList.remove('hidden');
  }
}

function render() {
  renderStats();
  renderChart();
  renderTable();
}

function renderStats() {
  const counts = { good: 0, medium: 0, bad: 0 };
  medicoes.forEach((m) => { if (counts[m.classification] !== undefined) counts[m.classification]++; });

  document.getElementById('stat-total').textContent = medicoes.length;
  document.getElementById('stat-good').textContent = counts.good;
  document.getElementById('stat-medium').textContent = counts.medium;
  document.getElementById('stat-bad').textContent = counts.bad;
}

function renderChart() {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 600;
  const height = 220;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const counts = { good: 0, medium: 0, bad: 0 };
  medicoes.forEach((m) => { if (counts[m.classification] !== undefined) counts[m.classification]++; });
  const max = Math.max(1, ...Object.values(counts));

  const keys = ['good', 'medium', 'bad'];
  const chartHeight = height - 50;
  const barWidth = 90;
  const gap = (width - barWidth * keys.length) / (keys.length + 1);

  keys.forEach((key, i) => {
    const x = gap + i * (barWidth + gap);
    const barHeight = (counts[key] / max) * (chartHeight - 20);
    const y = chartHeight - barHeight;

    ctx.fillStyle = COLORS[key];
    roundRect(ctx, x, y, barWidth, barHeight, 6);
    ctx.fill();

    ctx.fillStyle = '#1c2620';
    ctx.font = '700 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(counts[key]), x + barWidth / 2, y - 8);

    ctx.fillStyle = '#5c6b62';
    ctx.font = '600 12px sans-serif';
    ctx.fillText(LABELS[key], x + barWidth / 2, chartHeight + 20);
  });

  ctx.strokeStyle = '#dfe9e2';
  ctx.beginPath();
  ctx.moveTo(0, chartHeight);
  ctx.lineTo(width, chartHeight);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (h <= 0) return;
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function renderTable() {
  let rows = medicoes.filter((m) => currentFilter === 'all' || m.classification === currentFilter);

  rows = rows.slice().sort((a, b) => {
    let va, vb;
    if (sortState.key === 'sample') {
      va = a.sample.join(',');
      vb = b.sample.join(',');
    } else if (sortState.key === 'confidence') {
      va = a.probabilities?.[a.classification] ?? 0;
      vb = b.probabilities?.[b.classification] ?? 0;
    } else {
      va = a[sortState.key];
      vb = b[sortState.key];
    }
    if (va < vb) return sortState.dir === 'asc' ? -1 : 1;
    if (va > vb) return sortState.dir === 'asc' ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = '';
  emptyState.classList.toggle('hidden', rows.length > 0);

  rows.forEach((m) => {
    const tr = document.createElement('tr');
    const date = new Date(m.createdAt).toLocaleString('en-US');
    const confidence = Math.round((m.probabilities?.[m.classification] ?? 0) * 100);

    tr.innerHTML = `
      <td>${date}</td>
      <td>[${m.sample.join(', ')}]</td>
      <td><span class="badge ${m.classification}">${LABELS[m.classification] || m.classification}</span></td>
      <td>${confidence}%</td>
    `;
    tbody.appendChild(tr);
  });
}

(async function init() {
  await loadConfig();
  await loadMedicoes();
})();
