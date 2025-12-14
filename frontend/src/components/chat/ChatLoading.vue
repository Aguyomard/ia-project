<template>
  <div class="message assistant">
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="message-bubble loading">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  gap: 10px;
  max-width: 85%;
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

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-bubble.loading {
  display: flex;
  gap: 4px;
  padding: 16px 20px;
  background: #2a2a4a;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
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
</style>

