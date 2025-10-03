import { ref, onMounted, onBeforeUnmount } from 'vue';
import Icon from './Icon.js';

export default {
  name: 'MainHeader',
  props: ['title', 'onSettings', 'onAdd', 'categories', 'currentCategoryId', 'onSelectCategory', 'onAddCategory', 'onRemoveCategory', 'hidden'],
  setup(props) {
    const open = ref(false);
    const menuRef = ref(null);

    function cancelPress(timer) {
      if (timer && timer.value) {
        window.clearTimeout(timer.value);
        timer.value = null;
      }
    }

    const pressTimer = ref(null);

    function toggle() {
      open.value = !open.value;
    }

    function select(id) {
      if (pressTimer.value) {
        clearTimeout(pressTimer.value);
        pressTimer.value = null;
      }
      props.onSelectCategory && props.onSelectCategory(id);
      open.value = false;
    }

    function addCategory() {
      if (pressTimer.value) {
        clearTimeout(pressTimer.value);
        pressTimer.value = null;
      }
      props.onAddCategory && props.onAddCategory();
      open.value = false;
    }

    function startPress(category, event) {
      if (pressTimer.value) {
        clearTimeout(pressTimer.value);
        pressTimer.value = null;
      }
      if (!category || !props.onRemoveCategory) return;
      if (event && event.pointerType === 'mouse' && event.button !== 0) return;
      pressTimer.value = window.setTimeout(async () => {
        pressTimer.value = null;
        await props.onRemoveCategory(category);
        open.value = false;
      }, 650);
    }

    function onPointerCancel() {
      if (pressTimer.value) {
        clearTimeout(pressTimer.value);
        pressTimer.value = null;
      }
    }

    function onClickOutside(event) {
      if (!open.value) return;
      if (menuRef.value && !menuRef.value.contains(event.target)) {
        open.value = false;
        onPointerCancel();
      }
    }

    onMounted(() => document.addEventListener('click', onClickOutside));
    onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));

    return { open, toggle, select, addCategory, menuRef, startPress, onPointerCancel };
  },
  components: { Icon },
  template: `
  <header :class="['fixed top-0 left-0 right-0 z-20 transition-transform duration-300', hidden ? '-translate-y-full' : 'translate-y-0']">
    <div class="h-14 bg-ioscard flex items-center justify-between px-4 border-b border-gray-200">
      <button aria-label="Settings" @click="onSettings" class="p-2 text-gray-700"><Icon name="menu" class="w-7 h-7"/></button>
      <div class="relative">
        <button @click.stop="toggle" class="text-base font-semibold flex items-center gap-1">
          <span>{{ title }}</span>
          <Icon name="chevronDown" class="w-5 h-5 transition-transform duration-200" :class="open ? 'rotate-180' : ''"/>
        </button>
        <transition name="dropdown">
          <div v-if="open" ref="menuRef" class="absolute mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl border border-gray-200 shadow-lg w-60 overflow-hidden">
            <div class="py-2">
              <div class="space-y-0">
                <div class="mx-3 border-b border-gray-200">
                  <button
                    class="relative w-full px-2 py-2 text-sm flex items-center justify-center"
                    :class="currentCategoryId === 'all' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700'"
                    @click="select('all')"
                  >
                    <span class="flex items-center gap-3">
                      <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                      <span class="truncate text-center">All</span>
                    </span>
                    <i
                      v-if="currentCategoryId === 'all'"
                      class="fa-solid fa-check text-xs text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    ></i>
                  </button>
                </div>
                <div
                  v-for="c in categories"
                  :key="c.id"
                  class="mx-3 border-b border-gray-200"
                >
                  <button
                    class="relative w-full px-2 py-2 text-sm flex items-center justify-center"
                    :class="currentCategoryId === c.id ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-700'"
                    @click="select(c.id)"
                    @pointerdown="startPress(c, $event)"
                    @pointerup="onPointerCancel"
                    @pointerleave="onPointerCancel"
                    @pointercancel="onPointerCancel"
                  >
                    <span class="flex items-center gap-3">
                      <span class="w-2.5 h-2.5 rounded-full" :style="{background: c.color || '#6b7280'}"></span>
                      <span class="truncate text-center">{{ c.name }}</span>
                    </span>
                    <i
                      v-if="currentCategoryId === c.id"
                      class="fa-solid fa-check text-xs text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    ></i>
                  </button>
                </div>
              </div>
              <div class="mx-3 pt-2">
                <button class="w-full flex items-center justify-center px-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" @click="addCategory">
                  <i class="fa-solid fa-circle-plus text-base"></i>
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
      <button aria-label="Add" @click="onAdd" class="p-2 text-gray-700"><Icon name="plus" class="w-7 h-7"/></button>
    </div>
  </header>
  `,
};
