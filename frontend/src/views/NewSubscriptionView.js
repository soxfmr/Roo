import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DropdownField from '../components/DropdownField.js';
import Icon from '../components/Icon.js';
import { store } from '../store/index.js';
import { API } from '../services/api.js';
import { setNavTransition } from '../services/navigation.js';

const swatches = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

export default {
  name: 'NewSubscriptionView',
  components: { DropdownField, Icon },
  setup() {
    const st = store.state;
    const route = useRoute();
    const router = useRouter();

    const createBaseForm = () => ({
      name: '',
      icon: '✨',
      color: '#3b82f6',
      logo_url: '',
      category_id: null,
      price: '',
      currency: null,
      frequency: 1,
      cycle: 'month',
      start_date: new Date().toISOString().slice(0, 10),
      trial_enabled: false,
      trial_price: '',
      trial_use_main_cycle: true,
      trial_frequency: 1,
      trial_cycle: 'month',
      trial_end_date: '',
      notify_enabled: false,
      remind_value: 1,
      remind_unit: 'days',
    });

    const form = reactive(createBaseForm());
    const showMore = ref(false);
    const saving = ref(false);
    const faviconLoading = ref(false);
    const faviconError = ref('');
    const manualColorOverride = ref(false);
    let skipLogoWatch = false;
    let faviconTimer = null;
    let faviconAbort = null;

    const categoryOptions = computed(() => {
      const items = [{ label: 'None', value: null, color: '#9ca3af' }];
      st.categories.forEach(c => items.push({ label: c.name, value: c.id, color: c.color }));
      return items;
    });

    const cycleOptions = [
      { label: 'day(s)', value: 'day' },
      { label: 'week(s)', value: 'week' },
      { label: 'month(s)', value: 'month' },
      { label: 'quarter(s)', value: 'quarter' },
      { label: 'year(s)', value: 'year' },
    ];

    const remindUnitOptions = [
      { label: 'day(s)', value: 'days' },
      { label: 'week(s)', value: 'weeks' },
    ];

    const previewIsImage = computed(() => typeof form.icon === 'string' && (form.icon.startsWith('data:') || form.icon.startsWith('http')));
    const previewIconText = computed(() => {
      if (previewIsImage.value) return '';
      if (form.icon && form.icon !== '✨') return form.icon;
      if (form.name && form.name.trim()) return form.name.trim().charAt(0).toUpperCase();
      return form.icon || '✨';
    });

    const canSubmit = computed(() => {
      const hasName = !!(form.name && form.name.trim());
      const priceValue = form.price === '' ? NaN : Number(form.price);
      const validPrice = !Number.isNaN(priceValue);
      return hasName && validPrice && !saving.value;
    });

    function clearFaviconTimer() {
      if (faviconTimer) {
        clearTimeout(faviconTimer);
        faviconTimer = null;
      }
    }

    function cancelFaviconRequest() {
      if (faviconAbort) {
        faviconAbort.abort();
        faviconAbort = null;
      }
    }

    function scheduleFaviconFetch(url) {
      clearFaviconTimer();
      faviconError.value = '';
      if (!url || !url.trim()) {
        cancelFaviconRequest();
        return;
      }
      const target = url.trim();
      faviconTimer = window.setTimeout(async () => {
        faviconTimer = null;
        cancelFaviconRequest();
        const controller = new AbortController();
        faviconAbort = controller;
        faviconLoading.value = true;
        try {
          const data = await API.post('/api/favicon', { url: target, fallback_color: form.color });
          if (data.favicon_data) {
            form.icon = data.favicon_data;
          }
          if (data.normalized_url) {
            skipLogoWatch = true;
            form.logo_url = data.normalized_url;
          }
          if (data.color && !manualColorOverride.value) {
            form.color = data.color;
          }
          faviconError.value = '';
        } catch (err) {
          if (err.name === 'AbortError') return;
          const key = err.message;
          if (key === 'invalid_url') {
            faviconError.value = 'Enter a valid URL.';
          } else if (key === 'fetch_failed') {
            faviconError.value = 'Unable to load favicon.';
          } else {
            faviconError.value = key || 'Unable to load favicon.';
          }
        } finally {
          faviconAbort = null;
          faviconLoading.value = false;
        }
      }, 500);
    }

    watch(() => form.logo_url, (val) => {
      if (skipLogoWatch) {
        skipLogoWatch = false;
        return;
      }
      scheduleFaviconFetch(val);
    });

    watch(() => form.color, (val, old) => {
      if (val !== old) {
        manualColorOverride.value = true;
      }
    });

    const isSelected = (c) => form.color?.toLowerCase() === c.toLowerCase();

    function setColor(color) {
      manualColorOverride.value = true;
      form.color = color;
    }

    function onColorInput(event) {
      manualColorOverride.value = true;
      form.color = event.target.value;
    }

    const editingId = computed(() => route.params.id);
    const isEditing = computed(() => !!editingId.value);

    async function hydrate() {
      if (!isEditing.value) {
        Object.assign(form, createBaseForm());
        return;
      }
      const data = await API.get(`/api/subscriptions/${editingId.value}`);
      const hasExistingIcon = Boolean(data.icon && data.icon !== '✨');
      if (hasExistingIcon) {
        skipLogoWatch = true;
      }
      Object.assign(form, createBaseForm(), data, {
        price: data.price != null ? String(data.price) : '',
        trial_price: data.trial_price != null ? String(data.trial_price) : '',
      });
      manualColorOverride.value = true;
      showMore.value = form.notify_enabled || form.trial_enabled;
    }

    onBeforeUnmount(() => {
      clearFaviconTimer();
      cancelFaviconRequest();
    });

    watch(() => route.fullPath, hydrate, { immediate: true });

    async function submit() {
      if (!canSubmit.value) return;
      saving.value = true;
      const payload = {
        ...form,
        price: Number(form.price || 0),
        trial_price: form.trial_price === '' ? null : Number(form.trial_price),
        category_id: form.category_id,
        frequency: Number(form.frequency || 1),
        trial_frequency: form.trial_frequency === '' ? null : Number(form.trial_frequency || 1),
      };
      try {
        if (isEditing.value) {
          await API.put(`/api/subscriptions/${editingId.value}`, payload);
        } else {
          await API.post('/api/subscriptions', payload);
        }
        await store.loadSubscriptions();
        await store.loadStats();
        setNavTransition('slide-left');
        router.back();
      } finally {
        saving.value = false;
      }
    }

    function goBack() {
      setNavTransition('slide-left');
      router.back();
    }

    function toggleMore() {
      showMore.value = !showMore.value;
    }

    const showLogoModal = ref(false);
    const logoUrlDraft = ref('');
    const logoInputRef = ref(null);

    function openLogoModal() {
      logoUrlDraft.value = form.logo_url || '';
      showLogoModal.value = true;
      nextTick(() => {
        if (logoInputRef.value) {
          logoInputRef.value.focus();
        }
      });
    }

    function closeLogoModal() {
      showLogoModal.value = false;
    }

    function applyLogo() {
      form.logo_url = logoUrlDraft.value.trim();
      showLogoModal.value = false;
    }

    const titleText = computed(() => (isEditing.value ? 'Edit Subscription' : 'New Subscription'));

    return {
      st,
      form,
      showMore,
      swatches,
      saving,
      faviconLoading,
      faviconError,
      manualColorOverride,
      categoryOptions,
      cycleOptions,
      remindUnitOptions,
      previewIsImage,
      previewIconText,
      canSubmit,
      setColor,
      onColorInput,
      submit,
      goBack,
      isSelected,
      isEditing,
      titleText,
      toggleMore,
      showLogoModal,
      openLogoModal,
      closeLogoModal,
      applyLogo,
      logoUrlDraft,
      logoInputRef,
    };
  },
  template: `
    <div class="fixed inset-0 z-30 bg-white flex flex-col">
      <div class="h-14 bg-ioscard flex items-center justify-between px-2 border-b border-gray-200">
        <button class="p-2" @click="goBack"><Icon name="back" class="w-7 h-7"/></button>
        <div class="font-semibold">{{ titleText }}</div>
        <button
          class="p-2 transition"
          :class="canSubmit ? 'text-green-600' : 'text-gray-300 cursor-not-allowed'"
          :disabled="!canSubmit"
          @click="submit"
          aria-label="Save"
        >
          <Icon name="save" class="w-7 h-7"/>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div class="rounded-2xl border border-gray-200 p-6 flex flex-col items-center text-center gap-4" :style="{ background: form.color ? form.color + '40' : '#f3f4f6' }">
          <button type="button" class="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center overflow-hidden my-5 bg-white/30" @click="openLogoModal">
            <img v-if="previewIsImage" :src="form.icon" alt="Subscription logo" class="w-full h-full object-contain" />
            <span v-else class="text-3xl leading-none text-white">{{ previewIconText }}</span>
          </button>
          <div v-if="faviconLoading" class="text-xs text-gray-500">Fetching favicon…</div>
          <div v-else-if="faviconError" class="text-xs text-rose-500">{{ faviconError }}</div>
          <div class="flex items-center justify-center gap-2 flex-wrap w-full">
            <button
              v-for="c in swatches"
              :key="c"
              class="w-5 h-5 rounded-full transition-all border border-white/40"
              :class="isSelected(c) ? '!border-[3px] !border-white' : ''"
              :style="{ background: c }"
              @click="setColor(c)"
            ></button>
            <input
              type="color"
              v-model="form.color"
              @input="onColorInput"
              aria-label="Choose custom color"
              class="w-9 h-9 rounded-full p-0 cursor-pointer bg-transparent outline-none"
            />
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white">
          <div class="divide-y divide-gray-100">
            <div class="flex items-center justify-between px-4 py-3">
              <div class="text-gray-600">Name</div>
              <input v-model="form.name" placeholder="Subscription name" class="text-right outline-none"/>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div class="text-gray-600">Category</div>
              <DropdownField v-model="form.category_id" :options="categoryOptions" class="min-w-[150px]" />
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div class="text-gray-600">Price</div>
              <input v-model="form.price" type="number" inputmode="decimal" placeholder="0.00" class="text-right outline-none w-24"/>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div class="text-gray-600">Currency</div>
              <input v-model="form.currency" placeholder="USD" class="text-right outline-none w-20 uppercase"/>
            </div>
            <div class="flex items-center justify-between px-4 py-3 gap-3">
              <div class="text-gray-600">Cycle</div>
              <div class="flex items-center gap-3">
                <input v-model.number="form.frequency" type="number" min="1" class="text-right outline-none w-16"/>
                <DropdownField v-model="form.cycle" :options="cycleOptions" class="min-w-[120px]" />
              </div>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div class="text-gray-600">Start Date</div>
              <input v-model="form.start_date" type="date" class="text-right outline-none bg-white"/>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div class="text-gray-600">Trial</div>
              <button @click="form.trial_enabled=!form.trial_enabled" :class="['toggle', form.trial_enabled ? 'on':'']"></button>
            </div>
            <template v-if="form.trial_enabled">
              <div class="flex items-center justify-between px-4 py-3">
                <div class="text-gray-600">Trial Price</div>
                <input v-model="form.trial_price" type="number" inputmode="decimal" placeholder="0.00" class="text-right outline-none w-24"/>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <div class="text-gray-600">Use Main Cycle</div>
                <button @click="form.trial_use_main_cycle=!form.trial_use_main_cycle" :class="['toggle', form.trial_use_main_cycle ? 'on':'']"></button>
              </div>
              <template v-if="!form.trial_use_main_cycle">
                <div class="flex items-center justify-between px-4 py-3 gap-3">
                  <div class="text-gray-600">Trial Cycle</div>
                  <div class="flex items-center gap-3">
                    <input v-model.number="form.trial_frequency" type="number" min="1" class="text-right outline-none w-16"/>
                    <DropdownField v-model="form.trial_cycle" :options="cycleOptions" class="min-w-[120px]" />
                  </div>
                </div>
              </template>
              <div class="flex items-center justify-between px-4 py-3">
                <div class="text-gray-600">Trial End Date</div>
                <input v-model="form.trial_end_date" type="date" class="text-right outline-none bg-white"/>
              </div>
            </template>
          </div>
        </div>

        <div>
          <button class="text-blue-600 font-medium" @click="toggleMore">{{ showMore ? 'Hide options' : 'More options' }}</button>
        </div>

        <transition name="dropdown">
          <div v-if="showMore" class="rounded-2xl border border-gray-200 bg-white">
            <div class="divide-y divide-gray-100">
              <div class="flex items-center justify-between px-4 py-3">
                <div class="text-gray-600">Notify</div>
                <button @click="form.notify_enabled=!form.notify_enabled" :class="['toggle', form.notify_enabled ? 'on':'']"></button>
              </div>
              <div class="flex items-center justify-between px-4 py-3" v-if="form.notify_enabled">
                <div class="text-gray-600">Remind Me</div>
                <div class="flex items-center gap-3">
                  <input v-model.number="form.remind_value" type="number" min="1" class="text-right outline-none w-16"/>
                  <DropdownField v-model="form.remind_unit" :options="remindUnitOptions" class="min-w-[120px]" />
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <div v-if="showLogoModal" class="fixed inset-0 z-40 bg-black/40 flex items-center justify-center" @click.self="closeLogoModal">
        <div class="bg-white rounded-2xl p-5 w-11/12 max-w-md space-y-4">
          <div class="text-base font-semibold">Website URL</div>
          <input
            ref="logoInputRef"
            v-model="logoUrlDraft"
            placeholder="https://example.com"
            class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2"
          />
          <div class="flex justify-end gap-3">
            <button class="px-4 py-2 text-gray-500" @click="closeLogoModal">Cancel</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded-xl" @click="applyLogo">OK</button>
          </div>
        </div>
      </div>
    </div>
  `,
};
