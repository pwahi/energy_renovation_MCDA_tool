const STORAGE_KEY = 'renoDecisionSupportState.v2';

const RI = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.9,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
  11: 1.51,
  12: 1.48,
  13: 1.56,
  14: 1.57,
  15: 1.59,
};

const defaultCriteria = [
  { id: 'C1', name: 'Space heating demand', unit: 'kWh/m2', pillar: 'Environmental', direction: 'min', mandatory: true, active: true },
  { id: 'C2', name: 'Energy label', unit: 'score', pillar: 'Environmental', direction: 'max', mandatory: false, active: true },
  { id: 'C3', name: 'Energy index', unit: 'index', pillar: 'Environmental', direction: 'min', mandatory: false, active: false },
  { id: 'C4', name: 'Renewable energy share', unit: '%', pillar: 'Environmental', direction: 'max', mandatory: false, active: true },
  { id: 'C5', name: 'Gas savings', unit: 'm3/yr', pillar: 'Environmental', direction: 'max', mandatory: false, active: true },
  { id: 'C6', name: 'Investment costs', unit: 'EUR', pillar: 'Economic', direction: 'min', mandatory: false, active: true },
  { id: 'C7', name: 'Cost per label step', unit: 'EUR/step', pillar: 'Economic', direction: 'min', mandatory: false, active: false },
  { id: 'C8', name: 'Life cycle costs (30yr)', unit: 'EUR', pillar: 'Economic', direction: 'min', mandatory: false, active: true },
  { id: 'C9', name: 'Payback period', unit: 'years', pillar: 'Economic', direction: 'min', mandatory: false, active: true },
  { id: 'C10', name: 'Thermal comfort', unit: 'hours', pillar: 'Social', direction: 'min', mandatory: true, active: true },
  { id: 'C11', name: 'Renovation nuisance', unit: 'days', pillar: 'Social', direction: 'min', mandatory: false, active: false },
  { id: 'C12', name: 'Energy cost savings', unit: 'EUR/yr', pillar: 'Social', direction: 'max', mandatory: false, active: true },
  { id: 'C13', name: 'Rent increment', unit: 'EUR/month', pillar: 'Social', direction: 'min', mandatory: false, active: false },
];

