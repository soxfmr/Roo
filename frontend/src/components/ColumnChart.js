import { ref, computed, watch, onBeforeUnmount } from 'vue';

export default {
  name: 'ColumnChart',
  props: {
    items: { type: Array, default: () => [] },
    colorKey: { type: String, default: 'color' },
    labelKey: { type: String, default: 'name' },
    valueKey: { type: String, default: 'value' },
    currencySymbol: { type: String, default: '' },
  },
  setup(props) {
    const animated = ref({});
    const targetMaxValue = computed(() => {
      const values = props.items.map(it => Number(it[props.valueKey] || 0));
      return Math.max(...values, 1);
    });
    const maxValue = computed(() => {
      const animatedValues = Object.values(animated.value).map(val => Number(val) || 0);
      const animatedMax = Math.max(...animatedValues, 0);
      return Math.max(targetMaxValue.value, animatedMax, 1);
    });
    let frame = null;

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function animate() {
      if (!props.items.length) {
        animated.value = {};
        if (frame) {
          cancelAnimationFrame(frame);
          frame = null;
        }
        return;
      }
      if (frame) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      const targets = {};
      props.items.forEach(it => {
        const label = it[props.labelKey];
        targets[label] = Number(it[props.valueKey] || 0);
      });
      const startState = { ...animated.value };
      const start = performance.now();
      const duration = 620;

      const step = (now) => {
        const linear = Math.min((now - start) / duration, 1);
        const progress = easeInOut(linear);
        const next = {};
        Object.entries(targets).forEach(([label, target]) => {
          const origin = startState[label] ?? 0;
          next[label] = origin + (target - origin) * progress;
        });
        animated.value = next;
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        } else {
          frame = null;
        }
      };
      frame = requestAnimationFrame(step);
    }

    watch(() => props.items, animate, { deep: true, immediate: true });

    onBeforeUnmount(() => { if (frame) cancelAnimationFrame(frame); });

    const symbol = computed(() => props.currencySymbol || '');

    return { animated, maxValue, symbol };
  },
  template: `
    <div class="w-full">
      <div class="h-48 flex items-end gap-3">
        <div
          v-for="item in items"
          :key="item[labelKey]"
          class="flex-1 flex flex-col items-center h-full"
        >
          <div class="relative w-full flex-1 flex items-end h-full">
            <div class="w-full rounded-t-lg" :style="{ height: (Math.max(animated[item[labelKey]] || 0, 0) / maxValue) * 100 + '%', background: item[colorKey] || '#94a3b8' }"></div>
          </div>
          <div class="mt-2 text-xs text-center text-gray-500 truncate w-full">{{ item[labelKey] }}</div>
          <div class="text-xs text-gray-700">{{ symbol }}{{ (animated[item[labelKey]] || 0).toFixed(2) }}</div>
        </div>
      </div>
    </div>
  `,
};
