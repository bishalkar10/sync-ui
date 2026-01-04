<template>
  <div class="landing-container theme-premium">

    <div class="bg-gradient-1"></div>
    <div class="bg-gradient-2"></div>
    <div class="grid-overlay"></div>

    <header class="header">
      <div class="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 7L13 12L21 17V7Z" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6" stroke-width="2"
            stroke-linejoin="round" />
          <circle cx="8" cy="12" r="7" stroke="#3b82f6" stroke-width="2" />
          <path
            d="M5 12C5 10.3431 6.34315 9 8 9C9.65685 9 11 10.3431 11 12C11 13.6569 9.65685 15 8 15C6.34315 15 5 13.6569 5 12Z"
            fill="#3b82f6" />
        </svg>
        <span>Sync</span>
      </div>
    </header>

    <main class="hero-section">
      <div class="container">
        <div class="hero-content">

          <h1 class="hero-title">
            Video calls for the
            <span class="text-gradient">modern professional</span>
          </h1>
          <p class="hero-subtitle">
            Experience crystal clear audio and video with our premium, secure, and
            lightning-fast conferencing platform. Designed for teams that demand excellence.
          </p>


          <div class="join-form-card" id="join-section">
            <div class="input-group">
              <label>Display Name</label>
              <input type="text" v-model="userName" placeholder="Enter your name" @keyup.enter="joinRoom" />
            </div>
            <div class="input-group">
              <label>Room Name</label>
              <div class="input-with-action">
                <input type="text" v-model="roomName" placeholder="Enter room name" @keyup.enter="joinRoom" />
                <button class="action-btn" @click="generateRoomName" title="Generate Random">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                    <path d="M16 16h5v5"></path>
                  </svg>
                </button>
              </div>
            </div>
            <button class="btn-primary full-width" @click="joinRoom" :disabled="!userName || !roomName">
              Start Meeting
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>


        </div>

        <div class="hero-visual">
          <div class="app-card">
            <div class="app-header">
              <div class="window-controls">
                <span class="dot red"></span>
                <span class="dot yellow"></span>
                <span class="dot green"></span>
              </div>
              <div class="address-bar">premium-connect.com/meeting</div>
            </div>
            <div class="app-body">
              <div class="participant-grid-preview">
                <div class="preview-card p1"></div>
                <div class="preview-card p2"></div>
                <div class="preview-card p3"></div>
                <div class="preview-card p4"></div>
              </div>
              <div class="controls-preview">
                <div class="control-pill"></div>
                <div class="control-pill"></div>
                <div class="control-pill red"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import '@/assets/modern-theme.css'

const router = useRouter()
const userName = ref('')
const roomName = ref('')

const generateRoomName = () => {
  roomName.value = Math.random().toString(36).substring(2, 8)
}

const joinRoom = () => {
  if (userName.value && roomName.value) {
    router.push({
      name: 'CallPage',
      params: { roomName: roomName.value },
      state: { userName: userName.value },
    })
  }
}


</script>

<style scoped>
.landing-container {
  min-height: 100dvh;
  background-color: var(--color-bg-dark);
  color: var(--color-text-primary);
  font-family: var(--font-family);
  position: relative;
  overflow: hidden;
}

.bg-gradient-1 {
  position: absolute;
  top: -20%;
  left: -10%;
  width: 60vw;
  height: 60vw;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
  filter: blur(80px);
  z-index: 0;
}

.bg-gradient-2 {
  position: absolute;
  bottom: -20%;
  right: -10%;
  width: 50vw;
  height: 50vw;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(0, 0, 0, 0) 70%);
  filter: blur(80px);
  z-index: 0;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}


.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 24px 48px;
  margin: 0 auto;
  background: rgba(9, 9, 11, 0.8);
  backdrop-filter: blur(10px);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 auto;
  max-width: 98rem;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.5px;
}

.logo-icon {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, var(--color-accent), #8b5cf6);
  border-radius: 6px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--color-text-primary);
}