const sampleAlternatives = [
  { id: crypto.randomUUID(), name: 'Basic insulation package', level: 'Basic', scores: { C1: 70, C2: 3, C4: 15, C5: 420, C6: 18000, C8: 62000, C9: 17, C10: 120, C12: 620 } },
  { id: crypto.randomUUID(), name: 'Moderate envelope upgrade', level: 'Moderate', scores: { C1: 48, C2: 5, C4: 32, C5: 720, C6: 36000, C8: 76000, C9: 15, C10: 72, C12: 980 } },
  { id: crypto.randomUUID(), name: 'Deep retrofit ready', level: 'Deep', scores: { C1: 32, C2: 7, C4: 58, C5: 1080, C6: 64000, C8: 91000, C9: 19, C10: 28, C12: 1410 } },
];

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  const criteria = structuredClone(defaultCriteria);
  return {
    criteria,
    alternatives: structuredClone(sampleAlternatives),
    comparisons: {},
    manualWeights: equalWeights(criteria.filter((criterion) => criterion.active)),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activeCriteria() {
  return state.criteria.filter((criterion) => criterion.active);
}

function equalWeights(criteria) {
  const weight = criteria.length ? 1 / criteria.length : 0;
  return Object.fromEntries(criteria.map((criterion) => [criterion.id, weight]));
}

function comparisonKey(leftId, rightId) {
  return `${leftId}|${rightId}`;
}

function render() {
  renderCriteria();
  renderScores();
  renderComparisons();
  renderWeights();
  renderRanking();
  saveState();
}

function renderCriteria() {
  const grid = document.querySelector('#criteriaGrid');
  grid.innerHTML = '';
  const pillars = ['Environmental', 'Economic', 'Social'];

  for (const pillar of pillars) {
    const criteria = state.criteria.filter((criterion) => criterion.pillar === pillar);
    const column = document.createElement('section');
    column.className = `category-column ${pillar.toLowerCase()}`;
    column.innerHTML = `
      <div class="category-head">
        <h3>${pillar}</h3>
        <p>${criteria.filter((criterion) => criterion.active).length} active of ${criteria.length} KPIs</p>
      </div>
      <div class="criteria-list">
        ${criteria.map((criterion) => `
          <article class="criterion-row ${criterion.pillar.toLowerCase()}">
            <div>
              <h4>${criterion.id} ${criterion.name}</h4>
              <p class="meta">${criterion.unit} | ${criterion.direction === 'min' ? 'Minimize' : 'Maximize'} ${criterion.mandatory ? '| mandatory gate' : ''}</p>
            </div>
            <div class="criterion-tools">
              <label class="switch">
                <input type="checkbox" ${criterion.active ? 'checked' : ''} ${criterion.mandatory ? 'disabled' : ''} data-toggle="${criterion.id}" />
                Active
              </label>
              ${criterion.mandatory ? '<span class="pill">Gate</span>' : `<button class="ghost delete" type="button" data-delete="${criterion.id}">Delete</button>`}
            </div>
          </article>
        `).join('')}
      </div>
    `;
    grid.appendChild(column);
  }
}

function renderScores() {
  const table = document.querySelector('#scoresTable');
  const criteria = activeCriteria();
  const headers = ['Alternative', 'Level', ...criteria.map((criterion) => `${criterion.id} ${criterion.name}`), ''];
  table.innerHTML = `
    <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
    <tbody>
      ${state.alternatives.map((alternative) => `
        <tr>
          <td><input data-alt-name="${alternative.id}" value="${alternative.name}" /></td>
          <td>${alternative.level}</td>
          ${criteria.map((criterion) => `
            <td>
              <input type="number" step="any" data-score-alt="${alternative.id}" data-score-criterion="${criterion.id}" value="${alternative.scores[criterion.id] ?? ''}" />
              <div class="meta">${criterion.unit}</div>
            </td>
          `).join('')}
          <td><button class="ghost delete" type="button" data-delete-alt="${alternative.id}">Delete</button></td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

function renderComparisons() {
  const list = document.querySelector('#comparisonList');
  const criteria = activeCriteria();
  list.innerHTML = '';

  if (criteria.length > 8) {
    const warning = document.createElement('div');
    warning.className = 'warning';
    warning.textContent = `You have ${criteria.length} active criteria, requiring ${(criteria.length * (criteria.length - 1)) / 2} comparisons. The PRD recommends keeping workshops near 6-7 active criteria.`;
    list.appendChild(warning);
  }

  for (let i = 0; i < criteria.length; i += 1) {
    for (let j = i + 1; j < criteria.length; j += 1) {
      const left = criteria[i];
      const right = criteria[j];
      const key = comparisonKey(left.id, right.id);
      const value = state.comparisons[key] ?? 1;
      const item = document.createElement('div');
      item.className = 'comparison';
      item.innerHTML = `
        <label>
          <div class="comparison-top">
            <strong>${left.id} ${left.name}</strong>
            <strong>${right.id} ${right.name}</strong>
          </div>
          <input type="range" min="-8" max="8" step="1" value="${saatyToSlider(value)}" data-comparison="${key}" data-left="${left.id}" data-right="${right.id}" />
          <div class="saaty-scale" aria-hidden="true">
            <span>9</span><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span>
          </div>
          <div class="saaty-current">${formatSaatyDetail(value, left.id, right.id)}</div>
        </label>
      `;
      list.appendChild(item);
    }
  }
}

function saatyToSlider(value) {
  return value >= 1 ? value - 1 : -(1 / value - 1);
}

function sliderToSaaty(value) {
  const number = Number(value);
  return number >= 0 ? number + 1 : 1 / (Math.abs(number) + 1);
}

function formatSaaty(value) {
  if (value === 1) return 'Equal';
  if (value > 1) return `${value.toFixed(0)}x left`;
  return `${(1 / value).toFixed(0)}x right`;
}

function formatSaatyDetail(value, leftId, rightId) {
  if (value === 1) return `${leftId} and ${rightId} are equally important (Saaty 1)`;
  const score = value > 1 ? value : 1 / value;
  const stronger = value > 1 ? leftId : rightId;
  const weaker = value > 1 ? rightId : leftId;
  const label = score >= 9 ? 'extremely'
    : score >= 8 ? 'very strongly to extremely'
      : score >= 7 ? 'very strongly'
        : score >= 6 ? 'strongly to very strongly'
          : score >= 5 ? 'strongly'
            : score >= 4 ? 'moderately to strongly'
              : score >= 3 ? 'moderately'
                : 'slightly';
  return `${stronger} is ${label} more important than ${weaker} (Saaty ${score.toFixed(0)})`;
}

function ahpResult() {
  const criteria = activeCriteria();
  const n = criteria.length;
  if (!n) return { weights: {}, cr: 0, lambdaMax: 0 };
  const matrix = Array.from({ length: n }, () => Array(n).fill(1));

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const value = state.comparisons[comparisonKey(criteria[i].id, criteria[j].id)] ?? 1;
      matrix[i][j] = value;
      matrix[j][i] = 1 / value;
    }
  }

  let vector = Array(n).fill(1 / n);
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const next = matrix.map((row) => row.reduce((sum, cell, index) => sum + cell * vector[index], 0));
    const total = next.reduce((sum, value) => sum + value, 0);
    vector = next.map((value) => value / total);
  }

  const weighted = matrix.map((row) => row.reduce((sum, cell, index) => sum + cell * vector[index], 0));
  const lambdaMax = weighted.reduce((sum, value, index) => sum + value / vector[index], 0) / n;
  const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  const cr = RI[n] ? ci / RI[n] : 0;
  const weights = Object.fromEntries(criteria.map((criterion, index) => [criterion.id, vector[index]]));
  return { weights, cr, lambdaMax };
}

