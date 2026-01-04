<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useCallStore } from '@/stores/call'
import { useRouter } from 'vue-router'
import VideoCard from '@/components/VideoCard.vue'
import '@/assets/modern-theme.css'
import { Participant } from 'livekit-client'

const props = defineProps<{
  roomName: string
}>()

const router = useRouter()
const callStore = useCallStore()

const userName = ref(history.state.userName || `user_${Math.floor(Math.random() * 1000)}`)
const isSidebarLayout = ref(false)
const showParticipantsModal = ref(false)
const MAX_GRID_ITEMS = 6

// --- Layout & View Logic ---
const participants = computed(() => callStore.participantList)
const participantCount = computed(() => participants.value.length)

// --- Grid Limiting Logic ---
const visibleParticipants = computed(() => {
  if (isSidebarLayout.value) return participants.value // Sidebar handles its own filtering
  if (participantCount.value <= MAX_GRID_ITEMS) return participants.value
  return participants.value.slice(0, MAX_GRID_ITEMS - 1) // Show 5, leave 1 slot for "More" card
})

const hasOverflow = computed(() => !isSidebarLayout.value && participantCount.value > MAX_GRID_ITEMS)
const overflowCount = computed(() => participantCount.value - (MAX_GRID_ITEMS - 1))

// We designate an 'active speaker' to be prominently displayed when in sidebar layout.
// Preference is given to remote participants; if alone, the local user is shown.
const activeSpeaker = computed(() => {
  // Priority 1: Screen Share
  const screenSharer = participants.value.find(p => p.isScreenShareEnabled)
  if (screenSharer) return screenSharer

  // Priority 2: Active Speaker
  const speaker = participants.value.find(p => p.isSpeaking)
  if (speaker) return speaker
  
  // Priority 3: Fallback (First remote or local)
  const remote = participants.value.find(p => p.sid !== callStore.localParticipant?.sid)
  return remote || callStore.localParticipant
})

const sidebarDisplayParticipants = computed(() => {
  let others = participants.value
  if (activeSpeaker.value) {
    others = participants.value.filter(p => p.sid !== activeSpeaker.value?.sid)
  }
  // If we have more than 3 items, show 2 items + overflow card (total 3 slots).
  // Otherwise show up to 3 items (total <= 3 slots).
  if (others.length > 3) {
    return others.slice(0, 2)
  }
  return others
})

const sidebarOverflowCount = computed(() => {
  const totalOthers = activeSpeaker.value 
    ? participants.value.length - 1 
    : participants.value.length
  
  if (totalOthers > 3) {
    return totalOthers - 2
  }
  return 0
})

const toggleLayout = () => {
  isSidebarLayout.value = !isSidebarLayout.value
}

const toggleParticipantsModal = () => {
  showParticipantsModal.value = !showParticipantsModal.value
}

// Auto-switch to sidebar layout when screen share starts
watch(() => callStore.hasActiveScreenShare, (isSharing) => {
  if (isSharing) {
    isSidebarLayout.value = true
  }
})

const handleEndCall = async () => {
  await callStore.disconnect()
  router.push('/')
}

onMounted(() => {
  if (props.roomName && userName.value) {
    callStore.connect(props.roomName, userName.value)
  } else {
    console.error('Room name or User name is missing. Cannot connect.')
    router.push('/')
  }
})

