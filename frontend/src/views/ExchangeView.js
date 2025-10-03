import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.js';
import { store } from '../store/index.js';
import { API } from '../services/api.js';
import { setNavTransition } from '../services/navigation.js';

export default {
  name: 'ExchangeView',
  components: { Icon },
  setup() {
    const router = useRouter();
    const st = store.state;
    const rows = ref([]);
    const base = ref('');
    const target = ref('');
    const rate = ref('1');

    async function load() {
      rows.value = await API.get('/api/exchange');
    }

    async function save() {
      await API.post('/api/exchange', {
        base: base.value || st.profile.default_currency,
        target: target.value,
        rate: parseFloat(rate.value || '1'),
      });
      await load();
    }

    function goBack() {
      setNavTransition('slide-left');
      router.back();
    }

    onMounted(load);

    return { st, rows, base, target, rate, save, goBack };
  },
  template: `
    <div class="fixed inset-0 z-30 bg-white flex flex-col">
      <div class="h-14 bg-ioscard flex items-center justify-between px-2 border-b border-gray-200">
        <button class="p-2" @click="goBack"><Icon name=\"back\" class="w-7 h-7"/></button>
        <div class="font-semibold">Currency Exchange</div>
        <div class="w-9"></div>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <div class="text-sm text-gray-500">Create or update rates relative to default currency.</div>
          <div class="grid grid-cols-3 gap-2">
            <input v-model="base" placeholder="Base (e.g., USD)" class="bg-white border border-gray-200 rounded-xl px-3 py-2 uppercase"/>
            <input v-model="target" placeholder="Target (e.g., EUR)" class="bg-white border border-gray-200 rounded-xl px-3 py-2 uppercase"/>
            <input v-model="rate" type="number" step="0.0001" placeholder="Rate" class="bg-white border border-gray-200 rounded-xl px-3 py-2"/>
          </div>
          <button @click="save" class="px-4 py-2 bg-blue-600 text-white rounded-xl">Save</button>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white">
          <div class="divide-y">
            <div v-for="r in rows" :key="r.id" class="px-4 py-3 flex items-center justify-between">
              <div>{{ r.base }} → {{ r.target }}</div>
              <div>{{ r.rate }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};
