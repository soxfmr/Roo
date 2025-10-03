import { fmt } from '../services/format.js';

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
  name: 'MainFooter',
  props: ['summary', 'onLeft', 'onRight', 'hidden', 'animKey'],
  methods: {
    fmt,
    periodLabel,
  },
  template: `
    <footer :class="['fixed bottom-0 left-0 right-0 z-20 transition-transform duration-300', hidden ? 'translate-y-full' : 'translate-y-0']">
      <div class="h-16 bg-ioscard border-t border-gray-200 flex items-center justify-between px-4">
        <button class="text-base font-semibold" @click="onLeft">Expenses</button>
        <transition name="quickfade" mode="out-in">
          <button class="text-right" @click="onRight" :key="animKey + '-' + summary.period + '-' + (summary.total ?? 0)">
            <div class="text-base font-semibold">{{ summary.currency_symbol }}{{ fmt(summary.total || 0) }}</div>
            <div class="text-xs text-gray-500 tracking-wider uppercase">{{ periodLabel(summary.period) }}</div>
          </button>
        </transition>
      </div>
    </footer>
  `,
};
