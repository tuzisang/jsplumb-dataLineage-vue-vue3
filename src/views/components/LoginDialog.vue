<template>
  <div class="login-mask">
    <div class="login-dialog">
      <h2>登录</h2>
      <input v-model="username" placeholder="账号" />
      <input v-model="password" type="password" placeholder="密码" />
      <button @click="login" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const emit = defineEmits(['login-success']);

const login = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value })
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('auth_token', data.token);
      emit('login-success');
    } else {
      error.value = data.error || '登录失败';
    }
  } catch (e) {
    error.value = '网络错误';
  }
  loading.value = false;
};
</script>

<style scoped>
.login-mask {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25); z-index: 99999;
  display: flex; align-items: center; justify-content: center;
}
.login-dialog {
  background: #fff; padding: 32px 24px; border-radius: 10px; box-shadow: 0 2px 16px #0001;
  display: flex; flex-direction: column; gap: 16px; min-width: 300px;
}
input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
button { padding: 8px; border-radius: 4px; background: #1890ff; color: #fff; border: none; }
.error { color: #f5222d; font-size: 13px; }
</style> 