onUnmounted(() => {
  callStore.disconnect()
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
          <svg v-if="isSidebarLayout" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
        <!-- <div class="timer">00:00</div> -->
      </div>
    </header>

    <main class="main-content" :class="{ 'sidebar-layout': isSidebarLayout }">
      <div v-if="!isSidebarLayout" class="participants-grid" :class="{
        'large-grid': participantCount > 12,
        ['count-' + (visibleParticipants.length + (hasOverflow ? 1 : 0))]: true
      }">
        <VideoCard v-for="p in visibleParticipants" :key="p.sid" :participant="p" />
        <!-- Overflow Card -->
        <div v-if="hasOverflow" class="overflow-card" @click="toggleParticipantsModal">
          <div class="overflow-content">
            <span class="overflow-count">+{{ overflowCount }}</span>
            <span class="overflow-label">participants</span>
          </div>
        </div>
      </div>

      <template v-else>
        <div class="stage-area">
          <VideoCard v-if="activeSpeaker" :participant="activeSpeaker" class="active-speaker" />
        </div>
        <div class="sidebar-strip hide-scrollbar">
          <VideoCard v-for="p in sidebarDisplayParticipants" :key="p.sid" :participant="p" class="small" />
          <!-- Sidebar Overflow Card -->
          <div v-if="sidebarOverflowCount > 0" class="overflow-card small" @click="toggleParticipantsModal">
            <div class="overflow-content">
              <span class="overflow-count">+{{ sidebarOverflowCount }}</span>
              <span class="overflow-label">more</span>
            </div>
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
        <button class="control-btn" :class="{ 'danger': !callStore.isMicrophoneEnabled }"
          @click="callStore.toggleMicrophone()" title="Toggle Mic">
          <svg v-if="callStore.isMicrophoneEnabled" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <rect x="9" y="1" width="6" height="14" rx="3" />
            <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v4M8 23h8" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="1" width="6" height="14" rx="3" />
            <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v4M8 23h8M2 2l20 20" />
          </svg>
        </button>

        <button class="control-btn" :class="{ 'danger': !callStore.isCameraEnabled }" @click="callStore.toggleCamera()"
          title="Toggle Camera">
          <svg v-if="callStore.isCameraEnabled" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>

          <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
            <path d="M1 2l22 21" />
          </svg>
        </button>

        <button class="control-btn" :class="{ 'danger': !callStore.isScreenShareEnabled }"
          @click="callStore.toggleScreenShare()" title="Share Screen">
          <svg v-if="callStore.isScreenShareEnabled" width="24" height="24" viewBox="0 0 24 24" fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 3H19C20.1046 3 21 3.89543 21 5V16C21 17.1046 20.1046 18 19 18H5C3.89543 18 3 17.1046 3 16V5C3 3.89543 3.89543 3 5 3Z"
              stroke="currentColor" stroke-width="2" />
            <path d="M3 21L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
            <path d="M12 15V8M12 8L15 11M12 8L9 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 3H19C20.1046 3 21 3.89543 21 5V16C21 17.1046 20.1046 18 19 18H5C3.89543 18 3 17.1046 3 16V5C3 3.89543 3.89543 3 5 3Z"
              stroke="currentColor" stroke-width="2" />
            <path d="M3 21H21" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
            <path d="M12 15V8M12 8L15 11M12 8L9 11" stroke="currentColor" stroke-width="2" />
            <path d="M3 3L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>

        <button class="control-btn danger" title="End Call" @click="handleEndCall">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
            <path d="M0 0h24v24H0z" fill="none" />
            <path
              d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
      </div>

      <div class="controls-group right">
        <!-- <button class="control-btn" title="Participants">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
           </button> -->
      </div>
    </footer>

    <!-- Participants Modal -->
    <div v-if="showParticipantsModal" class="modal-overlay" @click.self="toggleParticipantsModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Participants ({{ participantCount }})</h3>
          <button class="close-btn" @click="toggleParticipantsModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body hide-scrollbar">
          <div v-for="p in participants" :key="p.sid" class="modal-item">
            <div class="modal-item-info">
              <span class="user-avatar">{{ p.identity.charAt(0).toUpperCase() }}</span>
              <span class="user-name">
                {{ p.identity }}
                <span v-if="p.sid === callStore.localParticipant?.sid" class="you-badge">(You)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.call-container {
  width: 100vw;
  height: 100dvh;
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
  width: 100%;
  height: 100%;
  gap: var(--spacing-md);
  padding-right: 4px;
  overflow-y: auto;
  /* Default Desktop: Max 3 columns (Strict) */
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(200px, 1fr);
}

/* Explicit Desktop Layouts based on Count */
@media (min-width: 769px) {
  .participants-grid.count-1 {
    grid-template-columns: 1fr;
  }

  .participants-grid.count-2 {
    grid-template-columns: 1fr 1fr;
  }

  .participants-grid.count-3 {
    grid-template-columns: 1fr 1fr 1fr;
  }

  /* 4 Items -> 2x2 Grid (Balanced) */
  .participants-grid.count-4 {
    grid-template-columns: 1fr 1fr;
  }

  /* 5 & 6 Items -> 3 Columns */
  .participants-grid.count-5,
  .participants-grid.count-6 {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Mobile Grid Optimization (WhatsApp-style) */
@media (max-width: 768px) {
  .participants-grid {
    display: grid;
    height: 100%;
    /* Default to 1 column for 1-2 participants */
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(0, 1fr);
    gap: 8px;
    padding-right: 0;
    overflow-y: hidden;
    /* Try to fit on screen */
  }

  /* 3 or more items: Switch to 2 columns */
  .participants-grid.count-3,
  .participants-grid.count-4,
  .participants-grid.count-5,
  .participants-grid.count-6 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: repeat(2, 1fr);
    /* Force 2 rows usually? */
    grid-auto-rows: minmax(0, 1fr);
  }

  /* Specific tweak for 3 items to look nice:
     Item 3 spans full width? Or just let it be 50%? 
     Let's try to make the last item span 2 cols if it's the 3rd item in a 3-item grid.
  */
  .participants-grid.count-3 :last-child {
    grid-column: span 2;
  }

  /* Handle 5 and 6 items: 3 rows of 2 cols */
  .participants-grid.count-5,
  .participants-grid.count-6 {
    grid-template-rows: repeat(3, 1fr);
  }
}

.stage-area {
  flex: 1;
  height: 100%;
  display: flex;
}

.sidebar-strip {
  width: 360px;
  height: 100%;
  overflow-y: auto;
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 1rem;
  padding-right: 4px;
}

.active-speaker {
  width: 100%;
  height: 100%;
  border: 2px solid var(--color-accent);
  border-radius: 12px;
}

.sidebar-strip .participant-card.small {
  flex: 1;
  min-height: 0;
}


/* Sidebar Layout Mobile Optimization */
@media (max-width: 768px) {
  .main-content.sidebar-layout {
    flex-direction: column;
  }

  .main-content.sidebar-layout .stage-area {
    flex: 1;
    height: auto;
  }

  .main-content.sidebar-layout .sidebar-strip {
    width: 100%;
    height: 150px;
    display: flex;
    gap: 8px;
    /* Fixed height for the strip */
    flex-direction: row;
    /* Horizontal layout */
    overflow-x: auto;
    overflow-y: hidden;
    padding-right: 0;
    padding-bottom: 4px;
    flex-shrink: 0;
  }

  .main-content.sidebar-layout .participant-card.small, .overflow-card.small {
    flex: 0 0 calc(50% - 8px);
  }
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



/* Overflow Card Styles */
.overflow-card {
  background-color: var(--color-bg-dark);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.overflow-card:hover {
  background-color: var(--border-color);
}

.overflow-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.overflow-count {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.overflow-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  color: var(--color-text-primary);
  background: var(--border-color);
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.modal-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: var(--color-accent);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
}

.you-badge {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin-left: 4px;
}
</style>
