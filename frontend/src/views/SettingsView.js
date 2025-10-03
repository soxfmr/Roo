import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.js';
import { store } from '../store/index.js';
import { API } from '../services/api.js';
import { setNavTransition } from '../services/navigation.js';

const currencies = [
  { code: 'USD', name: 'United States', flag: '🇺🇸' },
  { code: 'EUR', name: 'European Union', flag: '🇪🇺' },
  { code: 'JPY', name: 'Japan', flag: '🇯🇵' },
  { code: 'GBP', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CNY', name: 'China', flag: '🇨🇳' },
  { code: 'AUD', name: 'Australia', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canada', flag: '🇨🇦' },
  { code: 'INR', name: 'India', flag: '🇮🇳' },
];

export default {
  name: 'SettingsView',
  components: { Icon },
  setup() {
    const st = store.state;
    const router = useRouter();
    const showCurrency = ref(false);
    const currencyFilter = ref('');

    const filteredCurrencies = computed(() => {
      const term = currencyFilter.value.trim().toLowerCase();
      if (!term) return currencies;
      return currencies.filter(c => c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term));
    });

    function back() {
      setNavTransition('slide-left');
      router.back();
    }

    async function setCurrency(code) {
      await API.put('/api/profile', { default_currency: code });
      await store.loadProfile();
      await store.loadStats();
      showCurrency.value = false;
    }

    async function toggleNotifications() {
      await API.put('/api/profile', { notifications_enabled: !st.profile?.notifications_enabled });
      await store.loadProfile();
    }

    function openExchange() {
      setNavTransition('slide-up');
      router.push('/settings/exchange');
    }

    function openProfile() {
      setNavTransition('slide-up');
      router.push('/settings/profile');
    }

    function logout() {
      console.warn('Logout not implemented');
    }

    return {
      st,
      showCurrency,
      currencyFilter,
      filteredCurrencies,
      back,
      setCurrency,
      toggleNotifications,
      openExchange,
      openProfile,
      logout,
    };
  },
  template: `
    <div class="fixed inset-0 z-30 bg-white flex flex-col">
      <div class="h-14 bg-ioscard flex items-center justify-between px-2 border-b border-gray-200">
        <button class="p-2" @click="back"><Icon name=\"back\" class="w-7 h-7"/></button>
        <div class="font-semibold">Settings</div>
        <div class="w-9"></div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="p-4 space-y-4">
          <div class="bg-white rounded-2xl border border-gray-200 divide-y">
            <button class="w-full flex items-center justify-between px-4 py-4" @click="openProfile">
              <span>Profile</span>
              <span class="text-gray-500">{{ st.profile?.username }}</span>
            </button>
            <button class="w-full flex items-center justify-between px-4 py-4" @click="showCurrency=true">
              <span>Default Currency</span>
              <span class="text-gray-500">{{ st.profile?.default_currency }}</span>
            </button>
            <button class="w-full flex items-center justify-between px-4 py-4" @click="openExchange">
              <span>Currency Exchange</span>
              <span class="text-gray-500">Manage</span>
            </button>
            <button class="w-full flex items-center justify-between px-4 py-4" @click="toggleNotifications">
              <span>Notification</span>
              <span class="text-gray-500">{{ st.profile?.notifications_enabled ? 'On' : 'Off' }}</span>
            </button>
          </div>
          <button class="w-full py-3 bg-red-500 text-white rounded-xl mt-5" @click="logout">Logout</button>
        </div>
      </div>

      <div v-if="showCurrency" class="fixed inset-0 z-40 bg-black/40 flex items-end">
        <div class="bg-white w-full rounded-t-2xl p-4 max-h-[80%] overflow-y-auto">
          <div class="flex items-center gap-2 mb-3">
            <input v-model="currencyFilter" placeholder="Search currency" class="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2"/>
            <button class="px-3 py-2" @click="showCurrency=false">Close</button>
          </div>
          <div class="divide-y">
            <button
              v-for="c in filteredCurrencies"
              :key="c.code"
              class="w-full text-left px-2 py-3 flex items-center gap-3"
              @click="setCurrency(c.code)"
            >
              <span class="text-xl">{{ c.flag }}</span>
              <div>
                <div class="font-medium">{{ c.code }}</div>
                <div class="text-xs text-gray-500">{{ c.name }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};
