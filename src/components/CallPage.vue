<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useVideoCall } from '@/composables/useVideoCall'
import { useRouter } from 'vue-router'
import VideoCard from './VideoCard.vue'
import '@/assets/modern-theme.css'

const props = defineProps<{
  roomName: string
}>()

const router = useRouter()
const videoCall = useVideoCall()

const userName = ref(history.state.userName || `user_${Math.floor(Math.random() * 1000)}`)
const isSidebarLayout = ref(false)
const participants = computed(() => {
  return Array.from(videoCall.participants.value.values()).map(info => info.participant)
})

const participantCount = computed(() => participants.value.length)

const activeSpeaker = computed(() => {
  const remote = participants.value.find(p => p.sid !== videoCall.localParticipant.value?.sid)
  return remote || videoCall.localParticipant.value
})

const otherParticipants = computed(() => {
  if (!activeSpeaker.value) return participants.value
  return participants.value.filter(p => p.sid !== activeSpeaker.value?.sid)
})

const toggleLayout = () => {
  isSidebarLayout.value = !isSidebarLayout.value
}

const handleEndCall = async () => {
  await videoCall.disconnectRoom()
  router.push('/')
}

onMounted(() => {

  if (props.roomName && userName.value) {
    videoCall.connectRoom(props.roomName, userName.value)
  } else {
    console.error('Room name or User name is missing. Cannot connect.')
    router.push('/')
  }
})

onUnmounted(() => {

  videoCall.disconnectRoom()
})
</script>

<template>
  <div class="call-container theme-premium">
      <header class="header">
        <div class="room-info">
          <div class="status-indicator">
            <span class="status-dot"></span>
            <span class="status-text">LIVE</span>
          </div>
          <div class="divider"></div>
          <h1 class="room-name">{{ roomName }}</h1>
          <span class="participant-badge">{{ participantCount }} Participants</span>
        </div>
        
        <div class="header-controls">
           <button class="icon-btn" @click="toggleLayout" title="Toggle Layout">
            <svg v-if="isSidebarLayout" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </button>
          <!-- <div class="timer">00:00</div> -->
        </div>
      </header>

      <main class="main-content" :class="{ 'sidebar-layout': isSidebarLayout }">
        <div v-if="!isSidebarLayout" class="participants-grid" :class="{ 'large-grid': participantCount > 12 }">
          <div v-for="p in participants" :key="p.sid" class="participant-wrapper">
            <VideoCard :participant="p" />
          </div>
        </div>

        <template v-else>
          <div class="stage-area">
             <div v-if="activeSpeaker" class="participant-wrapper active-speaker">
                <VideoCard :participant="activeSpeaker" />
             </div>
          </div>
          <div class="sidebar-strip">
             <div v-for="p in otherParticipants" :key="p.sid" class="participant-wrapper small">
                <VideoCard :participant="p" />
             </div>
          </div>
        </template>
      </main>

      <footer class="controls-bar">
        <div class="controls-group left">
           <!-- <button class="control-btn" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
           </button> -->
        </div>
        
        <div class="controls-group center">
          <button class="control-btn" :class="{ 'danger': !videoCall.isMicrophoneEnabled.value }" @click="videoCall.toggleMic()" title="Toggle Mic">
            <svg v-if="videoCall.isMicrophoneEnabled.value" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
          <button class="control-btn" :class="{ 'danger': !videoCall.isCameraEnabled.value }" @click="videoCall.toggleCamera()" title="Toggle Camera">
            <svg v-if="videoCall.isCameraEnabled.value" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21l-2-2m-2 0H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"></path></svg>
          </button>
          <button class="control-btn" :class="{ 'primary': videoCall.isScreenShareEnabled.value }" @click="videoCall.toggleScreenShare()" title="Share Screen">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"></path><polyline points="8 21 12 17 16 21"></polyline><line x1="12" y1="17" x2="12" y2="22"></line></svg>
          </button>
          <button class="control-btn danger" title="End Call" @click="handleEndCall">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
          </button>
        </div>

        <div class="controls-group right">
           <!-- <button class="control-btn" title="Participants">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
           </button> -->
        </div>
      </footer>
  </div>
</template>

<style scoped>
.call-container {
  width: 100vw;
  height: 100vh;
  background-color: var(--bg-app);
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  font-family: var(--font-family);
  overflow: hidden;
}

.header {
  height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-surface);
}

.room-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

.status-dot {
  width: 6px;
  height: 6px;
  background-color: var(--color-danger);
  border-radius: 50%;
}

.status-text {
  color: var(--color-danger);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
}

.room-name {
  font-size: 15px;
  font-weight: 500;
}

.participant-badge {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-bg-dark);
  padding: 2px 8px;
  border-radius: 12px;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.icon-btn:hover {
  color: var(--color-text-primary);
  background: var(--border-color);
}

.timer {
  font-family: monospace;
  font-size: 14px;
  color: var(--color-text-secondary);
  background: var(--color-bg-dark);
  padding: 4px 8px;
  border-radius: 4px;
}

.main-content {
  flex: 1;
  padding: var(--spacing-md);
  overflow: hidden;
  display: flex;
}

.main-content.sidebar-layout {
  flex-direction: row;
  gap: var(--spacing-md);
}


.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-md);
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;
}

.participants-grid.large-grid {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-auto-rows: 150px;
}

.participant-wrapper {
  width: 100%;
  height: 100%;
  min-height: 200px;
}


.stage-area {
  flex: 1;
  height: 100%;
  display: flex;
}

.sidebar-strip {
  width: 240px;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.participant-wrapper.active-speaker {
  width: 100%;
  height: 100%;
  border: 2px solid var(--color-accent);
  border-radius: 12px;
}

.participant-wrapper.small {
  height: 140px;
  flex-shrink: 0;
  min-height: 140px;
}


.controls-bar {
  height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--spacing-lg);
  background-color: var(--bg-surface);
  border-top: 1px solid var(--border-color);
}

.controls-group {
  display: flex;
  gap: 12px;
  flex: 1;
}

.controls-group.center {
  justify-content: center;
}

.controls-group.right {
  justify-content: flex-end;
}

.control-btn {
  width: 48px;
  height: 48px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;
  border-radius: var(--btn-radius);
}

.control-btn:hover {
  background-color: var(--border-color-hover);
}

.control-btn.primary {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.control-btn.primary:hover {
  background-color: var(--color-accent-hover);
}

.control-btn.danger {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.control-btn.danger:hover {
  background-color: var(--color-danger);
  color: #fff;
}
</style>
