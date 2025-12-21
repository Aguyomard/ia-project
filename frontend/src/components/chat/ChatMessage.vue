<template>
  <div :class="['message', role]">
    <div class="message-avatar">
      {{ role === 'user' ? '👤' : '🤖' }}
    </div>
    <div class="message-content">
      <div class="message-bubble">
        {{ content }}
      </div>
      <div v-if="sources && sources.length > 0" class="message-sources">
        <span class="sources-icon">📚</span>
        <span class="sources-label">Sources :</span>
        <span 
          v-for="(source, index) in sources" 
          :key="index" 
          class="source-tag"
        >
          {{ source.title }} ({{ source.similarity }}%)
        </span>
      </div>
      <span class="message-time">{{ time }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Source {
  title: string;
  similarity: number;
}

defineProps<{
  role: 'user' | 'assistant';
  content: string;
  time: string;
  sources?: Source[];
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

.message-sources {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.sources-icon {
  font-size: 0.85rem;
}

.sources-label {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 500;
}

.source-tag {
  font-size: 0.7rem;
  padding: 3px 8px;
  background: rgba(102, 126, 234, 0.2);
  color: #a5b4fc;
  border-radius: 12px;
  font-weight: 500;
}
</style>

