<template>
  <div class="home">
    <div class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="gradient-text">Assistant IA</span>
          <br />
          Propulsé par Mistral
        </h1>
        <p class="hero-subtitle">
          Discute avec une intelligence artificielle avancée.
          Pose tes questions, obtiens des réponses instantanées.
        </p>
        <router-link to="/chat" class="cta-button">
          <span>Commencer à discuter</span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
        </router-link>
      </div>

      <div class="hero-visual">
        <div class="chat-preview">
          <div class="preview-message assistant">
            <span class="avatar">🤖</span>
            <span class="bubble">Bonjour ! Comment puis-je t'aider ?</span>
          </div>
          <div class="preview-message user">
            <span class="bubble">Explique-moi le machine learning</span>
            <span class="avatar">👤</span>
          </div>
          <div class="preview-message assistant">
            <span class="avatar">🤖</span>
            <span class="bubble">Le machine learning est une branche de l'IA...</span>
          </div>
        </div>
      </div>
    </div>

    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Réponses instantanées</h3>
        <p>Obtiens des réponses en quelques secondes grâce à Mistral AI.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🧠</div>
        <h3>IA avancée</h3>
        <p>Powered by Mistral, un des modèles les plus performants.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>Conversations privées</h3>
        <p>Tes conversations restent confidentielles et sécurisées.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No logic needed for now
</script>

<style scoped>
.home {
  width: 100%;
  max-width: 1200px;
  padding: 2rem;
}

.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  min-height: 60vh;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1.1;
  color: #1a1a2e;
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: #64748b;
  line-height: 1.7;
  max-width: 480px;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
  width: fit-content;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.cta-button svg {
  width: 20px;
  height: 20px;
}

/* Chat Preview */
.hero-visual {
  display: flex;
  justify-content: center;
}

.chat-preview {
  background: #1a1a2e;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
}

.preview-message {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.preview-message.user {
  justify-content: flex-end;
}

.preview-message .avatar {
  width: 32px;
  height: 32px;
  background: #2a2a4a;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.preview-message.user .avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.preview-message .bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  max-width: 220px;
  line-height: 1.4;
}

.preview-message.assistant .bubble {
  background: #2a2a4a;
  color: #e2e8f0;
}

.preview-message.user .bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 4rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  text-align: center;
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.2rem;
  color: #1a1a2e;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 3rem;
    text-align: center;
  }

  .hero-content {
    align-items: center;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    max-width: 100%;
  }

  .features {
    grid-template-columns: 1fr;
  }
}
</style>