function renderWeights() {
  const { weights, cr } = ahpResult();
  state.manualWeights = weights;
  const bars = document.querySelector('#weightBars');
  bars.innerHTML = activeCriteria().map((criterion) => `
    <div class="bar-row">
      <div>
        <div>${criterion.id} ${criterion.name}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(weights[criterion.id] ?? 0) * 100}%"></div></div>
      </div>
      <strong>${(((weights[criterion.id] ?? 0) * 100)).toFixed(1)}%</strong>
    </div>
  `).join('');

  const consistency = document.querySelector('#consistency');
  consistency.className = `metric ${cr <= 0.1 ? 'pass' : 'fail'}`;
  consistency.textContent = `Consistency ratio: ${Number.isFinite(cr) ? cr.toFixed(3) : 'n/a'} (${cr <= 0.1 ? 'pass' : 'review needed'})`;
}

function calculateTopsis() {
  const criteria = activeCriteria();
  const alternatives = state.alternatives.filter((alternative) => criteria.every((criterion) => Number.isFinite(Number(alternative.scores[criterion.id]))));
  if (!criteria.length || !alternatives.length) return [];

  const weights = state.manualWeights;
  const columns = criteria.map((criterion) => alternatives.map((alternative) => Number(alternative.scores[criterion.id])));
  const denominators = columns.map((column) => Math.sqrt(column.reduce((sum, value) => sum + value ** 2, 0)) || 1);
  const weighted = alternatives.map((alternative) => criteria.map((criterion, index) => {
    return (Number(alternative.scores[criterion.id]) / denominators[index]) * (weights[criterion.id] ?? 0);
  }));

  const idealPositive = criteria.map((criterion, index) => {
    const values = weighted.map((row) => row[index]);
    return criterion.direction === 'max' ? Math.max(...values) : Math.min(...values);
  });
  const idealNegative = criteria.map((criterion, index) => {
    const values = weighted.map((row) => row[index]);
    return criterion.direction === 'max' ? Math.min(...values) : Math.max(...values);
  });

  return alternatives.map((alternative, rowIndex) => {
    const row = weighted[rowIndex];
    const dPlus = Math.sqrt(row.reduce((sum, value, index) => sum + (value - idealPositive[index]) ** 2, 0));
    const dMinus = Math.sqrt(row.reduce((sum, value, index) => sum + (value - idealNegative[index]) ** 2, 0));
    const closeness = dPlus + dMinus === 0 ? 0 : dMinus / (dPlus + dMinus);
    return { alternative, dPlus, dMinus, closeness };
  }).sort((a, b) => b.closeness - a.closeness);
}

