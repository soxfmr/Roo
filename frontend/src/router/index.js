import { createRouter, createWebHashHistory } from 'vue-router';
import MainView from '../views/MainView.js';
import NewSubscriptionView from '../views/NewSubscriptionView.js';
import SettingsView from '../views/SettingsView.js';
import ProfileView from '../views/ProfileView.js';
import ExchangeView from '../views/ExchangeView.js';

const routes = [
  { path: '/', component: MainView },
  { path: '/new', component: NewSubscriptionView },
  { path: '/subscriptions/:id/edit', component: NewSubscriptionView },
  { path: '/settings', component: SettingsView },
  { path: '/settings/profile', component: ProfileView },
  { path: '/settings/exchange', component: ExchangeView },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
