import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.js';
import { store } from '../store/index.js';
import { setNavTransition } from '../services/navigation.js';

export default {
  name: 'ProfileView',
  components: { Icon },
  setup() {
    const st = store.state;
    const router = useRouter();
    const username = ref('');
    const currentPassword = ref('');
    const newPassword = ref('');
    const confirmPassword = ref('');
    const message = ref('');
    const alertState = ref('success');
    const saving = ref(false);
    const errors = reactive({ username: '', current_password: '', password: '', password_confirm: '' });

    function syncProfile() {
      username.value = st.profile?.username || '';
    }

    onMounted(syncProfile);
    watch(() => st.profile?.username, syncProfile);

    const nameChanged = computed(() => {
      const current = st.profile?.username || '';
      return username.value.trim() && username.value.trim() !== current;
    });

    const passwordTouched = computed(() => !!(newPassword.value || confirmPassword.value || currentPassword.value));

    const canSubmit = computed(() => {
      if (saving.value) return false;
      if (nameChanged.value) return true;
      if (passwordTouched.value) {
        return !!(newPassword.value && confirmPassword.value && currentPassword.value);
      }
      return false;
    });

    function clearMessages() {
      message.value = '';
      alertState.value = 'success';
      Object.keys(errors).forEach(key => { errors[key] = ''; });
    }

    async function save() {
      clearMessages();
      if (!canSubmit.value) return;
      const payload = {};
      const trimmedName = username.value.trim();
      if (nameChanged.value) {
        payload.username = trimmedName;
      }
      if (passwordTouched.value) {
        if (!newPassword.value) errors.password = 'Enter a new password.';
        if (!confirmPassword.value) errors.password_confirm = 'Confirm the new password.';
        if (!currentPassword.value) errors.current_password = 'Enter your current password.';
        if (newPassword.value && confirmPassword.value && newPassword.value !== confirmPassword.value) {
          errors.password_confirm = 'Passwords do not match.';
        }
        if (newPassword.value && newPassword.value.length < 8) {
          errors.password = 'Password must be at least 8 characters.';
        }
        if (errors.password || errors.password_confirm || errors.current_password) {
          return;
        }
        payload.password = newPassword.value;
        payload.password_confirm = confirmPassword.value;
        payload.current_password = currentPassword.value;
      }
      if (!Object.keys(payload).length) {
        message.value = 'Nothing to update.';
        alertState.value = 'info';
        return;
      }
      saving.value = true;
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data && data.errors) {
            Object.entries(data.errors).forEach(([key, val]) => {
              if (errors[key] !== undefined) errors[key] = val;
            });
          } else {
            message.value = 'Unable to save changes.';
            alertState.value = 'error';
          }
          return;
        }
        await store.loadProfile();
        currentPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        message.value = 'Profile updated.';
        alertState.value = 'success';
      } catch (err) {
        message.value = 'Unable to save changes.';
        alertState.value = 'error';
      } finally {
        saving.value = false;
      }
    }

    function goBack() {
      setNavTransition('slide-left');
      router.back();
    }

    return {
      st,
      username,
      currentPassword,
      newPassword,
      confirmPassword,
      message,
      alertState,
      errors,
      saving,
      canSubmit,
      save,
      goBack,
    };
  },
  template: `
    <div class="fixed inset-0 z-30 bg-white flex flex-col">
      <div class="h-14 bg-ioscard flex items-center justify-between px-2 border-b border-gray-200">
        <button class="p-2" @click="goBack"><Icon name=\"back\" class="w-7 h-7"/></button>
        <div class="font-semibold">Profile</div>
        <button
          class="p-2 transition"
          :class="canSubmit ? 'text-green-600' : 'text-gray-300 cursor-not-allowed'"
          :disabled="!canSubmit"
          @click="save"
          aria-label="Save"
        >
          <Icon name=\"save\" class="w-7 h-7"/>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="message" class="px-3 py-2 rounded-xl text-sm"
          :class="alertState === 'error' ? 'bg-rose-50 text-rose-600' : alertState === 'info' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600'">
          {{ message }}
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white">
          <div class="divide-y divide-gray-100">
            <div class="px-4 py-3">
              <div class="flex items-center justify-between">
                <div class="text-gray-600">Username</div>
                <input v-model="username" class="text-right outline-none"/>
              </div>
              <div v-if="errors.username" class="text-xs text-rose-500 text-right mt-1">{{ errors.username }}</div>
            </div>
            <div class="px-4 py-3">
              <div class="flex items-center justify-between">
                <div class="text-gray-600">Current Password</div>
                <input v-model="currentPassword" type="password" placeholder="Required to change password" class="text-right outline-none" autocomplete="current-password"/>
              </div>
              <div v-if="errors.current_password" class="text-xs text-rose-500 text-right mt-1">{{ errors.current_password }}</div>
            </div>
            <div class="px-4 py-3">
              <div class="flex items-center justify-between">
                <div class="text-gray-600">New Password</div>
                <input v-model="newPassword" type="password" class="text-right outline-none" autocomplete="new-password"/>
              </div>
              <div v-if="errors.password" class="text-xs text-rose-500 text-right mt-1">{{ errors.password }}</div>
            </div>
            <div class="px-4 py-3">
              <div class="flex items-center justify-between">
                <div class="text-gray-600">Confirm Password</div>
                <input v-model="confirmPassword" type="password" class="text-right outline-none" autocomplete="new-password"/>
              </div>
              <div v-if="errors.password_confirm" class="text-xs text-rose-500 text-right mt-1">{{ errors.password_confirm }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};
