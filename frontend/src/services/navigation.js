import { reactive } from 'vue';

export const navigation = reactive({ transition: 'fade' });

export function setNavTransition(name) {
  navigation.transition = name;
}
