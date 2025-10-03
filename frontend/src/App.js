import { ref, computed, onMounted } from 'vue';
import { store } from './store/index.js';
import { navigation } from './services/navigation.js';

export default {
  name: 'AppRoot',
  setup() {
    const ready = ref(false);
    const transitionName = computed(() => navigation.transition || 'fade');
    onMounted(async () => {
      await store.init();
      ready.value = true;
    });
    return { ready, transitionName };
  },
  template: `
    <div class="h-full">
      <div v-if="ready" class="h-full">
        <router-view v-slot="{ Component, route }">
          <transition :name="transitionName" mode="out-in">
            <component :is="Component" :key="route.fullPath"></component>
          </transition>
        </router-view>
      </div>
      <div v-else class="h-full flex items-center justify-center text-gray-500">Loading…</div>
    </div>
  `,
};
