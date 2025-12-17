<template>
  <div class="documents-page">
    <div class="documents-container">
      <!-- Header -->
      <header class="documents-header">
        <h1>📚 Base de connaissances</h1>
        <p class="subtitle">
          Ajoute des documents pour enrichir les réponses de l'IA
        </p>
      </header>

      <!-- Formulaire d'ajout -->
      <section class="add-section">
        <h2>Ajouter un document</h2>
        <form @submit.prevent="addDocument" class="add-form">
          <textarea
            v-model="newContent"
            placeholder="Colle ici le contenu du document à indexer...&#10;&#10;Exemple: Guide d'installation Docker, FAQ produit, documentation technique..."
            rows="6"
            :disabled="isAdding"
          ></textarea>
          <div class="form-actions">
            <span class="char-count">{{ newContent.length }} caractères</span>
            <button
              type="submit"
              :disabled="!newContent.trim() || isAdding"
              class="btn-add"
            >
              <span v-if="isAdding">⏳ Indexation...</span>
              <span v-else>➕ Ajouter le document</span>
            </button>
          </div>
        </form>
        <p v-if="addMessage" :class="['message', addMessageType]">
          {{ addMessage }}
        </p>
      </section>

      <!-- Recherche -->
      <section class="search-section">
        <h2>🔍 Tester la recherche</h2>
        <form @submit.prevent="searchDocuments" class="search-form">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Pose une question pour tester..."
            :disabled="isSearching"
          />
          <button
            type="submit"
            :disabled="!searchQuery.trim() || isSearching"
            class="btn-search"
          >
            {{ isSearching ? '⏳...' : 'Rechercher' }}
          </button>
        </form>

        <p v-if="searchError" class="message error">{{ searchError }}</p>

        <div v-if="searchResults.length > 0" class="search-results">
          <h3>Résultats :</h3>
          <div
            v-for="result in searchResults"
            :key="result.id"
            class="result-card"
          >
            <div class="result-header">
              <span class="result-id">#{{ result.id }}</span>
              <span
                class="result-distance"
                :title="'Distance cosinus: ' + result.distance"
              >
                {{ Math.round((1 - result.distance) * 100) }}% similaire
              </span>
            </div>
            <p class="result-content">{{ result.content }}</p>
          </div>
        </div>

        <p
          v-else-if="hasSearched && !isSearching && !searchError"
          class="no-results"
        >
          Aucun document trouvé pour cette recherche.
        </p>
      </section>

      <!-- Liste des documents -->
      <section class="list-section">
        <div class="list-header">
          <h2>📄 Documents indexés ({{ total }})</h2>
          <button
            @click="loadDocuments"
            class="btn-refresh"
            :disabled="isLoading"
          >
            🔄 Rafraîchir
          </button>
        </div>

        <div v-if="isLoading" class="loading">Chargement...</div>

        <div v-else-if="documents.length === 0" class="empty-state">
          <p>Aucun document indexé pour le moment.</p>
          <p>Ajoute des documents ci-dessus pour commencer !</p>
        </div>

        <div v-else class="documents-list">
          <div v-for="doc in documents" :key="doc.id" class="document-card">
            <div class="document-header">
              <span class="document-id">#{{ doc.id }}</span>
              <button
                @click="deleteDocument(doc.id)"
                class="btn-delete"
                title="Supprimer"
              >
                🗑️
              </button>
            </div>
            <p class="document-content">{{ truncate(doc.content, 200) }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const API_URL = 'http://localhost:3000';

interface Document {
  id: number;
  content: string;
}

interface SearchResult {
  id: number;
  content: string;
  distance: number;
}

// State
const documents = ref<Document[]>([]);
const total = ref(0);
const isLoading = ref(false);
const isAdding = ref(false);
const isSearching = ref(false);

const newContent = ref('');
const addMessage = ref('');
const addMessageType = ref<'success' | 'error'>('success');

const searchQuery = ref('');
const searchResults = ref<SearchResult[]>([]);
const searchError = ref('');
const hasSearched = ref(false);

// Helpers
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// API calls
async function loadDocuments() {
  isLoading.value = true;
  try {
    const response = await fetch(`${API_URL}/api/documents`);
    const data = await response.json();
    documents.value = data.documents;
    total.value = data.total;
  } catch (error) {
    console.error('Error loading documents:', error);
  } finally {
    isLoading.value = false;
  }
}

async function addDocument() {
  if (!newContent.value.trim()) return;

  isAdding.value = true;
  addMessage.value = '';

  try {
    const response = await fetch(`${API_URL}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent.value }),
    });

    if (!response.ok) {
      throw new Error('Failed to add document');
    }

    const data = await response.json();
    addMessage.value = `✅ Document #${data.document.id} ajouté avec succès !`;
    addMessageType.value = 'success';
    newContent.value = '';

    // Recharger la liste
    await loadDocuments();
  } catch (error) {
    console.error('Error adding document:', error);
    addMessage.value = "❌ Erreur lors de l'ajout du document";
    addMessageType.value = 'error';
  } finally {
    isAdding.value = false;
  }
}

async function deleteDocument(id: number) {
  if (!confirm('Supprimer ce document ?')) return;

  try {
    const response = await fetch(`${API_URL}/api/documents/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }

    // Retirer de la liste
    documents.value = documents.value.filter((d) => d.id !== id);
    total.value--;
  } catch (error) {
    console.error('Error deleting document:', error);
    alert('Erreur lors de la suppression');
  }
}

async function searchDocuments() {
  if (!searchQuery.value.trim()) return;

  isSearching.value = true;
  searchResults.value = [];
  searchError.value = '';
  hasSearched.value = false;

  try {
    const response = await fetch(`${API_URL}/api/documents/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery.value, limit: 5 }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Search failed');
    }

    searchResults.value = data.results;
  } catch (error) {
    console.error('Error searching documents:', error);
    searchError.value =
      "❌ Erreur lors de la recherche. L'API Mistral est peut-être indisponible, réessaie dans quelques secondes.";
  } finally {
    isSearching.value = false;
    hasSearched.value = true;
  }
}

onMounted(() => {
  loadDocuments();
});
</script>

<style scoped>
.documents-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  padding: 40px 20px;
}

