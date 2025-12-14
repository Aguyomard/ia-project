<template>
  <div class="chat-header">
    <div class="chat-header-icon">🤖</div>
    <div class="chat-header-info">
      <h2>{{ title }}</h2>
      <span class="status">
        <span class="status-dot"></span>
        {{ statusText }}
      </span>
    </div>
    <button class="new-chat-btn" @click="$emit('new-conversation')" title="Nouvelle conversation">
      ✨ Nouveau
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  statusText?: string;
}>();

defineEmits<{
  'new-conversation': [];
}>();
</script>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.chat-header-icon {
  font-size: 2rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-header-info h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.new-chat-btn {
  margin-left: auto;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.new-chat-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>

