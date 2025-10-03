import { reactive } from 'vue';
import { API } from '../services/api.js';

const state = reactive({
  profile: null,
  categories: [],
  currentCategoryId: 'all',
  subscriptions: [],
  period: 'month',
  statsSummary: { total: 0, currency_symbol: '$', period: 'month' },
});

const periodCycle = ['week', 'month', 'quarter', 'year'];

async function loadProfile() {
  state.profile = await API.get('/api/profile');
}

async function loadCategories() {
  state.categories = await API.get('/api/categories');
}

async function loadSubscriptions() {
  const params = {};
  if (state.currentCategoryId && state.currentCategoryId !== 'all') {
    params.category_id = state.currentCategoryId;
  }
  const subs = await API.get('/api/subscriptions', params);
  const active = subs.filter(s => !s.disabled);
  const disabled = subs.filter(s => s.disabled);
  state.subscriptions = [...active, ...disabled];
}

async function loadStats() {
  const params = { period: state.period };
  if (state.currentCategoryId) params.category_id = state.currentCategoryId;
  state.statsSummary = await API.get('/api/stats/summary', params);
}

function cyclePeriod() {
  const index = periodCycle.indexOf(state.period);
  state.period = periodCycle[(index + 1) % periodCycle.length];
  loadStats();
}

async function init() {
  await API.post('/api/seed', {});
  await loadProfile();
  await loadCategories();
  await loadSubscriptions();
  await loadStats();
}

export const store = {
  state,
  init,
  loadProfile,
  loadCategories,
  loadSubscriptions,
  loadStats,
  cyclePeriod,
};
