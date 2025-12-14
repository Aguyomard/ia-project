<template>
  <div id="app">
    <header class="header">
      <nav class="nav">
        <router-link to="/" class="logo">🤖 Assistant IA</router-link>
        <div class="nav-links">
          <router-link to="/" class="nav-link">Accueil</router-link>
          <router-link to="/chat" class="nav-link">Chat</router-link>
        </div>
      </nav>
    </header>

    <main class="main">
      <router-view />
    </main>

    <footer class="footer">
      <p>Powered by Mistral AI</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Router is handled by vue-router
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  height: 64px;
}

.logo {
  font-size: 1.4rem;
  font-weight: 600;
  color: white;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition:
    background 0.2s,
    color 0.2s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.nav-link.router-link-active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  background-color: #f8f9fa;
}

.footer {
  background-color: #343a40;
  color: white;
  text-align: center;
  padding: 1rem;
  font-size: 0.9rem;
}
</style>
