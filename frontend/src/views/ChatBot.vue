<template>
  <div class="chatbot">
    <div class="chat-container">
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-header-icon">🤖</div>
        <div class="chat-header-info">
          <h2>Assistant IA</h2>
          <span class="status">
            <span class="status-dot"></span>
            En ligne
          </span>
        </div>
        <button
          class="new-chat-btn"
          @click="newConversation"
          title="Nouvelle conversation"
        >
          ✨ Nouveau
        </button>
      </div>

      <!-- Messages -->
      <div class="chat-messages" ref="messagesContainer">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.role]"
        >
          <div class="message-avatar">
            {{ message.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            <div class="message-bubble">
              {{ message.content }}
            </div>
            <span class="message-time">{{ message.time }}</span>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="message assistant">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <div class="message-bubble loading">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <form class="chat-input" @submit.prevent="sendMessage">
        <input
          v-model="inputMessage"
          type="text"
          placeholder="Écris ton message..."
          :disabled="isLoading"
        />
        <button type="submit" :disabled="!inputMessage.trim() || isLoading">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';

const API_URL = 'http://localhost:3000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const messages = ref<Message[]>([]);
const inputMessage = ref('');
const isLoading = ref(false);
const isInitializing = ref(true);
const conversationId = ref<string | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

// Créer une nouvelle conversation au chargement
async function initConversation() {
  try {
    const response = await fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    conversationId.value = data.conversation.id;

    // Message de bienvenue
    messages.value.push({
      role: 'assistant',
      content: "Salut ! Je suis ton assistant IA. Comment puis-je t'aider ?",
      time: formatTime(new Date()),
    });

    console.log('📝 Conversation initialized:', conversationId.value);
  } catch (error) {
    console.error('Failed to init conversation:', error);
    messages.value.push({
      role: 'assistant',
      content: 'Erreur de connexion au serveur. Rafraîchis la page.',
      time: formatTime(new Date()),
    });
  } finally {
    isInitializing.value = false;
  }
}

async function sendMessage() {
  const content = inputMessage.value.trim();
  if (!content || isLoading.value || !conversationId.value) return;

  // Add user message
  messages.value.push({
    role: 'user',
    content,
    time: formatTime(new Date()),
  });

  inputMessage.value = '';
  isLoading.value = true;
  await scrollToBottom();

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        conversationId: conversationId.value,
      }),
    });

    const data = await response.json();

    messages.value.push({
      role: 'assistant',
      content: data.response || "Désolé, je n'ai pas pu répondre.",
      time: formatTime(new Date()),
    });
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: 'Erreur de connexion au serveur. Réessaie plus tard.',
      time: formatTime(new Date()),
    });
  } finally {
    isLoading.value = false;
    await scrollToBottom();
  }
}

// Démarrer une nouvelle conversation
async function newConversation() {
  messages.value = [];
  conversationId.value = null;
  isInitializing.value = true;
  await initConversation();
}

onMounted(() => {
  initConversation();
});
</script>

<style scoped>
.chatbot {
  width: 100%;
  max-width: 600px;
  height: 70vh;
  max-height: 700px;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a2e;
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* Header */
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

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #16162a;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #3a3a5c;
  border-radius: 3px;
}

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

/* Loading dots */
.message-bubble.loading {
  display: flex;
  gap: 4px;
  padding: 16px 20px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}
.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Input */
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

/* Responsive */
@media (max-width: 640px) {
  .chatbot {
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }

  .chat-container {
    border-radius: 0;
  }
}
</style>