function renderRanking() {
  const results = calculateTopsis();
  const table = document.querySelector('#rankingTable');
  const chart = document.querySelector('#rankingChart');
  chart.innerHTML = results.length
    ? results.map((result, index) => `
      <div class="rank-bar">
        <div class="rank-name">${index + 1}. ${result.alternative.name}</div>
        <div class="rank-track">
          <div class="rank-fill" style="width:${Math.max(3, result.closeness * 100)}%"></div>
        </div>
        <div class="rank-score">${(result.closeness * 100).toFixed(1)}%</div>
      </div>
    `).join('')
    : '<div class="warning">Enter complete scores for at least one alternative before ranking.</div>';
  table.innerHTML = `
    <thead>
      <tr><th>Rank</th><th>Alternative</th><th>Level</th><th>D+</th><th>D-</th><th>Closeness</th></tr>
    </thead>
    <tbody>
      ${results.map((result, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${result.alternative.name}</td>
          <td>${result.alternative.level}</td>
          <td>${result.dPlus.toFixed(4)}</td>
          <td>${result.dMinus.toFixed(4)}</td>
          <td><strong>${result.closeness.toFixed(4)}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  `;

  const warnings = state.alternatives.filter((alternative) => {
    const c1 = Number(alternative.scores.C1);
    const c10 = Number(alternative.scores.C10);
    return Number.isFinite(c1) && Number.isFinite(c10) && (c1 > 50 || c10 > 100);
  });
  document.querySelector('#gateWarnings').innerHTML = warnings.length
    ? `<div class="warning">Gate warning: ${warnings.map((warning) => warning.name).join(', ')} may fail C1/C10 readiness thresholds. These are flagged, not blocked.</div>`
    : '';
}

function deriveSocraticWeights() {
  const text = document.querySelector('#socraticInput').value.toLowerCase();
  const criteria = activeCriteria();
  const terms = {
    cost: ['cost', 'investment', 'budget', 'life cycle', 'payback', 'rent'],
    comfort: ['comfort', 'thermal', 'tenant', 'health'],
    environment: ['energy', 'emission', 'gas', 'renewable', 'label', 'demand'],
    nuisance: ['nuisance', 'disruption', 'days', 'construction'],
  };
  const scores = {};

  for (const criterion of criteria) {
    let score = 1;
    const haystack = `${criterion.name} ${criterion.pillar}`.toLowerCase();
    for (const keywords of Object.values(terms)) {
      const mentioned = keywords.some((keyword) => text.includes(keyword));
      const matchesCriterion = keywords.some((keyword) => haystack.includes(keyword));
      if (mentioned && matchesCriterion) score += 2;
    }
    if (criterion.mandatory) score += 0.5;
    scores[criterion.id] = score;
  }

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  state.manualWeights = Object.fromEntries(Object.entries(scores).map(([id, score]) => [id, score / total]));
  state.comparisons = weightsToApproxComparisons(state.manualWeights, criteria);
  render();
}

