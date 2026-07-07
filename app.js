const STORAGE_KEY = 'renoDecisionSupportState.v3';

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

const POSITION_TO_SCORE = {
  1: 9,
  2: 8,
  3: 7,
  4: 6,
  5: 5,
  6: 4,
  7: 3,
  8: 2,
  9: 1,
  10: 1 / 2,
  11: 1 / 3,
  12: 1 / 4,
  13: 1 / 5,
  14: 1 / 6,
  15: 1 / 7,
  16: 1 / 8,
  17: 1 / 9,
};

const CATEGORY_ORDER = ['Environmental', 'Economic', 'Social'];

const defaultCriteria = [
  { id: 'C1', name: 'Space heating demand', unit: 'kWh/m2', pillar: 'Environmental', direction: 'min', mandatory: true, active: true, benchmarkType: 'none', benchmarkValue: '', baseComparison: true },
  { id: 'C2', name: 'Energy label', unit: 'label', pillar: 'Environmental', direction: 'max', mandatory: false, active: true, benchmarkType: 'energy-label', benchmarkValue: 'B' },
  { id: 'C3', name: 'Energy index', unit: 'index', pillar: 'Environmental', direction: 'min', mandatory: false, active: false, benchmarkType: 'numeric-max', benchmarkValue: '1.40' },
  { id: 'C4', name: 'Renewable energy share', unit: '%', pillar: 'Environmental', direction: 'max', mandatory: false, active: true, benchmarkType: 'numeric-min-strict', benchmarkValue: '0' },
  { id: 'C5', name: 'Gas savings', unit: 'm3/yr', pillar: 'Environmental', direction: 'max', mandatory: false, active: true, benchmarkType: 'numeric-min-strict', benchmarkValue: '0' },
  { id: 'C6', name: 'Investment costs', unit: 'EUR', pillar: 'Economic', direction: 'min', mandatory: false, active: true, benchmarkType: 'none', benchmarkValue: '' },
  { id: 'C7', name: 'Cost per label step', unit: 'EUR/step', pillar: 'Economic', direction: 'min', mandatory: false, active: false, benchmarkType: 'numeric-max', benchmarkValue: '7000' },
  { id: 'C8', name: 'Life cycle costs (30yr)', unit: 'EUR', pillar: 'Economic', direction: 'min', mandatory: false, active: true, benchmarkType: 'none', benchmarkValue: '' },
  { id: 'C9', name: 'Payback period', unit: 'years', pillar: 'Economic', direction: 'min', mandatory: false, active: true, benchmarkType: 'numeric-max', benchmarkValue: '20' },
  { id: 'C10', name: 'Thermal comfort', unit: 'hours', pillar: 'Social', direction: 'min', mandatory: true, active: true, benchmarkType: 'none', benchmarkValue: '', baseComparison: true },
  { id: 'C11', name: 'Renovation nuisance', unit: 'days', pillar: 'Social', direction: 'min', mandatory: false, active: false, benchmarkType: 'none', benchmarkValue: '' },
  { id: 'C12', name: 'Energy cost savings', unit: 'EUR/yr', pillar: 'Social', direction: 'max', mandatory: false, active: true, benchmarkType: 'none', benchmarkValue: '' },
  { id: 'C13', name: 'Rent increment', unit: 'EUR/month', pillar: 'Social', direction: 'min', mandatory: false, active: false, benchmarkType: 'numeric-max', benchmarkValue: '26.50' },
];

