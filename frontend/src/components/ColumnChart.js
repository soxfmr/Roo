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
    <div class="w-full overflow-x-auto">
      <div class="h-48 flex items-end gap-3" :style="{ minWidth: items.length > 6 ? (items.length * 80) + 'px' : '100%' }">
        <div
          v-for="item in items"
          :key="item[labelKey]"
          class="flex flex-col items-center h-full"
          :style="{ flex: items.length <= 6 ? '1 1 0%' : '0 0 auto', minWidth: items.length > 6 ? '72px' : 'auto', width: items.length > 6 ? '72px' : 'auto' }"
        >
          <div class="relative w-full flex-1 flex items-end h-full">
            <div class="w-full rounded-t-lg" :style="{ height: (Math.max(animated[item[labelKey]] || 0, 0) / maxValue) * 100 + '%', background: item[colorKey] || '#94a3b8' }"></div>
          </div>
          <div class="mt-2 text-xs text-center text-gray-500 truncate w-full px-1">{{ item[labelKey] }}</div>
          <div class="text-xs text-gray-700 whitespace-nowrap">{{ symbol }}{{ (animated[item[labelKey]] || 0).toFixed(2) }}</div>
        </div>
      </div>
    </div>
  `,
};