.documents-container {
  max-width: 900px;
  margin: 0 auto;
}

.documents-header {
  text-align: center;
  margin-bottom: 40px;
}

.documents-header h1 {
  font-size: 2.5rem;
  color: #fff;
  margin-bottom: 8px;
}

.subtitle {
  color: #8b8ba7;
  font-size: 1.1rem;
}

section {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

h2 {
  color: #fff;
  font-size: 1.3rem;
  margin-bottom: 16px;
}

h3 {
  color: #a0a0c0;
  font-size: 1rem;
  margin-bottom: 12px;
}

/* Add Form */
.add-form textarea {
  width: 100%;
  padding: 16px;
  background: #16162a;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  color: #fff;
  font-size: 1rem;
  resize: vertical;
  font-family: inherit;
}

.add-form textarea:focus {
  outline: none;
  border-color: #6366f1;
}

.add-form textarea::placeholder {
  color: #5a5a7a;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.char-count {
  color: #5a5a7a;
  font-size: 0.9rem;
}

.btn-add {
  padding: 12px 24px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.95rem;
}

.message.success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.message.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Search */
.search-form {
  display: flex;
  gap: 12px;
}

.search-form input {
  flex: 1;
  padding: 12px 16px;
  background: #16162a;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
}

.search-form input:focus {
  outline: none;
  border-color: #6366f1;
}

.btn-search {
  padding: 12px 20px;
  background: #2a2a4a;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-search:hover:not(:disabled) {
  background: #3a3a5a;
}

.btn-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-results {
  margin-top: 20px;
}

.result-card {
  background: #16162a;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #2a2a4a;
}

.result-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.result-id {
  color: #6366f1;
  font-weight: 600;
}

.result-distance {
  color: #22c55e;
  font-size: 0.9rem;
}

.result-content {
  color: #c0c0d0;
  line-height: 1.5;
}

/* Document List */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.list-header h2 {
  margin-bottom: 0;
}

.btn-refresh {
  padding: 8px 16px;
  background: transparent;
  color: #8b8ba7;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  border-color: #6366f1;
  color: #fff;
}

.loading {
  text-align: center;
  color: #8b8ba7;
  padding: 40px;
}

.empty-state {
  text-align: center;
  color: #5a5a7a;
  padding: 40px;
}

.empty-state p {
  margin: 8px 0;
}

.no-results {
  text-align: center;
  color: #8b8ba7;
  padding: 20px;
  font-style: italic;
}

.documents-list {
  display: grid;
  gap: 12px;
}

.document-card {
  background: #16162a;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #2a2a4a;
  transition: border-color 0.2s;
}

.document-card:hover {
  border-color: #3a3a5a;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.document-id {
  color: #6366f1;
  font-weight: 600;
}

.btn-delete {
  padding: 4px 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.btn-delete:hover {
  opacity: 1;
}

.document-content {
  color: #a0a0c0;
  line-height: 1.5;
  font-size: 0.95rem;
}

@media (max-width: 640px) {
  .documents-page {
    padding: 20px 12px;
  }

  .documents-header h1 {
    font-size: 1.8rem;
  }

  .search-form {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .char-count {
    text-align: center;
  }
}
</style>