function createId(prefix = 'id') {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const sampleAlternatives = [
  { id: createId('alternative'), name: 'Existing HT supply baseline', level: 'Base case', isBaseCase: true, scores: { C1: 80, C2: 'C', C4: 0, C5: 0, C6: 0, C8: 84000, C9: 0, C10: 140, C12: 0 } },
  { id: createId('alternative'), name: 'Basic insulation package', level: 'Basic', isBaseCase: false, scores: { C1: 70, C2: 'B', C4: 15, C5: 420, C6: 18000, C8: 62000, C9: 17, C10: 120, C12: 620 } },
  { id: createId('alternative'), name: 'Moderate envelope upgrade', level: 'Moderate', isBaseCase: false, scores: { C1: 48, C2: 'A', C4: 32, C5: 720, C6: 36000, C8: 76000, C9: 15, C10: 72, C12: 980 } },
  { id: createId('alternative'), name: 'Deep retrofit ready', level: 'Deep', isBaseCase: false, scores: { C1: 32, C2: 'A++', C4: 58, C5: 1080, C6: 64000, C8: 91000, C9: 19, C10: 28, C12: 1410 } },
];

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  const legacy = localStorage.getItem('renoDecisionSupportState.v2');
  if (legacy) {
    try {
      return normalizeState(JSON.parse(legacy));
    } catch {
      localStorage.removeItem('renoDecisionSupportState.v2');
    }
  }
  const criteria = structuredClone(defaultCriteria);
  return normalizeState({
    criteria,
    alternatives: structuredClone(sampleAlternatives),
    participants: [createParticipant('Participant 1')],
    selectedParticipantId: null,
    rankingWeightSource: 'group',
    excludeBenchmarkFailures: true,
    crThreshold: 0.1,
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeState(candidate) {
  const criterionNormalization = normalizeCriterionIds(normalizeCriteria(Array.isArray(candidate.criteria) ? candidate.criteria : structuredClone(defaultCriteria)));
  const criteria = criterionNormalization.criteria;
  const legacyComparisons = candidate.comparisons && typeof candidate.comparisons === 'object' ? candidate.comparisons : {};
  const participants = Array.isArray(candidate.participants) && candidate.participants.length
    ? candidate.participants.map((participant, index) => normalizeParticipant(participant, index))
    : [createParticipant('Participant 1', legacyComparisons, candidate.socraticInput || '')];
  const normalizedParticipants = participants.map((participant) => ({
    ...participant,
    comparisons: remapComparisons(participant.comparisons, criterionNormalization.idMap),
    judgements: remapJudgements(participant.judgements || {}, criterionNormalization.idMap),
  }));
  const selectedParticipantId = participants.some((participant) => participant.id === candidate.selectedParticipantId)
    ? candidate.selectedParticipantId
    : normalizedParticipants[0].id;

  return {
    criteria,
    alternatives: normalizeAlternatives(Array.isArray(candidate.alternatives) ? candidate.alternatives : structuredClone(sampleAlternatives), criterionNormalization.idMap),
    participants: normalizedParticipants,
    selectedParticipantId,
    rankingWeightSource: candidate.rankingWeightSource || 'group',
    excludeBenchmarkFailures: candidate.excludeBenchmarkFailures !== false,
    crThreshold: normalizeCrThreshold(candidate.crThreshold),
  };
}

function normalizeCrThreshold(value) {
  const threshold = Number(value);
  if (!Number.isFinite(threshold)) return 0.1;
  return Math.max(0.1, Math.min(0.4, threshold));
}

function crThreshold() {
  return normalizeCrThreshold(state.crThreshold);
}

function normalizeAlternatives(alternatives, criterionIdMap = {}) {
  const normalized = alternatives.map((alternative) => ({
    ...alternative,
    id: alternative.id || createId('alternative'),
    name: normalizeLabel(alternative.name) || 'Unnamed alternative',
    level: normalizeInterventionLevel(alternative.level),
    isBaseCase: Boolean(alternative.isBaseCase),
    scores: remapScoreMap(alternative.scores || {}, criterionIdMap),
  }));
  if (!normalized.some((alternative) => alternative.isBaseCase) && normalized.length) {
    normalized[0].isBaseCase = true;
  }
  return normalized;
}

function normalizeCriterionIds(criteria) {
  const used = new Set();
  const idMap = {};
  let nextNumber = Math.max(13, ...criteria.map((criterion) => {
    const match = String(criterion.id || '').match(/^C(\d+)$/i);
    return match ? Number(match[1]) : 0;
  }));

  const normalized = criteria.map((criterion) => {
    const rawId = String(criterion.id || '').trim().toUpperCase();
    const canKeepId = /^C\d+$/.test(rawId) && !used.has(rawId);
    const id = canKeepId ? rawId : `C${++nextNumber}`;
    used.add(id);
    if (criterion.id !== id) idMap[criterion.id] = id;
    return {
      ...criterion,
      id,
      name: normalizeLabel(criterion.name) || 'Custom KPI',
      unit: normalizeLabel(criterion.unit),
    };
  });

  return { criteria: normalized, idMap };
}

function normalizeLabel(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeInterventionLevel(value) {
  const label = normalizeLabel(value);
  return label || 'Basic';
}

function standardInterventionLevel(value) {
  const label = normalizeLabel(value);
  return ['Basic', 'Moderate', 'Deep'].find((level) => level.toLowerCase() === label.toLowerCase()) || '';
}

function renderInterventionLevelEditor(alternative) {
  const standard = standardInterventionLevel(alternative.level);
  const isCustom = !standard;
  return `
    <div class="level-editor">
      <select data-alt-level-preset="${alternative.id}">
        <option value="Basic" ${standard === 'Basic' ? 'selected' : ''}>Basic</option>
        <option value="Moderate" ${standard === 'Moderate' ? 'selected' : ''}>Moderate</option>
        <option value="Deep" ${standard === 'Deep' ? 'selected' : ''}>Deep</option>
        <option value="custom" ${isCustom ? 'selected' : ''}>Custom</option>
      </select>
      <input data-alt-level-custom="${alternative.id}" class="${isCustom ? '' : 'hidden'}" value="${isCustom ? escapeHtml(alternative.level) : ''}" placeholder="Custom scenario" />
    </div>
  `;
}

function remapScoreMap(scores, idMap = {}) {
  return Object.fromEntries(Object.entries(scores).map(([key, value]) => [idMap[key] || key, value]));
}

function remapComparisons(comparisons, idMap = {}) {
  return Object.fromEntries(Object.entries(comparisons || {}).flatMap(([key, value]) => {
    const [left, right] = key.split('|');
    if (!left || !right) return [];
    return [[comparisonKey(idMap[left] || left, idMap[right] || right), value]];
  }));
}

function remapJudgements(judgements, idMap = {}) {
  return Object.fromEntries(Object.entries(judgements || {}).flatMap(([key, value]) => {
    const [categoryId, left, right] = key.split('|');
    if (!categoryId || !left || !right) return [];
    return [[judgementKey(categoryId, idMap[left] || left, idMap[right] || right), clampPosition(value)]];
  }));
}

function normalizeCriteria(criteria) {
  const defaults = new Map(defaultCriteria.map((criterion) => [criterion.id, criterion]));
  return criteria.map((criterion) => {
    const defaultCriterion = defaults.get(criterion.id);
    const benchmark = benchmarkFromLegacy(criterion, defaultCriterion);
    const legacyBaseComparison = isBaseComparableCriterion(criterion)
      && ['lower-than-base', 'higher-than-base'].includes(benchmark.benchmarkType);
    const normalizedBenchmark = legacyBaseComparison
      ? { ...benchmark, benchmarkType: 'none', benchmarkValue: '' }
      : benchmark;
    const normalizedCriterion = {
      ...criterion,
      ...normalizedBenchmark,
      baseComparison: isBaseComparableCriterion(criterion)
        ? criterion.baseComparison !== false || legacyBaseComparison
        : false,
    };
    return {
      ...normalizedCriterion,
      benchmark: benchmarkDisplay(normalizedCriterion),
    };
  });
}

function createParticipant(name, comparisons = {}, socraticInput = '') {
  return {
    id: createId('participant'),
    name,
    comparisons: structuredClone(comparisons),
    judgements: legacyComparisonsToJudgements(comparisons),
    socraticInput,
    complete: false,
  };
}

function normalizeParticipant(participant, index) {
  return {
    id: participant.id || createId('participant'),
    name: participant.name || `Participant ${index + 1}`,
    comparisons: participant.comparisons && typeof participant.comparisons === 'object' ? participant.comparisons : {},
    judgements: participant.judgements && typeof participant.judgements === 'object'
      ? participant.judgements
      : legacyComparisonsToJudgements(participant.comparisons || {}),
    socraticInput: participant.socraticInput || '',
    complete: Boolean(participant.complete),
  };
}

function selectedParticipant() {
  let participant = state.participants.find((item) => item.id === state.selectedParticipantId);
  if (!participant) {
    participant = state.participants[0];
    state.selectedParticipantId = participant.id;
  }
  return participant;
}

function activeCriteria() {
  return state.criteria.filter((criterion) => criterion.active);
}

function isBaseComparableCriterion(criterion) {
  return ['C1', 'C10'].includes(criterion.id);
}

function equalWeights(criteria) {
  const weight = criteria.length ? 1 / criteria.length : 0;
  return Object.fromEntries(criteria.map((criterion) => [criterion.id, weight]));
}

function comparisonKey(leftId, rightId) {
  return `${leftId}|${rightId}`;
}

function judgementKey(categoryId, leftId, rightId) {
  return `${categoryId}|${leftId}|${rightId}`;
}

function categoryIdForPillar(pillar) {
  return String(pillar || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function clampPosition(value) {
  const position = Number(value);
  if (!Number.isFinite(position)) return 9;
  return Math.max(1, Math.min(17, Math.round(position)));
}

function scoreToPosition(score) {
  const numeric = Number(score);
  let bestPosition = 9;
  let bestDelta = Infinity;
  for (const [position, lookupScore] of Object.entries(POSITION_TO_SCORE)) {
    const delta = Math.abs(lookupScore - numeric);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestPosition = Number(position);
    }
  }
  return bestPosition;
}

function activeCategories() {
  return CATEGORY_ORDER.map((pillar) => ({
    id: categoryIdForPillar(pillar),
    name: pillar,
    criteria: activeCriteria().filter((criterion) => criterion.pillar === pillar),
  })).filter((category) => category.criteria.length);
}

function legacyComparisonsToJudgements(comparisons = {}) {
  const judgements = {};
  for (const [key, value] of Object.entries(comparisons || {})) {
    const [leftId, rightId] = key.split('|');
    const left = defaultCriteria.find((criterion) => criterion.id === leftId);
    const right = defaultCriteria.find((criterion) => criterion.id === rightId);
    if (!left || !right || left.pillar !== right.pillar) continue;
    judgements[judgementKey(categoryIdForPillar(left.pillar), leftId, rightId)] = scoreToPosition(value);
  }
  return judgements;
}

function nextCriterionId() {
  const maxNumber = Math.max(13, ...state.criteria.map((criterion) => {
    const match = String(criterion.id || '').match(/^C(\d+)$/i);
    return match ? Number(match[1]) : 0;
  }));
  return `C${maxNumber + 1}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const ENERGY_LABEL_SCORES = {
  'A++': 9,
  'A+': 8,
  A: 7,
  B: 6,
  C: 5,
  D: 4,
  E: 3,
  F: 2,
  G: 1,
};

const BENCHMARK_TYPES = [
  { value: 'none', label: 'No benchmark' },
  { value: 'numeric-min', label: 'Numeric minimum (score >= value)' },
  { value: 'numeric-min-strict', label: 'Numeric minimum (score > value)' },
  { value: 'numeric-max', label: 'Numeric maximum (score <= value)' },
  { value: 'numeric-max-strict', label: 'Numeric maximum (score < value)' },
  { value: 'directional', label: 'Use KPI direction' },
  { value: 'energy-label', label: 'Energy label threshold' },
  { value: 'lower-than-base', label: 'Lower than base case' },
  { value: 'higher-than-base', label: 'Higher than base case' },
  { value: 'manual', label: 'Manual / descriptive only' },
];

function benchmarkTypeLabel(type) {
  return BENCHMARK_TYPES.find((item) => item.value === type)?.label || 'Benchmark';
}

function benchmarkNeedsValue(type) {
  return ['numeric-min', 'numeric-min-strict', 'numeric-max', 'numeric-max-strict', 'directional', 'energy-label', 'manual'].includes(type);
}

function benchmarkDisplay(criterion) {
  const type = criterion.benchmarkType || 'manual';
  const value = criterion.benchmarkValue || '';
  if (type === 'none') return 'No benchmark';
  if (type === 'lower-than-base') return 'Lower than base case';
  if (type === 'higher-than-base') return 'Higher than base case';
  if (type === 'energy-label') return `Label ${value || 'B'} or better`;
  if (type === 'numeric-min') return `≥ ${value}`;
  if (type === 'numeric-min-strict') return `> ${value}`;
  if (type === 'numeric-max') return `≤ ${value}`;
  if (type === 'numeric-max-strict') return `< ${value}`;
  if (type === 'directional') return `${criterion.direction === 'max' ? '≥' : '≤'} ${value}`;
  return value || 'Manual benchmark';
}

function benchmarkFromLegacy(criterion, defaultCriterion) {
  if (criterion.benchmarkType) {
    return {
      benchmarkType: criterion.benchmarkType,
      benchmarkValue: String(criterion.benchmarkValue ?? ''),
      benchmarkLocked: Boolean(criterion.benchmarkLocked),
    };
  }
  if (defaultCriterion?.benchmarkType) {
    return {
      benchmarkType: defaultCriterion.benchmarkType,
      benchmarkValue: String(defaultCriterion.benchmarkValue ?? ''),
      benchmarkLocked: Boolean(defaultCriterion.benchmarkLocked),
    };
  }

  const raw = String(criterion.benchmark ?? '').trim();
  if (!raw || raw === '-' || /^no benchmark$/i.test(raw)) return { benchmarkType: 'none', benchmarkValue: '', benchmarkLocked: false };
  if (isRelativeBenchmark(raw)) {
    return {
      benchmarkType: /higher|above|more/i.test(raw) ? 'higher-than-base' : 'lower-than-base',
      benchmarkValue: '',
      benchmarkLocked: false,
    };
  }
  if (/label|A\+\+|A\+|\b[A-G]\b/i.test(raw)) {
    const label = String(raw).toUpperCase().match(/A\+\+|A\+|\b[A-G]\b/)?.[0] || 'B';
    return { benchmarkType: 'energy-label', benchmarkValue: label, benchmarkLocked: false };
  }
  const value = parseNumericValue(raw);
  if (Number.isFinite(value)) {
    if (raw.includes('>')) return { benchmarkType: 'numeric-min-strict', benchmarkValue: String(value), benchmarkLocked: false };
    if (raw.includes('≥') || raw.includes('>=')) return { benchmarkType: 'numeric-min', benchmarkValue: String(value), benchmarkLocked: false };
    if (raw.includes('<')) return { benchmarkType: 'numeric-max-strict', benchmarkValue: String(value), benchmarkLocked: false };
    return { benchmarkType: criterion.direction === 'max' ? 'numeric-min' : 'numeric-max', benchmarkValue: String(value), benchmarkLocked: false };
  }
  return { benchmarkType: 'manual', benchmarkValue: raw, benchmarkLocked: false };
}

function normalizeNumberText(value) {
  return String(value ?? '')
    .replace(/[€\sA-Za-z/%]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
}

function parseNumericValue(value) {
  const normalized = normalizeNumberText(value);
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

function parseEnergyLabel(value) {
  const match = String(value ?? '').toUpperCase().match(/A\+\+|A\+|\b[A-G]\b/);
  return match ? ENERGY_LABEL_SCORES[match[0]] : NaN;
}

function scoreValueForCriterion(score, criterion) {
  if (isEnergyLabelCriterion(criterion)) {
    const labelScore = parseEnergyLabel(score);
    if (Number.isFinite(labelScore)) return labelScore;
  }
  return parseNumericValue(score);
}

function isEnergyLabelCriterion(criterion) {
  return criterion.id === 'C2'
    || criterion.benchmarkType === 'energy-label'
    || /label/i.test(`${criterion.name} ${criterion.unit}`);
}

function baseAlternative() {
  return state.alternatives.find((alternative) => alternative.isBaseCase);
}

function isRelativeBenchmark(benchmark) {
  return /existing|base|baseline|ht supply/i.test(String(benchmark ?? ''));
}

function evaluateBenchmark(score, criterion, alternative = null) {
  const type = criterion.benchmarkType || 'manual';
  const rawBenchmark = String(criterion.benchmarkValue ?? criterion.benchmark ?? '').trim();
  if (type === 'none') return { evaluable: false, passes: true, reason: 'No benchmark set' };

  if (type === 'lower-than-base' || type === 'higher-than-base') {
    const base = baseAlternative();
    if (!base || alternative?.id === base.id) {
      return { evaluable: false, passes: true, reason: benchmarkDisplay(criterion) };
    }
    const scoreValue = scoreValueForCriterion(score, criterion);
    const baseValue = scoreValueForCriterion(base.scores[criterion.id], criterion);
    if (Number.isFinite(scoreValue) && Number.isFinite(baseValue)) {
      const passes = type === 'higher-than-base' ? scoreValue > baseValue : scoreValue < baseValue;
      return { evaluable: true, passes, reason: `${benchmarkDisplay(criterion)}: ${base.name}` };
    }
    return { evaluable: false, passes: true, reason: benchmarkDisplay(criterion) };
  }

  if (type === 'energy-label') {
    const scoreLabel = parseEnergyLabel(score);
    const benchmarkLabel = parseEnergyLabel(rawBenchmark || 'B');
    if (Number.isFinite(scoreLabel) && Number.isFinite(benchmarkLabel)) {
      return { evaluable: true, passes: scoreLabel >= benchmarkLabel, reason: benchmarkDisplay(criterion) };
    }
  }

  const scoreValue = scoreValueForCriterion(score, criterion);
  const benchmarkValue = parseNumericValue(rawBenchmark);
  if (Number.isFinite(scoreValue) && Number.isFinite(benchmarkValue)) {
    const operator = type === 'numeric-min' ? '>='
      : type === 'numeric-min-strict' ? '>'
        : type === 'numeric-max' ? '<='
          : type === 'numeric-max-strict' ? '<'
            : criterion.direction === 'max' ? '>=' : '<=';
    const passes = operator === '<=' ? scoreValue <= benchmarkValue
      : operator === '<' ? scoreValue < benchmarkValue
        : operator === '>=' ? scoreValue >= benchmarkValue
          : scoreValue > benchmarkValue;
    return { evaluable: true, passes, reason: benchmarkDisplay(criterion) };
  }

  if (criterion.benchmark && !criterion.benchmarkType) {
    return evaluateLegacyBenchmark(score, criterion, alternative);
  }

  return { evaluable: false, passes: true, reason: benchmarkDisplay(criterion) };
}

function evaluateBaseComparison(score, criterion, alternative = null) {
  if (!criterion.baseComparison) return { evaluable: false, passes: true, reason: 'Base comparison not enabled' };
  const base = baseAlternative();
  if (!base || alternative?.id === base.id) {
    return { evaluable: false, passes: true, reason: 'Compare with base case' };
  }
  const scoreValue = scoreValueForCriterion(score, criterion);
  const baseValue = scoreValueForCriterion(base.scores[criterion.id], criterion);
  if (!Number.isFinite(scoreValue) || !Number.isFinite(baseValue)) {
    return { evaluable: false, passes: true, reason: 'Compare with base case' };
  }
  const passes = criterion.direction === 'max' ? scoreValue > baseValue : scoreValue < baseValue;
  return { evaluable: true, passes, reason: `Compare with base case: ${base.name}` };
}

function evaluateLegacyBenchmark(score, criterion, alternative = null) {
  const rawBenchmark = String(criterion.benchmark ?? '').trim();
  if (!rawBenchmark || rawBenchmark === '-') return { evaluable: false, passes: true, reason: 'No benchmark set' };
  const migrated = { ...criterion, ...benchmarkFromLegacy(criterion, null) };
  return evaluateBenchmark(score, migrated, alternative);
}

function render() {
  renderCriteria();
  renderAlternativeForm();
  renderScores();
  renderParticipants();
  renderComparisons();
  renderWeights();
  renderGroupWeights();
  renderRanking();
  renderCrThreshold();
  saveState();
}

function renderCrThreshold() {
  const slider = document.querySelector('#crThresholdSlider');
  const label = document.querySelector('#crThresholdValue');
  const threshold = crThreshold();
  if (slider && Number(slider.value) !== threshold) slider.value = threshold.toFixed(2);
  if (label) label.textContent = threshold.toFixed(2);
}

function renderAlternativeForm() {
  const fields = document.querySelector('#alternativeCriteriaFields');
  if (!fields) return;
  const criteria = activeCriteria();
  fields.innerHTML = criteria.length
    ? criteria.map((criterion) => `
      <label class="alternative-field ${criterion.pillar.toLowerCase()}">
        <span>
          <strong>${escapeHtml(criterion.id)} ${escapeHtml(criterion.name)}</strong>
          <span class="meta">${escapeHtml(criterion.unit)} | ${criterion.direction === 'min' ? 'Minimize' : 'Maximize'}</span>
        </span>
        <input name="score-${escapeHtml(criterion.id)}" data-new-score="${escapeHtml(criterion.id)}" placeholder="${escapeHtml(alternativeScorePlaceholder(criterion))}" required />
      </label>
    `).join('')
    : '<div class="warning">Activate at least one criterion before adding alternatives.</div>';
}

function alternativeScorePlaceholder(criterion) {
  if (isEnergyLabelCriterion(criterion)) return 'e.g. B, A, A++';
  if (criterion.unit) return `Enter ${criterion.unit}`;
  return 'Enter performance value';
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
              <h4>${escapeHtml(criterion.id)} ${escapeHtml(criterion.name)}</h4>
              <p class="meta">${escapeHtml(criterion.unit)} | ${criterion.direction === 'min' ? 'Minimize' : 'Maximize'} ${criterion.mandatory ? '| gate' : ''}${criterion.baseComparison ? ' | base comparison' : ''}</p>
              ${renderBenchmarkControls(criterion)}
              ${renderBaseComparisonControl(criterion)}
            </div>
            <div class="criterion-tools">
              <label class="switch">
                <input type="checkbox" ${criterion.active ? 'checked' : ''} ${criterion.mandatory ? 'disabled' : ''} data-toggle="${criterion.id}" />
                Active
              </label>
              ${criterion.mandatory ? '<span class="pill">Gate</span>' : ''}
              <button class="ghost delete" type="button" data-delete="${criterion.id}">Delete</button>
            </div>
          </article>
        `).join('')}
      </div>
    `;
    grid.appendChild(column);
  }
}

function renderBenchmarkControls(criterion) {
  const value = criterion.benchmarkType === 'none' ? '' : benchmarkDisplay(criterion);
  return `
    <label class="benchmark-field">
      Benchmark
      <input data-benchmark-text="${criterion.id}" value="${escapeHtml(value)}" placeholder="e.g. <= 1.40, Label B or better" />
    </label>
  `;
}

function renderBaseComparisonControl(criterion) {
  if (!isBaseComparableCriterion(criterion)) return '';
  return `
    <label class="switch benchmark-check">
      <input type="checkbox" ${criterion.baseComparison ? 'checked' : ''} data-base-comparison="${criterion.id}" />
      Compare with base case
    </label>
  `;
}

function renderBenchmarkValueControl(criterion) {
  if (criterion.benchmarkType === 'energy-label') {
    return `
      <label>
        Threshold label
        <select data-benchmark-value="${criterion.id}">
          ${Object.keys(ENERGY_LABEL_SCORES).map((label) => `<option value="${label}" ${criterion.benchmarkValue === label ? 'selected' : ''}>${label} or better</option>`).join('')}
        </select>
      </label>
    `;
  }

  return `
    <label>
      Benchmark value
      <input data-benchmark-value="${criterion.id}" value="${escapeHtml(criterion.benchmarkValue ?? '')}" placeholder="Benchmark value" />
    </label>
  `;
}

function renderScores() {
  const table = document.querySelector('#scoresTable');
  const criteria = activeCriteria();
  const headers = ['Alternative name', 'Intervention level (scenario)', 'Base case', ...criteria.map((criterion) => `${criterion.id} ${criterion.name}`), ''];
  table.innerHTML = `
    <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
    <tbody>
      ${state.alternatives.map((alternative) => `
        <tr class="${alternative.isBaseCase ? 'base-case-row' : ''}">
          <td><input data-alt-name="${alternative.id}" value="${escapeHtml(alternative.name)}" /></td>
          <td>${renderInterventionLevelEditor(alternative)}</td>
          <td>
            <label class="switch">
              <input type="radio" name="baseAlternative" data-base-alt="${alternative.id}" ${alternative.isBaseCase ? 'checked' : ''} />
              Existing condition
            </label>
          </td>
          ${criteria.map((criterion) => `
            <td>
              <input data-score-alt="${alternative.id}" data-score-criterion="${criterion.id}" value="${escapeHtml(alternative.scores[criterion.id] ?? '')}" />
              <div class="meta">${criterion.unit}</div>
            </td>
          `).join('')}
          <td><button class="ghost delete" type="button" data-delete-alt="${alternative.id}" ${alternative.isBaseCase ? 'disabled' : ''}>Delete</button></td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

function renderParticipants() {
  const list = document.querySelector('#participantList');
  if (!list) return;

  list.innerHTML = state.participants.map((participant) => {
    const result = ahpResult(participant.comparisons);
    const included = participant.complete && result.cr <= 0.1;
    const status = participant.complete ? (included ? 'included' : 'review') : 'pending';
    const active = participant.id === state.selectedParticipantId ? 'active' : '';
    const name = escapeHtml(participant.name);
    return `
      <article class="participant-card ${active}" data-participant-card="${participant.id}">
        <button class="participant-select" type="button" data-select-participant="${participant.id}">
          <strong>${name}</strong>
          <span class="${included ? 'good' : participant.complete ? 'bad' : ''}">CR ${Number.isFinite(result.cr) ? result.cr.toFixed(3) : 'n/a'} · ${status}</span>
        </button>
        <div class="participant-tools">
          <input value="${name}" data-participant-name="${participant.id}" aria-label="Participant name" />
          <button class="ghost delete" type="button" data-delete-participant="${participant.id}" ${state.participants.length === 1 ? 'disabled' : ''}>Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

function aggregateGroupWeights() {
  const criteria = activeCriteria();
  const included = state.participants
    .map((participant) => ({ participant, result: ahpResult(participant.comparisons) }))
    .filter((item) => item.participant.complete && item.result.cr <= 0.1);

  if (!criteria.length || !included.length) {
    return { weights: equalWeights(criteria), included, excludedCount: state.participants.length };
  }

  const geometric = {};
  for (const criterion of criteria) {
    const product = included.reduce((value, item) => value * Math.max(item.result.weights[criterion.id] ?? 0, 0.000001), 1);
    geometric[criterion.id] = product ** (1 / included.length);
  }

  const total = Object.values(geometric).reduce((sum, value) => sum + value, 0) || 1;
  const weights = Object.fromEntries(Object.entries(geometric).map(([id, value]) => [id, value / total]));
  return { weights, included, excludedCount: state.participants.length - included.length };
}

function renderGroupWeights() {
  const summary = document.querySelector('#groupSummary');
  const bars = document.querySelector('#groupWeightBars');
  if (!summary || !bars) return;

  const group = aggregateGroupWeights();
  summary.innerHTML = `
    <p class="meta">${group.included.length} participant${group.included.length === 1 ? '' : 's'} included · ${group.excludedCount} not included</p>
    <p class="meta">Aggregation: geometric mean of consistent AHP profiles.</p>
  `;
  bars.innerHTML = activeCriteria().map((criterion) => `
    <div class="bar-row">
      <div>
        <div>${criterion.id} ${criterion.name}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(group.weights[criterion.id] ?? 0) * 100}%"></div></div>
      </div>
      <strong>${(((group.weights[criterion.id] ?? 0) * 100)).toFixed(1)}%</strong>
    </div>
  `).join('');
}

function renderComparisons() {
  const list = document.querySelector('#comparisonList');
  const criteria = activeCriteria();
  const participant = selectedParticipant();
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
      const value = participant.comparisons[key] ?? 1;
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

function ahpResult(comparisons = selectedParticipant().comparisons) {
  const criteria = activeCriteria();
  const n = criteria.length;
  if (!n) return { weights: {}, cr: 0, lambdaMax: 0 };
  const matrix = Array.from({ length: n }, () => Array(n).fill(1));

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const value = comparisons[comparisonKey(criteria[i].id, criteria[j].id)] ?? 1;
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
  const participant = selectedParticipant();
  const { weights, cr } = ahpResult(participant.comparisons);
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

  const socraticInput = document.querySelector('#socraticInput');
  if (socraticInput && socraticInput.value !== participant.socraticInput) {
    socraticInput.value = participant.socraticInput;
  }
}

function categoryPairs(criteria) {
  const pairs = [];
  for (let i = 0; i < criteria.length; i += 1) {
    for (let j = i + 1; j < criteria.length; j += 1) pairs.push([criteria[i], criteria[j]]);
  }
  return pairs;
}

function ensureParticipantJudgements(participant) {
  participant.judgements ||= {};
  for (const category of activeCategories()) {
    for (const [left, right] of categoryPairs(category.criteria)) {
      const key = judgementKey(category.id, left.id, right.id);
      if (!participant.judgements[key]) participant.judgements[key] = 9;
    }
  }
}

function categoryComplete(participant, category) {
  if (category.criteria.length <= 1) return true;
  return categoryPairs(category.criteria).every(([left, right]) => {
    const position = Number(participant.judgements?.[judgementKey(category.id, left.id, right.id)]);
    return Number.isInteger(position) && position >= 1 && position <= 17;
  });
}

function buildCategoryMatrix(participant, category) {
  const n = category.criteria.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(1));
  const indexById = new Map(category.criteria.map((criterion, index) => [criterion.id, index]));
  for (const [left, right] of categoryPairs(category.criteria)) {
    const position = clampPosition(participant.judgements?.[judgementKey(category.id, left.id, right.id)]);
    const score = POSITION_TO_SCORE[position];
    const i = indexById.get(left.id);
    const j = indexById.get(right.id);
    matrix[i][j] = score;
    matrix[j][i] = 1 / score;
  }
  return matrix;
}

function computeAHP(matrix, criteria) {
  const n = criteria.length;
  if (!n) return { weights: {}, cr: 0, lambdaMax: 0, ci: 0, consistent: true, consistencyVector: [] };
  if (n === 1) return { weights: { [criteria[0].id]: 1 }, cr: 0, lambdaMax: 1, ci: 0, consistent: true, consistencyVector: [1] };
  const colSums = Array.from({ length: n }, (_, column) => matrix.reduce((sum, row) => sum + row[column], 0) || 1);
  const normalized = matrix.map((row) => row.map((cell, column) => cell / colSums[column]));
  const vector = normalized.map((row) => row.reduce((sum, cell) => sum + cell, 0) / n);
  const weighted = matrix.map((row) => row.reduce((sum, cell, index) => sum + cell * vector[index], 0));
  const consistencyVector = weighted.map((value, index) => value / vector[index]);
  const lambdaMax = consistencyVector.reduce((sum, value) => sum + value, 0) / n;
  const ci = (lambdaMax - n) / (n - 1);
  const ri = RI[n] ?? NaN;
  const cr = Number.isFinite(ri) && ri > 0 ? ci / ri : 0;
  const weights = Object.fromEntries(criteria.map((criterion, index) => [criterion.id, vector[index]]));
  return { weights, cr, lambdaMax, ci, ri, consistent: cr <= crThreshold(), consistencyVector };
}

function normalizeWeights(weights, criteria = activeCriteria()) {
  const total = criteria.reduce((sum, criterion) => sum + (weights[criterion.id] ?? 0), 0);
  if (!total) return equalWeights(criteria);
  return Object.fromEntries(criteria.map((criterion) => [criterion.id, (weights[criterion.id] ?? 0) / total]));
}

function participantAHPProfile(participant) {
  const categoryResults = activeCategories().map((category) => {
    const complete = categoryComplete(participant, category);
    const result = complete ? computeAHP(buildCategoryMatrix(participant, category), category.criteria) : {
      weights: equalWeights(category.criteria),
      cr: NaN,
      lambdaMax: NaN,
      ci: NaN,
      consistent: false,
      consistencyVector: [],
    };
    return { category, complete, result };
  });
  const complete = categoryResults.every((item) => item.complete);
  const consistent = categoryResults.every((item) => item.result.consistent);
  const weights = {};
  for (const item of categoryResults) Object.assign(weights, item.result.weights);
  return { complete, consistent, categoryResults, weights, balancedWeights: normalizeWeights(weights) };
}

function aggregateGroupWeights() {
  const criteria = activeCriteria();
  const included = state.participants
    .map((participant) => ({ participant, profile: participantAHPProfile(participant) }))
    .filter((item) => item.profile.complete && item.profile.consistent);

  if (!criteria.length || !included.length) {
    return { weights: equalWeights(criteria), average: {}, included, excludedCount: state.participants.length };
  }

  const average = {};
  for (const criterion of criteria) {
    average[criterion.id] = included.reduce((sum, item) => sum + (item.profile.weights[criterion.id] ?? 0), 0) / included.length;
  }
  return {
    weights: normalizeWeights(average, criteria),
    average,
    included,
    excludedCount: state.participants.length - included.length,
  };
}

function renderParticipants() {
  const list = document.querySelector('#participantList');
  if (!list) return;

  list.innerHTML = state.participants.map((participant) => {
    const profile = participantAHPProfile(participant);
    const included = profile.complete && profile.consistent;
    const status = profile.complete ? (included ? 'included' : 'review') : 'pending';
    const active = participant.id === state.selectedParticipantId ? 'active' : '';
    const name = escapeHtml(participant.name);
    const crText = profile.categoryResults.length
      ? profile.categoryResults.map((item) => `${item.category.name}: ${formatCrStatus(item.result.cr)}`).join(' | ')
      : 'No active categories';
    return `
      <article class="participant-card ${active}" data-participant-card="${participant.id}">
        <button class="participant-select" type="button" data-select-participant="${participant.id}">
          <strong>${name}</strong>
          <span class="${included ? 'good' : profile.complete ? 'bad' : ''}">${crText} - ${status}</span>
        </button>
        <div class="participant-tools">
          <input value="${name}" data-participant-name="${participant.id}" aria-label="Participant name" />
          <button class="ghost" type="button" data-open-ahp="${participant.id}">Pairwise</button>
          <button class="ghost delete" type="button" data-delete-participant="${participant.id}" ${state.participants.length === 1 ? 'disabled' : ''}>Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

function formatCrStatus(cr) {
  if (!Number.isFinite(cr)) return 'n/a';
  return `${cr.toFixed(3)} ${cr <= crThreshold() ? 'OK' : 'review'}`;
}

function inconsistencyPrompt(category, result) {
  if (!Number.isFinite(result.cr)) return 'Complete the comparisons to calculate CR.';
  if (result.cr <= crThreshold()) return `CR is within the selected threshold (${crThreshold().toFixed(2)}). The judgements in this category are consistent enough to include.`;
  const deviations = result.consistencyVector.map((value) => Math.abs(value - result.lambdaMax));
  const worstIndex = deviations.indexOf(Math.max(...deviations));
  const criterion = category.criteria[worstIndex];
  const mismatch = strongestMismatchForCriterion(category, result, criterion);
  return `${criterion?.id || 'This criterion'} ${criterion?.name || ''} is driving the inconsistency most. ${mismatch}`;
}

function strongestMismatchForCriterion(category, result, criterion) {
  if (!criterion) return 'Revisit comparisons involving this criterion.';
  let best = null;
  for (const other of category.criteria) {
    if (other.id === criterion.id) continue;
    const [left, right] = category.criteria.findIndex((item) => item.id === criterion.id) < category.criteria.findIndex((item) => item.id === other.id)
      ? [criterion, other]
      : [other, criterion];
    const direct = POSITION_TO_SCORE[clampPosition(selectedParticipant().judgements?.[judgementKey(category.id, left.id, right.id)])];
    const implied = (result.weights[left.id] || 0.000001) / (result.weights[right.id] || 0.000001);
    const delta = Math.abs(Math.log(direct) - Math.log(implied));
    if (!best || delta > best.delta) best = { left, right, direct, implied, delta };
  }
  if (!best) return 'Revisit comparisons involving this criterion.';
  return `Largest mismatch: you answered ${formatRatioPlain(best.direct, best.left.id, best.right.id)}, but the calculated weights imply about ${formatRatioPlain(best.implied, best.left.id, best.right.id)}. Revisit this comparison and other comparisons involving ${criterion.id}.`;
}

function formatRatioPlain(ratio, leftId, rightId) {
  if (!Number.isFinite(ratio) || ratio <= 0) return `${leftId} and ${rightId} cannot be compared`;
  if (Math.abs(ratio - 1) < 0.15) return `${leftId} and ${rightId} are roughly equal`;
  if (ratio > 1) return `${leftId} is ${ratio.toFixed(1)}x more important than ${rightId}`;
  return `${rightId} is ${(1 / ratio).toFixed(1)}x more important than ${leftId}`;
}

function renderGroupWeights() {
  const summary = document.querySelector('#groupSummary');
  const bars = document.querySelector('#groupWeightBars');
  if (!summary || !bars) return;

  const group = aggregateGroupWeights();
  summary.innerHTML = `
    <p class="meta">${group.included.length} participant${group.included.length === 1 ? '' : 's'} included - ${group.excludedCount} not included</p>
    <p class="meta">Included means every category has CR <= ${crThreshold().toFixed(2)}. Aggregation uses arithmetic mean per criterion, then one global normalization.</p>
  `;
  bars.innerHTML = activeCriteria().map((criterion) => `
    <div class="bar-row">
      <div>
        <div>${criterion.id} ${criterion.name}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(group.weights[criterion.id] ?? 0) * 100}%"></div></div>
      </div>
      <strong>${(((group.weights[criterion.id] ?? 0) * 100)).toFixed(1)}%</strong>
    </div>
  `).join('');
}

function renderComparisons() {
  const table = document.querySelector('#participantComparisonTable');
  if (!table) return;
  const criteria = activeCriteria();
  const group = aggregateGroupWeights();
  table.innerHTML = `
    <thead>
      <tr><th>Participant</th>${criteria.map((criterion) => `<th>${escapeHtml(criterion.id)}</th>`).join('')}<th>CR by category</th></tr>
    </thead>
    <tbody>
      ${state.participants.map((participant) => {
        const profile = participantAHPProfile(participant);
        return `
          <tr>
            <td>${escapeHtml(participant.name)}</td>
            ${criteria.map((criterion) => `<td>${((profile.balancedWeights[criterion.id] ?? 0) * 100).toFixed(1)}%</td>`).join('')}
            <td>${profile.categoryResults.map((item) => `${escapeHtml(item.category.name)} ${formatCrStatus(item.result.cr)}`).join('<br>')}</td>
          </tr>
        `;
      }).join('')}
      <tr><td><strong>Average</strong></td>${criteria.map((criterion) => `<td>${((group.average[criterion.id] ?? 0) * 100).toFixed(1)}%</td>`).join('')}<td></td></tr>
      <tr><td><strong>Balanced</strong></td>${criteria.map((criterion) => `<td><strong>${((group.weights[criterion.id] ?? 0) * 100).toFixed(1)}%</strong></td>`).join('')}<td></td></tr>
    </tbody>
  `;
}

function formatPositionDetail(position, leftId, rightId) {
  const score = POSITION_TO_SCORE[clampPosition(position)];
  if (score === 1) return `${leftId} and ${rightId} are equally important (position 9)`;
  const stronger = score > 1 ? leftId : rightId;
  const weaker = score > 1 ? rightId : leftId;
  const displayScore = score > 1 ? score : 1 / score;
  return `${stronger} is ${displayScore.toFixed(0)}x more important than ${weaker}`;
}

function renderAHPDialog(participant) {
  const body = document.querySelector('#ahpDialogBody');
  const title = document.querySelector('#ahpDialogTitle');
  if (!body || !title) return;
  ensureParticipantJudgements(participant);
  title.textContent = `${participant.name} pairwise comparisons`;
  body.innerHTML = `
    <div class="helper">
      <strong>How to read CR</strong>
      <p>CR is the consistency ratio. CR at or below the selected threshold (${crThreshold().toFixed(2)}) is accepted. If CR is above the threshold, the answers conflict with each other and that category should be reviewed before its weights are used.</p>
    </div>
    ${activeCategories().map((category) => {
    const profile = participantAHPProfile(participant).categoryResults.find((item) => item.category.id === category.id);
    return `
      <section class="ahp-category">
        <div class="category-headline">
          <h4>${escapeHtml(category.name)}</h4>
          <span class="metric ${profile?.result.consistent ? 'pass' : 'fail'}" data-category-cr="${category.id}">CR ${formatCrStatus(profile?.result.cr)}</span>
        </div>
        <div class="${profile?.result.consistent ? 'helper' : 'warning'}" data-category-prompt="${category.id}">${escapeHtml(inconsistencyPrompt(category, profile.result))}</div>
        ${category.criteria.length <= 1 ? '<p class="meta">Only one active criterion. Weight is 100%.</p>' : categoryPairs(category.criteria).map(([left, right]) => {
          const key = judgementKey(category.id, left.id, right.id);
          const position = clampPosition(participant.judgements[key]);
          return `
            <div class="comparison">
              <label>
                <div class="comparison-top">
                  <strong class="criterion-chip ${category.name.toLowerCase()}">${escapeHtml(left.id)} ${escapeHtml(left.name)}</strong>
                  <strong class="criterion-chip ${category.name.toLowerCase()}">${escapeHtml(right.id)} ${escapeHtml(right.name)}</strong>
                </div>
                <input type="range" min="1" max="17" step="1" value="${position}" data-judgement="${key}" data-left="${left.id}" data-right="${right.id}" />
                <div class="saaty-scale" aria-hidden="true">
                  <span>9</span><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span>
                </div>
                <div class="saaty-current">${formatPositionDetail(position, left.id, right.id)}</div>
              </label>
            </div>
          `;
        }).join('')}
      </section>
    `;
  }).join('')}
  `;
}

function updateDialogCategoryFeedback(participant, categoryId) {
  const category = activeCategories().find((item) => item.id === categoryId);
  if (!category) return;
  const profile = participantAHPProfile(participant).categoryResults.find((item) => item.category.id === categoryId);
  if (!profile) return;

  const crEl = document.querySelector(`[data-category-cr="${categoryId}"]`);
  if (crEl) {
    crEl.className = `metric ${profile.result.consistent ? 'pass' : 'fail'}`;
    crEl.textContent = `CR ${formatCrStatus(profile.result.cr)}`;
  }

  const promptEl = document.querySelector(`[data-category-prompt="${categoryId}"]`);
  if (promptEl) {
    promptEl.className = profile.result.consistent ? 'helper' : 'warning';
    promptEl.textContent = inconsistencyPrompt(category, profile.result);
  }
}

function renderWeights() {
  const profile = participantAHPProfile(selectedParticipant());
  const bars = document.querySelector('#weightBars');
  bars.innerHTML = activeCriteria().map((criterion) => `
    <div class="bar-row">
      <div>
        <div>${criterion.id} ${criterion.name}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(profile.balancedWeights[criterion.id] ?? 0) * 100}%"></div></div>
      </div>
      <strong>${(((profile.balancedWeights[criterion.id] ?? 0) * 100)).toFixed(1)}%</strong>
    </div>
  `).join('');

  const consistency = document.querySelector('#consistency');
  consistency.className = `metric ${profile.complete && profile.consistent ? 'pass' : 'fail'}`;
  consistency.textContent = profile.categoryResults.map((item) => {
    return `${item.category.name} CR ${formatCrStatus(item.result.cr)}`;
  }).join(' | ');

  const participant = selectedParticipant();
  const socraticInput = document.querySelector('#socraticInput');
  if (socraticInput && socraticInput.value !== participant.socraticInput) {
    socraticInput.value = participant.socraticInput;
  }
}

function benchmarkFailureDetails(alternative) {
  return activeCriteria().filter((criterion) => {
    const benchmarkResult = evaluateBenchmark(alternative.scores[criterion.id], criterion, alternative);
    const baseResult = evaluateBaseComparison(alternative.scores[criterion.id], criterion, alternative);
    return (benchmarkResult.evaluable && !benchmarkResult.passes) || (baseResult.evaluable && !baseResult.passes);
  });
}

function hasBenchmarkFailure(alternative) {
  return benchmarkFailureDetails(alternative).length > 0;
}

function rankingWeightContext() {
  const criteria = activeCriteria();
  if (state.rankingWeightSource === 'equal') {
    return { weights: equalWeights(criteria), label: 'Equal fallback weights' };
  }

  if (state.rankingWeightSource === 'participant') {
    const participant = selectedParticipant();
    return { weights: participantAHPProfile(participant).balancedWeights, label: `${escapeHtml(participant.name)} weights` };
  }

  const group = aggregateGroupWeights();
  if (group.included.length) {
    return { weights: group.weights, label: `Aggregated group weights (${group.included.length} consistent participant${group.included.length === 1 ? '' : 's'})` };
  }

  return { weights: equalWeights(criteria), label: 'Equal fallback weights (no consistent participant profiles yet)' };
}

function calculateTopsis() {
  const criteria = activeCriteria();
  const alternatives = state.alternatives.filter((alternative) => {
    return !alternative.isBaseCase
      && (!state.excludeBenchmarkFailures || !hasBenchmarkFailure(alternative))
      && criteria.every((criterion) => Number.isFinite(scoreValueForCriterion(alternative.scores[criterion.id], criterion)));
  });
  if (!criteria.length || !alternatives.length) return [];

  const weights = rankingWeightContext().weights;
  const columns = criteria.map((criterion) => alternatives.map((alternative) => scoreValueForCriterion(alternative.scores[criterion.id], criterion)));
  const denominators = columns.map((column) => Math.sqrt(column.reduce((sum, value) => sum + value ** 2, 0)) || 1);
  const weighted = alternatives.map((alternative) => criteria.map((criterion, index) => {
    return (scoreValueForCriterion(alternative.scores[criterion.id], criterion) / denominators[index]) * (weights[criterion.id] ?? 0);
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
    return { alternative, dPlus, dMinus, closeness, benchmarkFailures: benchmarkFailureDetails(alternative) };
  }).sort((a, b) => b.closeness - a.closeness);
}

function renderRanking() {
  const results = calculateTopsis();
  const table = document.querySelector('#rankingTable');
  const chart = document.querySelector('#rankingChart');
  const context = rankingWeightContext();
  const sourceSelect = document.querySelector('#weightSourceSelect');
  if (sourceSelect && sourceSelect.value !== state.rankingWeightSource) sourceSelect.value = state.rankingWeightSource;
  const benchmarkButton = document.querySelector('#benchmarkModeButton');
  if (benchmarkButton) {
    benchmarkButton.textContent = state.excludeBenchmarkFailures ? 'Include benchmark failures' : 'Exclude benchmark failures';
  }

  const notice = document.querySelector('#weightSourceNotice');
  if (notice) {
    notice.innerHTML = `<strong>Ranking weight source</strong><p>${context.label}</p>`;
  }

  chart.innerHTML = results.length
    ? results.map((result, index) => `
      <div class="rank-bar ${result.benchmarkFailures.length ? 'benchmark-fail' : ''}">
        <div class="rank-name">${index + 1}. ${escapeHtml(result.alternative.name)}</div>
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
        <tr class="${result.benchmarkFailures.length ? 'benchmark-fail-row' : ''}">
          <td>${index + 1}</td>
          <td>${escapeHtml(result.alternative.name)}</td>
          <td>${escapeHtml(result.alternative.level)}</td>
          <td>${result.dPlus.toFixed(4)}</td>
          <td>${result.dMinus.toFixed(4)}</td>
          <td><strong>${result.closeness.toFixed(4)}</strong>${result.benchmarkFailures.length ? `<div class="meta bad">Fails: ${result.benchmarkFailures.map((criterion) => escapeHtml(criterion.id)).join(', ')}</div>` : ''}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  const warnings = state.alternatives.filter((alternative) => !alternative.isBaseCase && hasBenchmarkFailure(alternative));
  document.querySelector('#gateWarnings').innerHTML = warnings.length
    ? `<div class="warning">Benchmark ${state.excludeBenchmarkFailures ? 'exclusion' : 'warning'}: ${warnings.map((warning) => {
      const failed = benchmarkFailureDetails(warning).map((criterion) => escapeHtml(criterion.id)).join(', ');
      return `${escapeHtml(warning.name)} (${failed})`;
    }).join('; ')} ${state.excludeBenchmarkFailures ? 'were excluded before TOPSIS.' : 'are included but marked in the ranking.'}</div>`
    : '';
}

function deriveSocraticWeights() {
  const participant = selectedParticipant();
  const input = document.querySelector('#socraticInput').value;
  participant.socraticInput = input;
  const text = input.toLowerCase();
  const categories = activeCategories();
  const terms = {
    cost: ['cost', 'investment', 'budget', 'life cycle', 'payback', 'rent'],
    comfort: ['comfort', 'thermal', 'tenant', 'health'],
    environment: ['energy', 'emission', 'gas', 'renewable', 'label', 'demand'],
    nuisance: ['nuisance', 'disruption', 'days', 'construction'],
  };
  const judgements = {};

  for (const category of categories) {
    const scores = {};
    for (const criterion of category.criteria) {
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
    Object.assign(judgements, weightsToApproxJudgements(scores, category));
  }

  participant.judgements = { ...(participant.judgements || {}), ...judgements };
  participant.complete = true;
  render();
}

function weightsToApproxJudgements(weights, category) {
  const judgements = {};
  for (const [left, right] of categoryPairs(category.criteria)) {
    const ratio = (weights[left.id] || 0.01) / (weights[right.id] || 0.01);
    let bestPosition = 9;
    let bestDelta = Infinity;
    for (const [position, score] of Object.entries(POSITION_TO_SCORE)) {
      const delta = Math.abs(score - ratio);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestPosition = Number(position);
      }
    }
    judgements[judgementKey(category.id, left.id, right.id)] = bestPosition;
  }
  return judgements;
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
    state.criteria = state.criteria.filter((criterion) => criterion.id !== deleteCriterion);
    for (const alternative of state.alternatives) delete alternative.scores[deleteCriterion];
    for (const participant of state.participants) {
      participant.comparisons = Object.fromEntries(Object.entries(participant.comparisons).filter(([key]) => !key.split('|').includes(deleteCriterion)));
      participant.judgements = Object.fromEntries(Object.entries(participant.judgements || {}).filter(([key]) => !key.split('|').includes(deleteCriterion)));
    }
    render();
  }

  const deleteAlternative = event.target.dataset.deleteAlt;
  if (deleteAlternative) {
    state.alternatives = state.alternatives.filter((alternative) => alternative.id !== deleteAlternative || alternative.isBaseCase);
    render();
  }

  const selectParticipant = event.target.closest('[data-select-participant]')?.dataset.selectParticipant;
  if (selectParticipant) {
    state.selectedParticipantId = selectParticipant;
    render();
  }

  const deleteParticipant = event.target.dataset.deleteParticipant;
  if (deleteParticipant && state.participants.length > 1) {
    state.participants = state.participants.filter((participant) => participant.id !== deleteParticipant);
    if (state.selectedParticipantId === deleteParticipant) state.selectedParticipantId = state.participants[0].id;
    render();
  }

  const openAhp = event.target.dataset.openAhp;
  if (openAhp) {
    const participant = state.participants.find((item) => item.id === openAhp);
    if (participant) {
      state.selectedParticipantId = participant.id;
      renderAHPDialog(participant);
      document.querySelector('#ahpDialog')?.showModal();
      render();
    }
  }

  if (event.target.id === 'closeAhpDialog' || event.target.id === 'doneAhpDialog') {
    document.querySelector('#ahpDialog')?.close();
  }

  if (event.target.id === 'editSelectedAhpButton') {
    const participant = selectedParticipant();
    renderAHPDialog(participant);
    document.querySelector('#ahpDialog')?.showModal();
  }

  if (event.target.id === 'openAlternativeDialog') {
    const dialog = document.querySelector('#alternativeDialog');
    if (dialog) {
      renderAlternativeForm();
      dialog.showModal();
    }
  }

  if (event.target.id === 'closeAlternativeDialog' || event.target.id === 'cancelAlternativeDialog') {
    const dialog = document.querySelector('#alternativeDialog');
    if (dialog) dialog.close();
  }
});

document.addEventListener('change', (event) => {
  if (event.target.dataset.toggle) {
    const criterion = state.criteria.find((item) => item.id === event.target.dataset.toggle);
    if (criterion && !criterion.mandatory) criterion.active = event.target.checked;
    render();
  }

  if (event.target.dataset.benchmarkType) {
    const criterion = state.criteria.find((item) => item.id === event.target.dataset.benchmarkType);
    if (criterion) {
      criterion.benchmarkType = event.target.value;
      if (!benchmarkNeedsValue(criterion.benchmarkType)) criterion.benchmarkValue = '';
      criterion.benchmark = benchmarkDisplay(criterion);
    }
    render();
  }

  if (event.target.dataset.benchmarkValue) {
    const criterion = state.criteria.find((item) => item.id === event.target.dataset.benchmarkValue);
    if (criterion) {
      criterion.benchmarkValue = event.target.value.trim();
      criterion.benchmark = benchmarkDisplay(criterion);
    }
    render();
  }

  if (event.target.dataset.benchmarkText) {
    const criterion = state.criteria.find((item) => item.id === event.target.dataset.benchmarkText);
    if (criterion) {
      const parsed = benchmarkFromLegacy({
        benchmark: event.target.value,
        direction: criterion.direction,
        name: criterion.name,
      });
      if (isBaseComparableCriterion(criterion) && ['lower-than-base', 'higher-than-base'].includes(parsed.benchmarkType)) {
        criterion.baseComparison = true;
        criterion.benchmarkType = 'none';
        criterion.benchmarkValue = '';
      } else {
        criterion.benchmarkType = parsed.benchmarkType;
        criterion.benchmarkValue = parsed.benchmarkValue;
      }
      criterion.benchmark = benchmarkDisplay(criterion);
    }
    render();
  }

  if (event.target.dataset.baseComparison) {
    const criterion = state.criteria.find((item) => item.id === event.target.dataset.baseComparison);
    if (criterion && isBaseComparableCriterion(criterion)) {
      criterion.baseComparison = event.target.checked;
    }
    render();
  }

  if (event.target.dataset.scoreAlt) {
    const alternative = state.alternatives.find((item) => item.id === event.target.dataset.scoreAlt);
    if (alternative) alternative.scores[event.target.dataset.scoreCriterion] = event.target.value;
    render();
  }

  if (event.target.dataset.altName) {
    const alternative = state.alternatives.find((item) => item.id === event.target.dataset.altName);
    if (alternative) alternative.name = normalizeLabel(event.target.value) || 'Unnamed alternative';
    render();
  }

  if (event.target.dataset.altLevelPreset) {
    const alternative = state.alternatives.find((item) => item.id === event.target.dataset.altLevelPreset);
    if (alternative) {
      alternative.level = event.target.value === 'custom' ? '' : event.target.value;
    }
    render();
  }

  if (event.target.dataset.altLevelCustom) {
    const alternative = state.alternatives.find((item) => item.id === event.target.dataset.altLevelCustom);
    if (alternative) alternative.level = normalizeInterventionLevel(event.target.value);
    render();
  }

  if (event.target.dataset.baseAlt) {
    state.alternatives.forEach((alternative) => {
      alternative.isBaseCase = alternative.id === event.target.dataset.baseAlt;
    });
    render();
  }

  if (event.target.dataset.comparison) {
    const participant = selectedParticipant();
    participant.comparisons[event.target.dataset.comparison] = event.target.type === 'range'
      ? sliderToSaaty(event.target.value)
      : Number(event.target.value);
    participant.complete = true;
    renderParticipants();
    renderWeights();
    renderGroupWeights();
    renderRanking();
    saveState();
  }

  if (event.target.dataset.participantName) {
    const participant = state.participants.find((item) => item.id === event.target.dataset.participantName);
    if (participant) participant.name = event.target.value.trim() || 'Unnamed participant';
    renderParticipants();
    renderRanking();
    saveState();
  }

  if (event.target.id === 'weightSourceSelect') {
    state.rankingWeightSource = event.target.value;
    renderRanking();
    saveState();
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'crThresholdSlider') {
    state.crThreshold = normalizeCrThreshold(event.target.value);
    renderParticipants();
    renderWeights();
    renderGroupWeights();
    renderComparisons();
    renderRanking();
    renderCrThreshold();
    const dialog = document.querySelector('#ahpDialog');
    if (dialog?.open) renderAHPDialog(selectedParticipant());
    saveState();
  }

  if (event.target.dataset.judgement && event.target.type === 'range') {
    const participant = selectedParticipant();
    participant.judgements ||= {};
    participant.judgements[event.target.dataset.judgement] = clampPosition(event.target.value);
    participant.complete = participantAHPProfile(participant).complete;
    const current = event.target.closest('.comparison').querySelector('.saaty-current');
    current.textContent = formatPositionDetail(event.target.value, event.target.dataset.left, event.target.dataset.right);
    renderParticipants();
    renderWeights();
    renderGroupWeights();
    renderComparisons();
    renderRanking();
    updateDialogCategoryFeedback(participant, event.target.dataset.judgement.split('|')[0]);
    saveState();
  }

  if (event.target.dataset.comparison && event.target.type === 'range') {
    const value = sliderToSaaty(event.target.value);
    const participant = selectedParticipant();
    participant.comparisons[event.target.dataset.comparison] = value;
    participant.complete = true;
    const current = event.target.closest('.comparison').querySelector('.saaty-current');
    current.textContent = formatSaatyDetail(value, event.target.dataset.left, event.target.dataset.right);
    renderParticipants();
    renderWeights();
    renderGroupWeights();
    renderRanking();
    saveState();
  }

  if (event.target.id === 'socraticInput') {
    selectedParticipant().socraticInput = event.target.value;
    saveState();
  }
});

document.querySelector('#criterionForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const id = nextCriterionId();
  state.criteria.push({
    id,
    name: normalizeLabel(data.get('name')),
    unit: normalizeLabel(data.get('unit')),
    pillar: data.get('pillar'),
    direction: data.get('direction'),
    benchmarkType: data.get('benchmarkType'),
    benchmarkValue: String(data.get('benchmarkValue') || '').trim(),
    benchmark: benchmarkDisplay({
      direction: data.get('direction'),
      benchmarkType: data.get('benchmarkType'),
      benchmarkValue: String(data.get('benchmarkValue') || '').trim(),
    }),
    mandatory: false,
    baseComparison: false,
    active: true,
  });
  event.currentTarget.reset();
  render();
});

document.querySelector('#alternativeForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const levelPreset = data.get('levelPreset');
  const level = levelPreset === 'custom'
    ? normalizeLabel(data.get('levelCustom')) || 'Custom scenario'
    : normalizeInterventionLevel(levelPreset);
  const scores = {};
  for (const criterion of activeCriteria()) {
    scores[criterion.id] = String(data.get(`score-${criterion.id}`) || '').trim();
  }
  state.alternatives.push({
    id: createId('alternative'),
    name: normalizeLabel(data.get('name')) || 'Unnamed alternative',
    level,
    isBaseCase: false,
    scores,
  });
  event.currentTarget.reset();
  document.querySelector('#alternativeDialog')?.close();
  render();
});

document.querySelector('#equalWeightsButton').addEventListener('click', () => {
  const participant = selectedParticipant();
  const judgements = {};
  for (const category of activeCategories()) {
    for (const [left, right] of categoryPairs(category.criteria)) {
      judgements[judgementKey(category.id, left.id, right.id)] = 9;
    }
  }
  participant.judgements = { ...(participant.judgements || {}), ...judgements };
  participant.complete = true;
  render();
});

document.querySelector('#socraticButton').addEventListener('click', deriveSocraticWeights);
document.querySelector('#addParticipantButton').addEventListener('click', () => {
  const participant = createParticipant(`Participant ${state.participants.length + 1}`);
  state.participants.push(participant);
  state.selectedParticipantId = participant.id;
  render();
});
document.querySelector('#duplicateParticipantButton').addEventListener('click', () => {
  const current = selectedParticipant();
  const participant = createParticipant(`${current.name} copy`, current.comparisons, current.socraticInput);
  participant.judgements = structuredClone(current.judgements || {});
  participant.complete = current.complete;
  state.participants.push(participant);
  state.selectedParticipantId = participant.id;
  render();
});
document.querySelector('#rankButton').addEventListener('click', renderRanking);
document.querySelector('#benchmarkModeButton').addEventListener('click', () => {
  state.excludeBenchmarkFailures = !state.excludeBenchmarkFailures;
  renderRanking();
  saveState();
});
document.querySelector('#sampleButton').addEventListener('click', () => {
  state.criteria = structuredClone(defaultCriteria);
  const participant = createParticipant('Participant 1');
  state.participants = [participant];
  state.selectedParticipantId = participant.id;
  state.rankingWeightSource = 'group';
  state.excludeBenchmarkFailures = true;
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
