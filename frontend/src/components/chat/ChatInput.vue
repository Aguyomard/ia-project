<template>
  <form class="chat-input" @submit.prevent="handleSubmit">
    <input
      v-model="message"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
    />
    <button type="submit" :disabled="!message.trim() || disabled">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
      </svg>
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  send: [message: string];
}>();

const message = ref('');

function handleSubmit() {
  const content = message.value.trim();
  if (!content) return;

  emit('send', content);
  message.value = '';
}
</script>

<style scoped>
.chat-input {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #1a1a2e;
  border-top: 1px solid #2a2a4a;
}

.chat-input input {
  flex: 1;
  padding: 14px 18px;
  border: none;
  border-radius: 14px;
  font-size: 0.95rem;
  background: #2a2a4a;
  color: #e2e8f0;
  outline: none;
  transition: box-shadow 0.2s;
}

.chat-input input::placeholder {
  color: #64748b;
}

.chat-input input:focus {
  box-shadow: 0 0 0 2px #667eea;
}

.chat-input button {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.chat-input button:hover:not(:disabled) {
  transform: scale(1.05);
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input button svg {
  width: 20px;
  height: 20px;
}
</style>

