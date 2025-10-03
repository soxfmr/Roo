import { ref, computed, watch } from 'vue';
import Icon from './Icon.js';
import DonutChart from './DonutChart.js';
import ColumnChart from './ColumnChart.js';
import { store } from '../store/index.js';
import { API } from '../services/api.js';

function periodLabel(period) {
  switch (period) {
    case 'week':
      return 'WEEKLY';
    case 'month':
      return 'MONTHLY';
    case 'quarter':
      return 'QUARTERLY';
    case 'year':
      return 'YEARLY';
    default:
      return String(period).toUpperCase();
  }
}

export default {
  name: 'StatisticsSheet',
  props: {
    visible: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    showHeader: { type: Boolean, default: true },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const st = store.state;
    const tab = ref('all');
    const subCategoryId = ref('all');
    const periodTab = ref(st.period);
    const itemsAll = ref([]);
    const itemsByCat = ref([]);
    const currencySymbol = ref(st.statsSummary?.currency_symbol || '$');
    const loading = ref(false);
    let activeRequest = null;

    async function load() {
      const token = Symbol('stats');
      activeRequest = token;
      loading.value = true;
      try {
        const summaryParams = { period: periodTab.value, category_id: subCategoryId.value };
        const sum = await API.get('/api/stats/summary', summaryParams);
        if (activeRequest !== token) return;
        itemsAll.value = (sum.breakdown || []).map(b => ({ name: b.name, color: b.color, value: b.value }));
        currencySymbol.value = sum.currency_symbol || currencySymbol.value || '$';
        const byc = await API.get('/api/stats/by-category', { period: periodTab.value });
        if (activeRequest !== token) return;
        itemsByCat.value = (byc.items || []).map(i => ({ name: i.name, color: i.color, value: i.value }));
        if (byc.currency_symbol) currencySymbol.value = byc.currency_symbol;
      } finally {
        if (activeRequest === token) {
          loading.value = false;
        }
      }
    }

    watch(() => props.visible, (vis) => {
      if (vis) {
        periodTab.value = st.period;
        load();
      }
    }, { immediate: true });

    watch(() => st.period, (val) => {
      if (!props.visible) return;
      periodTab.value = val;
      load();
    });

    watch(() => st.statsSummary.total, () => {
      if (!props.visible) return;
      load();
    });

    watch([tab, periodTab, subCategoryId], () => {
      if (!props.visible) return;
      load();
    });

    function close() {
      emit('close');
    }

    function setPeriod(p) {
      periodTab.value = p;
    }

    const totalAll = computed(() => itemsAll.value.reduce((a, b) => a + b.value, 0));
    const totalByCat = computed(() => itemsByCat.value.reduce((a, b) => a + b.value, 0));

    const sheetStyle = computed(() => ({
      transform: `translateY(${(1 - Math.max(0, Math.min(props.progress, 1))) * 100}%)`,
      pointerEvents: props.visible ? 'auto' : 'none',
    }));

    return {
      st,
      tab,
      subCategoryId,
      periodTab,
      itemsAll,
      itemsByCat,
      currencySymbol,
      totalAll,
      totalByCat,
      periodLabel,
      sheetStyle,
      close,
      setPeriod,
      loading,
    };
  },
  components: { Icon, DonutChart, ColumnChart },
  template: `
    <div class="fixed inset-0 z-30 flex flex-col bg-white rounded-t-3xl shadow-xl" :style="sheetStyle">
      <div v-if="showHeader" class="h-14 bg-ioscard flex items-center justify-between px-2 border-b border-gray-200 rounded-t-3xl">
        <button class="p-2" @click="close"><Icon name="back" class="w-7 h-7"/></button>
        <div class="font-semibold">Statistics</div>
        <div class="w-9"></div>
      </div>

      <div :class="['flex-1 overflow-y-auto p-4 space-y-4', showHeader ? '' : 'pt-6']">
        <div class="segmented w-full">
          <button :class="tab==='all' ? 'active' : ''" @click="tab='all'">All</button>
          <button :class="tab==='bycat' ? 'active' : ''" @click="tab='bycat'">by Categories</button>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
          <div class="text-base font-semibold">Expenses</div>
          <div class="text-right">
            <div class="text-base font-semibold">{{ currencySymbol }}{{ (tab==='all'? totalAll : totalByCat).toFixed(2) }}</div>
            <div class="text-xs text-gray-500 tracking-wider uppercase">{{ periodLabel(periodTab) }}</div>
          </div>
        </div>

        <div v-if="tab==='all'" class="">
          <label class="block text-sm text-gray-500 mb-1">Category</label>
          <select v-model="subCategoryId" class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-right">
            <option value="all">All</option>
            <option v-for="c in st.categories" :value="c.id" :key="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div class="segmented w-full">
          <button :class="periodTab==='week' ? 'active' : ''" @click="setPeriod('week')">Weekly</button>
          <button :class="periodTab==='month' ? 'active' : ''" @click="setPeriod('month')">Monthly</button>
          <button :class="periodTab==='quarter' ? 'active' : ''" @click="setPeriod('quarter')">Quarterly</button>
          <button :class="periodTab==='year' ? 'active' : ''" @click="setPeriod('year')">Yearly</button>
        </div>

        <div v-if="tab==='all'" class="bg-white rounded-2xl border border-gray-200 p-4">
          <ColumnChart :items="itemsAll" color-key="color" label-key="name" value-key="value" :currency-symbol="currencySymbol"/>
        </div>

        <div v-else class="space-y-4">
          <div class="bg-white rounded-2xl border border-gray-200 p-4">
            <DonutChart :items="itemsByCat" :currency-symbol="currencySymbol"/>
          </div>
          <div class="bg-white rounded-2xl border border-gray-200 p-4">
            <ColumnChart :items="itemsByCat" color-key="color" label-key="name" value-key="value" :currency-symbol="currencySymbol"/>
          </div>
        </div>
      </div>
    </div>
  `,
};
