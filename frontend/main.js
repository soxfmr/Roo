import { createApp } from 'vue';
import App from './src/App.js';
import { router } from './src/router/index.js';
import { navigation } from './src/services/navigation.js';

router.afterEach(() => {
  navigation.transition = 'fade';
});

createApp(App)
  .use(router)
  .mount('#app');
