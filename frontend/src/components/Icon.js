import { h } from 'vue';

const paths = {
  menu: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v12m6-6H6"/>',
  back: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7"/>',
  chevronDown: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7"/>',
  delete: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 7h12M9 7V5a3 3 0 013-3h0a3 3 0 013 3v2m-9 0l1 12a3 3 0 003 3h2a3 3 0 003-3l1-12"/>',
  save: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"/>',
  edit: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.862 4.487a2.25 2.25 0 013.182 3.182l-9.546 9.546a1.5 1.5 0 01-.53.352l-3.177 1.058a.75.75 0 01-.948-.948l1.058-3.177a1.5 1.5 0 01.352-.53l9.546-9.546z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 13.5V18a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 18v-9A1.5 1.5 0 017.5 7.5H12"/>',
  disable: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3.75a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.47 5.47l13.06 13.06"/>',
};

export default {
  name: 'Icon',
  props: ['name', 'class'],
  setup(props) {
    return () => h(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        fill: 'none',
        viewBox: '0 0 24 24',
        stroke: 'currentColor',
        class: props.class || 'w-6 h-6',
      },
      [h('g', { innerHTML: paths[props.name] || '' })],
    );
  },
};