function weightsToApproxComparisons(weights, criteria) {
  const comparisons = {};
  for (let i = 0; i < criteria.length; i += 1) {
    for (let j = i + 1; j < criteria.length; j += 1) {
      const ratio = (weights[criteria[i].id] || 0.01) / (weights[criteria[j].id] || 0.01);
      const rounded = Math.max(1 / 9, Math.min(9, Math.round(ratio)));
      comparisons[comparisonKey(criteria[i].id, criteria[j].id)] = rounded || 1;
    }
  }
  return comparisons;
}

document.addEventListener('click', (event) => {
  const tab = event.target.closest('.tab');
  if (tab) {
    document.querySelectorAll('.tab').forEach((button) => button.classList.remove('active'));
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`#${tab.dataset.view}`).classList.add('active');
  }

  const deleteCriterion = event.target.dataset.delete;
  if (deleteCriterion) {
    state.criteria = state.criteria.filter((criterion) => criterion.id !== deleteCriterion || criterion.mandatory);
    for (const alternative of state.alternatives) delete alternative.scores[deleteCriterion];
    render();
  }

  const deleteAlternative = event.target.dataset.deleteAlt;
  if (deleteAlternative) {
    state.alternatives = state.alternatives.filter((alternative) => alternative.id !== deleteAlternative);
    render();
  }
});

document.addEventListener('change', (event) => {
  if (event.target.dataset.toggle) {
    const criterion = state.criteria.find((item) => item.id === event.target.dataset.toggle);
    if (criterion && !criterion.mandatory) criterion.active = event.target.checked;
    render();
  }

  if (event.target.dataset.scoreAlt) {
    const alternative = state.alternatives.find((item) => item.id === event.target.dataset.scoreAlt);
    if (alternative) alternative.scores[event.target.dataset.scoreCriterion] = Number(event.target.value);
    render();
  }

  if (event.target.dataset.altName) {
    const alternative = state.alternatives.find((item) => item.id === event.target.dataset.altName);
    if (alternative) alternative.name = event.target.value;
    render();
  }

  if (event.target.dataset.comparison) {
    state.comparisons[event.target.dataset.comparison] = event.target.type === 'range'
      ? sliderToSaaty(event.target.value)
      : Number(event.target.value);
    renderWeights();
    renderRanking();
    saveState();
  }
});

document.addEventListener('input', (event) => {
  if (event.target.dataset.comparison && event.target.type === 'range') {
    const value = sliderToSaaty(event.target.value);
    state.comparisons[event.target.dataset.comparison] = value;
    const current = event.target.closest('.comparison').querySelector('.saaty-current');
    current.textContent = formatSaatyDetail(value, event.target.dataset.left, event.target.dataset.right);
    renderWeights();
    renderRanking();
    saveState();
  }
});

document.querySelector('#criterionForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const id = `K${Date.now().toString().slice(-5)}`;
  state.criteria.push({
    id,
    name: data.get('name'),
    unit: data.get('unit'),
    pillar: data.get('pillar'),
    direction: data.get('direction'),
    mandatory: false,
    active: true,
  });
  event.currentTarget.reset();
  render();
});

document.querySelector('#alternativeForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.alternatives.push({ id: crypto.randomUUID(), name: data.get('name'), level: data.get('level'), scores: {} });
  event.currentTarget.reset();
  render();
});

document.querySelector('#equalWeightsButton').addEventListener('click', () => {
  state.comparisons = {};
  render();
});

document.querySelector('#socraticButton').addEventListener('click', deriveSocraticWeights);
document.querySelector('#rankButton').addEventListener('click', renderRanking);
document.querySelector('#sampleButton').addEventListener('click', () => {
  state.criteria = structuredClone(defaultCriteria);
  state.comparisons = {};
  state.manualWeights = equalWeights(state.criteria.filter((criterion) => criterion.active));
  state.alternatives = structuredClone(sampleAlternatives);
  render();
});
document.querySelector('#resetButton').addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  render();
});

render();
renderRanking();
