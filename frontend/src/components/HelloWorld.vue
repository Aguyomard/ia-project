<template>
  <div class="hello-world">
    <div class="card">
      <div class="card-header">
        <h2>👋 Hello World!</h2>
        <p>Bienvenue dans votre application Vue 3</p>
      </div>

      <div class="card-body">
        <div class="counter-section">
          <h3>Compteur: {{ count }}</h3>
          <div class="button-group">
            <button @click="decrement" class="btn btn-secondary">
              ➖ Diminuer
            </button>
            <button @click="increment" class="btn btn-primary">
              ➕ Augmenter
            </button>
          </div>
        </div>

        <div class="message-section">
          <h3>Message personnalisé</h3>
          <input
            v-model="message"
            type="text"
            placeholder="Tapez votre message..."
            class="input-field"
          />
          <p class="display-message">{{ message || 'Aucun message' }}</p>
        </div>
      </div>

      <div class="card-footer">
        <p>🕐 Dernière mise à jour: {{ lastUpdate }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const count = ref(0)
const message = ref('')
const lastUpdate = ref('')

const increment = () => {
  count.value++
  updateTimestamp()
}

const decrement = () => {
  count.value--
  updateTimestamp()
}

const updateTimestamp = () => {
  lastUpdate.value = new Date().toLocaleTimeString('fr-FR')
}

onMounted(() => {
  updateTimestamp()
})
</script>

<style scoped>
.hello-world {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
  max-width: 500px;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.card-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 600;
}

.card-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.card-body {
  padding: 2rem;
}

.counter-section,
.message-section {
  margin-bottom: 2rem;
}

.counter-section h3,
.message-section h3 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.button-group {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
  transform: translateY(-2px);
}

.input-field {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  margin-bottom: 1rem;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
}

.display-message {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #667eea;
  margin: 0;
  font-weight: 500;
  color: #495057;
}

.card-footer {
  background: #f8f9fa;
  padding: 1rem 2rem;
  text-align: center;
  border-top: 1px solid #e9ecef;
}

.card-footer p {
  margin: 0;
  color: #6c757d;
  font-size: 0.9rem;
}
</style>
