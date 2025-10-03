import { ref, computed, watch, onBeforeUnmount } from 'vue';

export default {
  name: 'DonutChart',
  props: {
    items: { type: Array, default: () => [] },
    currencySymbol: { type: String, default: '' },
  },
  setup(props) {
    const animationSegments = ref([]);
    let frame = null;

    function buildTargets() {
      const total = props.items.reduce((a, b) => a + (b.value || 0), 0);
      if (total <= 0) return [];
      let cumulative = 0;
      return props.items
        .filter(it => (it.value || 0) > 0)
        .map(it => {
          const pct = (it.value / total) * 100;
          const start = cumulative;
          cumulative += pct;
          return { color: it.color, start, end: cumulative };
        });
    }

    function segmentsAtProgress(targets, coverage) {
      if (!targets.length) return [];
      const result = [];
      targets.forEach(seg => {
        if (coverage <= seg.start) return;
        const end = Math.min(seg.end, coverage);
        result.push({ color: seg.color, start: seg.start, end });
      });
      return result;
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate() {
      const targets = buildTargets();
      if (!targets.length) {
        animationSegments.value = [];
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
      const start = performance.now();
      const duration = 620;

      const step = (now) => {
        const linear = Math.min((now - start) / duration, 1);
        const eased = easeOutCubic(linear);
        const coverage = eased * 100;
        animationSegments.value = segmentsAtProgress(targets, coverage);
        if (linear < 1) {
          frame = requestAnimationFrame(step);
        } else {
          frame = null;
          animationSegments.value = segmentsAtProgress(targets, 100);
        }
      };
      frame = requestAnimationFrame(step);
    }

    watch(() => props.items, animate, { deep: true, immediate: true });

    onBeforeUnmount(() => { if (frame) cancelAnimationFrame(frame); });

    const gradient = computed(() => {
      if (!animationSegments.value.length) return '#e5e7eb';
      const stops = animationSegments.value.map(seg => {
        const startDeg = (seg.start / 100) * 360;
        const endDeg = (seg.end / 100) * 360;
        return `${seg.color} ${startDeg}deg ${endDeg}deg`;
      });
      const lastEnd = animationSegments.value[animationSegments.value.length - 1].end;
      if (lastEnd < 100) {
        const lastDeg = (lastEnd / 100) * 360;
        stops.push(`#e5e7eb ${lastDeg}deg 360deg`);
      }
      return `conic-gradient(${stops.join(', ')})`;
    });

    const symbol = computed(() => props.currencySymbol || '');

    return { gradient, symbol, items: props.items };
  },
  template: `
    <div class="flex flex-col items-center">
      <div class="relative w-40 h-40">
        <div class="w-full h-full rounded-full" :style="{ background: gradient }"></div>
        <div class="absolute inset-6 bg-white rounded-full"></div>
      </div>
      <div class="mt-3 space-y-1 w-full">
        <div v-for="it in items" :key="it.name" class="flex items-center gap-2 text-sm">
          <span class="inline-block w-3 h-3 rounded-full" :style="{background: it.color}"></span>
          <span class="flex-1">{{ it.name }}</span>
          <span>{{ symbol }}{{ it.value.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  `,
};
