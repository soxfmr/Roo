import { ref, computed, watch } from 'vue';
import { fmt } from '../services/format.js';

export default {
  name: 'SubscriptionItem',
  props: ['sub'],
  emits: ['edit', 'move', 'disable', 'delete'],
  setup(props, { emit }) {
    const offset = ref(0);
    const open = ref(false);
    let startX = 0;
    let baseOffset = 0;
    let dragging = false;
    const actionsWidth = 204;

    function clamp(val) {
      return Math.min(0, Math.max(val, -actionsWidth));
    }

    function close() {
      open.value = false;
      offset.value = 0;
    }

    function onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      baseOffset = offset.value;
      if (event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    function onPointerMove(event) {
      if (!dragging) return;
      const delta = event.clientX - startX;
      offset.value = clamp(baseOffset + delta);
      open.value = offset.value <= -actionsWidth * 0.6;
    }

    function onPointerUp(event) {
      if (!dragging) return;
      dragging = false;
      open.value = offset.value <= -actionsWidth * 0.4;
      offset.value = open.value ? -actionsWidth : 0;
      if (event.currentTarget.releasePointerCapture) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }

    function onPointerCancel(event) {
      if (!dragging) return;
      dragging = false;
      open.value = offset.value <= -actionsWidth * 0.4;
      offset.value = open.value ? -actionsWidth : 0;
      if (event.currentTarget.releasePointerCapture) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }

    function trigger(action) {
      emit(action, props.sub);
    }

    watch(() => props.sub && props.sub.disabled, () => close());
    watch(() => props.sub && props.sub.category_id, () => close());

    const hasImage = computed(() => {
      const icon = props.sub?.icon || '';
      return typeof icon === 'string' && (icon.startsWith('data:') || icon.startsWith('http'));
    });
    const iconSrc = computed(() => (hasImage.value ? props.sub.icon : null));
    const iconText = computed(() => (hasImage.value ? '' : (props.sub?.icon || '✨')));

    const cardStyle = computed(() => ({
      touchAction: 'pan-y',
      borderColor: props.sub?.disabled ? '#d1d5db' : (props.sub?.color || '#d1d5db'),
      background: props.sub?.disabled ? '#f3f4f6' : '#ffffff',
      transform: `translateX(${offset.value}px)`,
    }));

    const showActions = computed(() => open.value || offset.value < 0);
    const disableLabel = computed(() => (props.sub && props.sub.disabled ? 'Enable' : 'Disable'));
    const displayPrice = computed(() => {
      const price = props.sub?.display_price;
      return price == null ? props.sub?.price : price;
    });

    return {
      fmt,
      cardStyle,
      showActions,
      disableLabel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      trigger,
      close,
      hasImage,
      iconSrc,
      iconText,
      displayPrice,
    };
  },
  template: `
    <div class="relative my-1">
      <div
        class="absolute inset-y-0 right-1 flex items-center transition-opacity duration-200 pr-2"
        :class="showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
      >
        <div class="flex items-center gap-2">
          <button class="w-10 h-10 rounded-full shadow flex items-center justify-center bg-emerald-200 text-emerald-700" @click.stop="trigger('edit')" aria-label="Edit">
            <i class="fa-solid fa-pen text-lg"></i>
          </button>
          <button class="w-10 h-10 rounded-full shadow flex items-center justify-center bg-sky-200 text-sky-700" @click.stop="trigger('move')" aria-label="Move">
            <i class="fa-solid fa-up-down-left-right text-lg"></i>
          </button>
          <button class="w-10 h-10 rounded-full shadow flex items-center justify-center bg-amber-200 text-amber-700" @click.stop="trigger('disable')" :aria-label="disableLabel">
            <i class="fa-solid text-lg" :class="sub.disabled ? 'fa-check' : 'fa-ban'"></i>
          </button>
          <button class="w-10 h-10 rounded-full shadow flex items-center justify-center bg-rose-200 text-rose-700" @click.stop="trigger('delete')" aria-label="Delete">
            <i class="fa-solid fa-trash text-lg"></i>
          </button>
        </div>
      </div>
      <div
        :class="['rounded-xl border will-change-transform', sub.disabled ? 'bg-gray-100 border-gray-300 text-gray-400' : 'bg-white']"
        :style="cardStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @pointerleave="onPointerCancel"
      >
        <div class="px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full border flex items-center justify-center overflow-hidden" :style="{ borderColor: sub.disabled ? '#d1d5db' : (sub.color || '#d1d5db'), background: sub.disabled ? '#e5e7eb' : '#ffffff' }">
              <img v-if="hasImage" :src="iconSrc" :alt="sub.name" class="w-full h-full object-contain" />
              <span v-else class="text-2xl leading-none" :class="sub.disabled ? 'text-gray-500' : 'text-gray-600'">{{ iconText }}</span>
            </div>
            <div class="text-base font-medium" :class="sub.disabled ? 'text-gray-400' : 'text-gray-900'">{{ sub.name }}</div>
          </div>
          <div class="text-right">
            <div class="text-base font-semibold" :class="sub.disabled ? 'text-gray-400' : 'text-gray-900'">{{ sub.currency_symbol }}{{ fmt(displayPrice) }}</div>
            <div class="text-xs tracking-wider" :class="sub.disabled ? 'text-gray-400' : 'text-gray-500'">{{ sub.period_label }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
};
