<template>
  <div :class="['message', role]">
    <div class="message-avatar">
      {{ role === 'user' ? '👤' : '🤖' }}
    </div>
    <div class="message-content">
      <div class="message-bubble">
        {{ content }}
      </div>
      <span class="message-time">{{ time }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  role: 'user' | 'assistant';
  content: string;
  time: string;
}>();
</script>

<style scoped>
.message {
  display: flex;
  gap: 10px;
  max-width: 85%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
  background: #2a2a4a;
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message.user .message-content {
  align-items: flex-end;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #e2e8f0;
}

.message.assistant .message-bubble {
  background: #2a2a4a;
  border-bottom-left-radius: 4px;
}

.message.user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-time {
  font-size: 0.7rem;
  color: #64748b;
  padding: 0 4px;
}
</style>

