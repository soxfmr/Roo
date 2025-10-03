import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

export default {
  name: 'DropdownField',
  props: {
    modelValue: { default: null },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: 'Select' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const open = ref(false);
    const triggerRef = ref(null);
    const menuRef = ref(null);
    const selected = computed(() => props.options.find(opt => opt.value === props.modelValue));

    function close() {
      open.value = false;
    }

    function toggle() {
      if (props.disabled) return;
      open.value = !open.value;
    }

    function selectOption(option) {
      emit('update:modelValue', option.value);
      close();
    }

    function onClickOutside(event) {
      if (!open.value) return;
      const targets = [triggerRef.value, menuRef.value];
      if (targets.some(el => el && el.contains(event.target))) return;
      close();
    }

    onMounted(() => document.addEventListener('click', onClickOutside));
    onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));

    watch(() => props.disabled, (val) => { if (val) close(); });
    watch(() => props.options, (opts) => {
      if (!opts.some(opt => opt.value === props.modelValue)) {
        emit('update:modelValue', null);
      }
    });

    return { open, toggle, selectOption, selected, triggerRef, menuRef };
  },
  template: `
    <div class="relative inline-flex min-w-[110px]">
      <button
        type="button"
        ref="triggerRef"
        class="w-full flex items-center justify-end gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-xl bg-white"
        :class="disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'"
        @click="toggle"
      >
        <span class="truncate text-right">{{ selected ? selected.label : placeholder }}</span>
        <i class="fa-solid fa-chevron-down text-xs text-gray-400"></i>
      </button>
      <transition name="dropdown">
        <div v-if="open" ref="menuRef" class="absolute right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-20 min-w-full overflow-hidden">
          <button
            v-for="option in options"
            :key="String(option.value ?? 'null')"
            class="w-full flex items-center justify-end gap-2 px-3 py-2 text-sm hover:bg-gray-100"
            @click="selectOption(option)"
          >
            <span class="flex items-center gap-2 justify-end text-right">
              <span v-if="option.color" class="w-2.5 h-2.5 rounded-full" :style="{ background: option.color }"></span>
              <span class="truncate">{{ option.label }}</span>
            </span>
            <i v-if="selected && selected.value === option.value" class="fa-solid fa-check text-xs text-gray-500"></i>
          </button>
        </div>
      </transition>
    </div>
  `,
};