.btn-primary {
  background: var(--color-text-primary);
  color: var(--color-bg-dark);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary.full-width {
  width: 100%;
  margin-top: 16px;
}

.btn-secondary {
  background: transparent;
  color: var(--color-text-primary);
  border: none;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--color-text-primary);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-outline:hover {
  background: var(--border-color);
}

.hero-section {
  position: relative;
  z-index: 10;
  min-height: calc(100dvh - 72px);
  padding: 48px;
}

.container {
  max-width: 98rem;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  color: var(--color-accent);
  margin-bottom: 24px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  background: var(--color-accent);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--color-accent);
}

.hero-title {
  font-size: 64px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -2px;
  margin-bottom: 24px;
}

.text-gradient {
  background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-subtitle {
  font-size: 18px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin-bottom: 40px;
  max-width: 500px;
}


.join-form-card {
  background: var(--color-bg-panel);
  border: 1px solid var(--border-color);
  padding: 24px;
  border-radius: 12px;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.input-group {
  margin-bottom: 16px;
}

.input-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.input-group input {
  width: 100%;
  background: var(--color-bg-dark);
  border: 1px solid var(--border-color);
  color: var(--color-text-primary);
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.input-group input:focus {
  border-color: var(--color-accent);
}

.input-with-action {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: var(--color-bg-dark);
  border: 1px solid var(--border-color);
  color: var(--color-text-secondary);
  padding: 0 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--color-text-secondary);
  color: var(--color-text-primary);
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--border-color);
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.divider {
  width: 1px;
  height: 40px;
  background: var(--border-color);
}


.hero-visual {
  perspective: 1000px;
}

.app-card {
  background: var(--color-bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5);
  transform: rotateY(-5deg) rotateX(5deg);
  transition: transform 0.5s ease;
  overflow: hidden;
}

.app-card:hover {
  transform: rotateY(0) rotateX(0);
}

.app-header {
  background: #111;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.window-controls {
  display: flex;
  gap: 6px;
  margin-right: 16px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.red {
  background: #ff5f56;
}

.dot.yellow {
  background: #ffbd2e;
}

.dot.green {
  background: #27c93f;
}

.address-bar {
  background: #222;
  flex: 1;
  height: 24px;
  border-radius: 4px;
  font-size: 11px;
  color: #666;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.app-body {
  padding: 16px;
  height: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #0a0a0a;
}

.participant-grid-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  flex: 1;
}

.preview-card {
  background: #1a1a1a;
  border-radius: 6px;
  position: relative;
}

.preview-card::after {
  content: '';
  position: absolute;
  bottom: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  background: #333;
  border-radius: 50%;
}

.preview-card.p1 {
  background: #222;
}

.preview-card.p2 {
  background: #1e1e1e;
}

.preview-card.p3 {
  background: #252525;
}

.preview-card.p4 {
  background: #202020;
}

.controls-preview {
  height: 40px;
  background: #111;
  border-radius: 20px;
  margin: 0 auto;
  width: 60%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.control-pill {
  width: 24px;
  height: 24px;
  background: #333;
  border-radius: 50%;
}

.control-pill.red {
  background: #ef4444;
}

@media (max-width: 1024px) {
  .header {
    padding: 16px 24px;
  }

  .container {
    grid-template-columns: 1fr;
    gap: 48px;
    text-align: center;
  }

  .hero-section {
    padding: 40px 24px;
    min-height: auto;
  }

  .hero-title {
    font-size: 48px;
    margin-bottom: 20px;
  }

  .hero-subtitle {
    margin: 0 auto 32px;
    font-size: 16px;
  }

  .join-form-card {
    margin: 0 auto;
    width: 100%;
    max-width: 400px;
    text-align: left;
  }

  .hero-visual {
    display: none;
  }

  .hero-title br {
    display: none;
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 36px;
    letter-spacing: -1px;
  }

  .header {
    padding: 12px 16px;
  }

  .join-form-card {
    padding: 20px;
  }
}
</style>
