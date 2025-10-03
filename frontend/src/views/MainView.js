import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { store } from '../store/index.js';
import { API } from '../services/api.js';
import { setNavTransition } from '../services/navigation.js';
import { fmt } from '../services/format.js';
import MainHeader from '../components/MainHeader.js';
import MainFooter from '../components/MainFooter.js';
import SubscriptionItem from '../components/SubscriptionItem.js';
import StatisticsSheet from '../components/StatisticsSheet.js';
import Icon from '../components/Icon.js';

const CATEGORY_SWATCHES = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

export default {
  name: 'MainView',
  components: { MainHeader, MainFooter, SubscriptionItem, Icon, StatisticsSheet },
  setup() {
    const router = useRouter();
    const st = store.state;
    const showChrome = ref(true);
    let lastY = 0;

    function onScroll(e) {
      const y = e.target.scrollTop;
      showChrome.value = y < lastY || y < 10;
      lastY = y;
    }

    function navigateSettings() {
      setNavTransition('slide-up');
      router.push('/settings');
    }

    function navigateAdd() {
      setNavTransition('slide-up');
      router.push('/new');
    }

    function selectCategory(id) {
      st.currentCategoryId = id;
      store.loadSubscriptions();
      store.loadStats();
    }

    const statsProgress = ref(0);
    const statsAnimating = ref(false);
    let frame = null;
    const footerAnimKey = ref(0);

    const showCategoryModal = ref(false);
    const newCategoryName = ref('');
    const newCategoryColor = ref('#3b82f6');
    const categorySaving = ref(false);
    const categorySwatches = CATEGORY_SWATCHES;

    const showMoveModal = ref(false);
    const moveTarget = ref(null);
    const moveCategoryId = ref('none');
    const moveSaving = ref(false);

    const statsVisible = ref(false);
    const showStatsHeader = ref(false);

    function cancelAnimation() {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    }

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function animateTo(target) {
      cancelAnimation();
      const from = statsProgress.value;
      if (from === target) {
        statsAnimating.value = false;
        statsProgress.value = target;
        return;
      }
      const start = performance.now();
      const duration = 420;
      statsAnimating.value = true;
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = easeInOut(progress);
        statsProgress.value = from + (target - from) * eased;
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        } else {
          statsAnimating.value = false;
          frame = null;
        }
      };
      frame = requestAnimationFrame(step);
    }

    function openStats() {
      statsVisible.value = true;
      showStatsHeader.value = false;
      setNavTransition('slide-up');
      requestAnimationFrame(() => animateTo(1));
    }

    function closeStats() {
      animateTo(0);
      statsVisible.value = false;
      showStatsHeader.value = false;
    }

    function cycle() {
      if (statsAnimating.value) return;
      const prev = st.period;
      store.cyclePeriod();
      const key = `${prev}-${st.period}-${Date.now()}`;
      footerAnimKey.value = key;
    }

    watch(statsProgress, (val) => {
      showStatsHeader.value = val > 0.9;
    });

    function editSubscription(sub) {
      setNavTransition('slide-up');
      router.push(`/subscriptions/${sub.id}/edit`);
    }

    function openMoveModal(sub) {
      moveTarget.value = sub;
      moveCategoryId.value = sub.category_id ?? 'none';
      showMoveModal.value = true;
    }

    async function confirmMove() {
      if (!moveTarget.value) return;
      moveSaving.value = true;
      try {
        await API.patch(`/api/subscriptions/${moveTarget.value.id}`, { category_id: moveCategoryId.value === 'none' ? null : moveCategoryId.value });
        await store.loadSubscriptions();
        showMoveModal.value = false;
      } finally {
        moveSaving.value = false;
      }
    }

    function closeMoveModal() {
      if (moveSaving.value) return;
      showMoveModal.value = false;
    }

    async function disableSubscription(sub) {
      const confirmed = window.confirm(sub.disabled ? 'Enable this subscription?' : 'Disable this subscription?');
      if (!confirmed) return;
      await API.patch(`/api/subscriptions/${sub.id}`, { disabled: !sub.disabled });
      await store.loadSubscriptions();
      await store.loadStats();
    }

    async function deleteSubscription(sub) {
      const confirmed = window.confirm('Delete this subscription?');
      if (!confirmed) return;
      await API.del(`/api/subscriptions/${sub.id}`);
      await store.loadSubscriptions();
      await store.loadStats();
    }

    const title = computed(() => {
      if (st.currentCategoryId === 'all') return 'All';
      const cat = st.categories.find(c => c.id === st.currentCategoryId);
      return cat ? cat.name : 'All';
    });

    function openCategoryModal() {
      newCategoryName.value = '';
      newCategoryColor.value = '#3b82f6';
      showCategoryModal.value = true;
    }

    function selectCategoryColor(color) {
      newCategoryColor.value = color;
    }

    function categoryColorSelected(color) {
      return (newCategoryColor.value || '').toLowerCase() === color.toLowerCase();
    }

    function closeCategoryModal() {
      if (categorySaving.value) return;
      showCategoryModal.value = false;
    }

    async function saveCategory() {
      const name = newCategoryName.value.trim().slice(0, 15);
      if (!name) return;
      newCategoryName.value = name;
      categorySaving.value = true;
      try {
        await API.post('/api/categories', { name, color: newCategoryColor.value });
        await store.loadCategories();
        showCategoryModal.value = false;
      } finally {
        categorySaving.value = false;
      }
    }

    async function removeCategory(category) {
      if (!category) return;
      const confirmed = window.confirm(`Delete category “${category.name}” and its subscriptions?`);
      if (!confirmed) return;
      await API.del(`/api/categories/${category.id}`);
      await store.loadCategories();
      await store.loadSubscriptions();
      await store.loadStats();
    }

    watch(() => st.statsSummary.total, () => {
      if (!statsVisible.value) return;
      animateTo(1);
    });

    onBeforeUnmount(cancelAnimation);

    return {
      st,
      fmt,
      showChrome,
      onScroll,
      navigateSettings,
      navigateAdd,
      selectCategory,
      openStats,
      closeStats,
      statsVisible,
      statsProgress,
      showStatsHeader,
      cycle,
      footerAnimKey,
      editSubscription,
      openMoveModal,
      disableSubscription,
      deleteSubscription,
      title,
      showCategoryModal,
      newCategoryName,
      newCategoryColor,
      categorySaving,
      categorySwatches,
      openCategoryModal,
      closeCategoryModal,
      saveCategory,
      selectCategoryColor,
      categoryColorSelected,
      removeCategory,
      showMoveModal,
      moveTarget,
      moveCategoryId,
      moveSaving,
      closeMoveModal,
      confirmMove,
    };
  },
  template: `
    <div class="h-full pb-16 bg-white">
      <MainHeader :title="title" :categories="st.categories" :currentCategoryId="st.currentCategoryId" :onSettings="navigateSettings" :onAdd="navigateAdd" :onSelectCategory="selectCategory" :onAddCategory="openCategoryModal" :onRemoveCategory="removeCategory" :hidden="!showChrome"/>
      <div class="pt-16 pb-16 overflow-y-auto" @scroll="onScroll" style="height: calc(100% - 4rem)">
        <div class="p-5 space-y-5">
          <SubscriptionItem
            v-for="s in st.subscriptions"
            :key="s.id"
            :sub="s"
            @edit="editSubscription"
            @move="openMoveModal"
            @disable="disableSubscription"
            @delete="deleteSubscription"
          />
        </div>
      </div>
      <MainFooter
        :summary="st.statsSummary"
        :onLeft="openStats"
        :onRight="cycle"
        :hidden="!showChrome"
        :anim-key="footerAnimKey"
      />
      <StatisticsSheet
        v-if="statsVisible"
        :visible="statsVisible"
        :progress="statsProgress"
        :show-header="showStatsHeader"
        @close="closeStats"
      />

      <div v-if="showCategoryModal" class="fixed inset-0 z-40 bg-black/40 flex items-end" @click.self="closeCategoryModal">
        <div class="bg-white w-full rounded-t-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="font-semibold">New Category</div>
            <button class="text-gray-500" @click="closeCategoryModal">Cancel</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-sm text-gray-500 mb-1">Name</label>
              <input v-model="newCategoryName" maxlength="15" class="w-full bg-white border border-gray-200 rounded-xl px-3 py-2" placeholder="Category name"/>
            </div>
            <div>
              <label class="block text-sm text-gray-500 mb-1">Color</label>
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  v-for="c in categorySwatches"
                  :key="c"
                  type="button"
                  class="w-8 h-8 rounded-full border border-white/40 transition"
                  :class="categoryColorSelected(c) ? '!border-[3px] !border-blue-500' : ''"
                  :style="{ background: c }"
                  @click="selectCategoryColor(c)"
                  :aria-label="'Use ' + c + ' color'"
                ></button>
                <input
                  type="color"
                  v-model="newCategoryColor"
                  class="w-10 h-10 rounded-full border border-gray-200 p-0 cursor-pointer"
                  aria-label="Choose custom color"
                />
              </div>
            </div>
          </div>
          <button class="w-full py-3 rounded-xl text-white bg-blue-600 disabled:opacity-60" :disabled="categorySaving" @click="saveCategory">Save</button>
        </div>
      </div>

      <div v-if="showMoveModal" class="fixed inset-0 z-40 bg-black/40 flex items-end" @click.self="closeMoveModal">
        <div class="bg-white w-full rounded-t-2xl p-4 space-y-4 max-h-[70%] overflow-y-auto">
          <div class="flex items-center justify-between">
            <div class="font-semibold">Move Subscription</div>
            <button class="text-gray-500" @click="closeMoveModal">Cancel</button>
          </div>
          <div v-if="moveTarget" class="text-sm text-gray-500">{{ moveTarget.name }}</div>
          <div class="space-y-2">
            <button
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border"
              :class="moveCategoryId==='none' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
              @click="moveCategoryId='none'"
            >
              <span>Uncategorized</span>
              <i class="fa-solid" :class="moveCategoryId==='none' ? 'fa-circle-dot text-blue-500' : 'fa-circle text-gray-300'"></i>
            </button>
            <button
              v-for="c in st.categories"
              :key="c.id"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border"
              :class="moveCategoryId===c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
              @click="moveCategoryId=c.id"
            >
              <div class="flex items-center gap-2">
                <span class="inline-block w-3 h-3 rounded-full" :style="{background: c.color}"></span>
                <span>{{ c.name }}</span>
              </div>
              <i class="fa-solid" :class="moveCategoryId===c.id ? 'fa-circle-dot text-blue-500' : 'fa-circle text-gray-300'"></i>
            </button>
          </div>
          <button class="w-full py-3 rounded-xl text-white bg-blue-600 disabled:opacity-60" :disabled="moveSaving" @click="confirmMove">Move</button>
        </div>
      </div>
    </div>
  `,
};
