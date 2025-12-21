<template>
  <div class="chatbot">
    <div class="chat-container">
      <ChatHeader
        title="Assistant IA"
        status-text="En ligne"
        @new-conversation="newConversation"
      />

      <div class="chat-messages" ref="messagesContainer">
        <ChatMessage
          v-for="(message, index) in messages"
          :key="index"
          :role="message.role"
          :content="message.content"
          :time="message.time"
          :sources="message.sources"
        />

        <!-- Loading désactivé car on utilise le streaming -->
      </div>

      <div class="chat-footer">
        <label class="rag-toggle">
          <input type="checkbox" v-model="useRAG" />
          <span class="toggle-icon">📚</span>
          <span class="toggle-label">Base de connaissances</span>
        </label>
        <ChatInput
          placeholder="Écris ton message..."
          :disabled="isLoading"
          @send="sendMessage"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import {
  ChatHeader,
  ChatMessage,
  ChatLoading,
  ChatInput,
} from '@/components/chat';

const API_URL = 'http://localhost:3000';

interface Source {
  title: string;
  similarity: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
  sources?: Source[];
}

const messages = ref<Message[]>([]);
const isLoading = ref(false);
const conversationId = ref<string | null>(null);
const messagesContainer = ref<HTMLElement | null>(null);
const useRAG = ref(true);

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

async function initConversation() {
  try {
    const response = await fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    conversationId.value = data.conversation.id;

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
  }
}

async function sendMessage(content: string) {
  if (!conversationId.value) return;

  // Ajouter le message utilisateur
  messages.value.push({
    role: 'user',
    content,
    time: formatTime(new Date()),
  });

  isLoading.value = true;
  await scrollToBottom();

  // Créer un message assistant vide pour le streaming
  const assistantMessageIndex = messages.value.length;
  messages.value.push({
    role: 'assistant',
    content: '',
    time: formatTime(new Date()),
  });

  try {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        conversationId: conversationId.value,
        useRAG: useRAG.value,
      }),
    });

    if (!response.ok) {
      throw new Error('Stream request failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    // Lire le stream
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n');

          for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.chunk) {
              // Ajouter le chunk au message
              messages.value[assistantMessageIndex].content += data.chunk;
              await scrollToBottom();
            }

            if (data.done) {
              console.log('✅ Stream completed');
              // Ajouter les sources si présentes
              if (data.sources && data.sources.length > 0) {
                messages.value[assistantMessageIndex].sources = data.sources;
              }
            }

            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            // Ignorer les erreurs de parsing (lignes vides, etc.)
          }
        }
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
    messages.value[assistantMessageIndex].content =
      'Erreur de connexion au serveur. Réessaie plus tard.';
  } finally {
    isLoading.value = false;
    await scrollToBottom();
  }
}

async function newConversation() {
  messages.value = [];
  conversationId.value = null;
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

.chat-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
  background: #1a1a2e;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.rag-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.rag-toggle:hover {
  background: rgba(255, 255, 255, 0.05);
}

.rag-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #667eea;
  cursor: pointer;
}

.toggle-icon {
  font-size: 0.9rem;
  opacity: 0.8;
}

.rag-toggle:has(input:checked) .toggle-icon {
  opacity: 1;
}

.rag-toggle:has(input:not(:checked)) .toggle-icon {
  opacity: 0.4;
}

.toggle-label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.rag-toggle:has(input:checked) .toggle-label {
  color: #a5b4fc;
}

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
