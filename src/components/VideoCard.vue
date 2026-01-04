<script setup lang="ts">
import { type Participant, type Track, Track as LivekitTrack, ParticipantEvent, createAudioAnalyser, type AudioAnalyserOptions, TrackPublication, type LocalAudioTrack, type RemoteAudioTrack } from 'livekit-client'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useCallStore } from '@/stores/call'

const callStore = useCallStore()

const props = defineProps<{
  participant: Participant
}>()

const videoElement = ref<HTMLVideoElement | null>(null)
const audioElement = ref<HTMLAudioElement | null>(null)

const isSpeaking = ref(false)
const remoteIsCameraEnabled = ref(false)
const remoteIsMicrophoneEnabled = ref(false)
const audioLevel = ref(0)

const isMine = computed(() => {
  return props.participant.sid === callStore.localParticipant?.sid
})

const isMicrophoneEnabled = computed(() => {
  if (isMine.value) {
    return callStore.isMicrophoneEnabled
  }
  return remoteIsMicrophoneEnabled.value
})

const isCameraEnabled = computed(() => {
  if (isMine.value) {
    return callStore.isCameraEnabled
  }
  return remoteIsCameraEnabled.value
})

let audioAnalyser: { calculateVolume: () => number; cleanup: () => void } | undefined
let animationFrameId: number

const startAudioVisualizer = (track: Track) => {
  // We ensure the track is an instance of LivekitTrack and definitively an Audio track.
  // This narrowing is required for the audioAnalyser helper to function correctly.
  if (!(track instanceof LivekitTrack) || track.kind !== LivekitTrack.Kind.Audio) {
    return
  }

  // Custom type guard to convince TypeScript that the track has been correctly filtered.
  const isAudioTrack = (t: Track): t is LocalAudioTrack | RemoteAudioTrack => {
    return t.kind === LivekitTrack.Kind.Audio
  }

  if (!isAudioTrack(track)) return

  // Stop existing if any
  stopAudioVisualizer()

  const options: AudioAnalyserOptions = { smoothingTimeConstant: 0.8 }
  audioAnalyser = createAudioAnalyser(track, options)

  const updateVolume = () => {
    if (audioAnalyser) {
      const vol = audioAnalyser.calculateVolume()
      audioLevel.value = vol
      animationFrameId = requestAnimationFrame(updateVolume)
    }
  }
  updateVolume()
}

const stopAudioVisualizer = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (audioAnalyser) {
    audioAnalyser.cleanup()
    audioAnalyser = undefined
  }
  audioLevel.value = 0
}

function attachTrack(track: Track | null | undefined, el: HTMLMediaElement | null) {
  if (track && el) {
    track.attach(el)
  }
}

function detachTrack(track: Track | null | undefined, el: HTMLMediaElement | null) {
  if (track && el) {
    track.detach(el)
  }
}

const handleTrackSubscribed = (track: Track) => {
  if (track.kind === LivekitTrack.Kind.Video) {
    attachTrack(track, videoElement.value)
    remoteIsCameraEnabled.value = true
  } else if (track instanceof LivekitTrack && track.kind === LivekitTrack.Kind.Audio) {
    // We only attach audio tracks for remote participants to prevent local echo. 
    // The AudioAnalyser however is run for everyone to show visual feedback.
    if (!previousIsMine.value) {
      attachTrack(track, audioElement.value)
    }
    remoteIsMicrophoneEnabled.value = true
    startAudioVisualizer(track)
  }
}

const handleTrackUnsubscribed = (track: Track) => {
  if (track.kind === LivekitTrack.Kind.Video) {
    detachTrack(track, videoElement.value)
    remoteIsCameraEnabled.value = false
  } else if (track.kind === LivekitTrack.Kind.Audio) {
    detachTrack(track, audioElement.value)
    remoteIsMicrophoneEnabled.value = false
    stopAudioVisualizer()
  }
}

const onTrackMuted = (pub: TrackPublication) => {
  if (pub.kind === LivekitTrack.Kind.Audio) {
    remoteIsMicrophoneEnabled.value = false
  } else if (pub.kind === LivekitTrack.Kind.Video) {
    remoteIsCameraEnabled.value = false
  }
}

const onTrackUnmuted = (pub: TrackPublication) => {
  if (pub.kind === LivekitTrack.Kind.Audio) {
    remoteIsMicrophoneEnabled.value = true
  } else if (pub.kind === LivekitTrack.Kind.Video) {
    remoteIsCameraEnabled.value = true
  }
}

const onIsSpeakingChanged = (speaking: boolean) => {
  isSpeaking.value = speaking
}

const updateState = () => {
  isSpeaking.value = props.participant.isSpeaking
  remoteIsCameraEnabled.value = props.participant.isCameraEnabled
  remoteIsMicrophoneEnabled.value = props.participant.isMicrophoneEnabled
  audioLevel.value = props.participant.audioLevel
}

// Track the initial 'isMine' state to handle logic that depends on whether 
// the participant was local when the component was first mounted.
const previousIsMine = ref(false)

function setupTrackListeners() {
  // Iterate existing tracks
  const pubs = Array.from(props.participant.trackPublications.values())
  pubs.forEach(pub => {
    if (pub.track) {
      handleTrackSubscribed(pub.track)
    }
  })

  // Listen for future tracks
  props.participant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed)
  props.participant.on(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed)

  props.participant
    .on(ParticipantEvent.TrackMuted, onTrackMuted)
    .on(ParticipantEvent.TrackUnmuted, onTrackUnmuted)
    .on(ParticipantEvent.IsSpeakingChanged, onIsSpeakingChanged)

  // Handle Local Track Publication if this is local participant
  if (isMine.value) {
    props.participant.on(ParticipantEvent.LocalTrackPublished, (pub) => {
      if (pub.track) handleTrackSubscribed(pub.track)
    })
    props.participant.on(ParticipantEvent.LocalTrackUnpublished, (pub) => {
      if (pub.track) handleTrackUnsubscribed(pub.track)
    })
  }
}

onMounted(() => {
  previousIsMine.value = isMine.value
  updateState()
  setupTrackListeners()
})

onUnmounted(() => {
  props.participant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed)
  props.participant.off(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed)
  props.participant.off(ParticipantEvent.TrackMuted, onTrackMuted)
  props.participant.off(ParticipantEvent.TrackUnmuted, onTrackUnmuted)
  props.participant.off(ParticipantEvent.IsSpeakingChanged, onIsSpeakingChanged)

  stopAudioVisualizer()

  // Detach all
  const pubs = Array.from(props.participant.trackPublications.values())
  pubs.forEach(pub => {
    if (pub.track) {
      if (pub.track.kind === LivekitTrack.Kind.Video) {
        detachTrack(pub.track, videoElement.value)
      } else if (pub.track.kind === LivekitTrack.Kind.Audio) {
        detachTrack(pub.track, audioElement.value)
      }
    }
  })
})
</script>

<template>
  <div class="participant-card" :class="{ 'speaking': isSpeaking }">

    <video ref="videoElement" class="video-layer" autoplay playsinline :class="{ 'hidden': !isCameraEnabled }"></video>
    <audio ref="audioElement" autoplay></audio>

    <div v-if="!isCameraEnabled" class="avatar-placeholder" :style="{ transform: `scale(${1 + audioLevel * 0.5})` }">
      {{ participant.identity?.substring(0, 2).toUpperCase() || '??' }}
    </div>

    <div class="participant-name">{{ participant.identity }}</div>

    <div class="mic-status" :class="{ 'muted': !isMicrophoneEnabled }">
      <svg v-if="!isMicrophoneEnabled" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
      <div v-else class="audio-bars">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.participant-card {
  background-color: var(--bg-card, #18181b);
  border: 1px solid var(--border-color, #27272a);
  border-radius: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  transition: border-color 0.2s;
  width: 100%;
  height: 100%;
}

.participant-card.speaking {
  border-color: var(--color-accent, #3b82f6);
}

.video-layer {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
  z-index: 1;
}

.video-layer.hidden {
  display: none;
}

.avatar-placeholder {
  width: 64px;
  height: 64px;
  background: var(--color-bg-dark, #09090b);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-secondary, #a1a1aa);
  z-index: 0;
  transition: transform 0.1s ease-out;
}

.participant-name {
  position: absolute;
  bottom: 12px;
  left: 12px;
  font-size: 13px;
  font-weight: 500;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.mic-status {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.5);
  padding: 6px;
  border-radius: 4px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mic-status.muted {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}


.audio-bars {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 12px;
}

.bar {
  width: 3px;
  background-color: #22c55e;
  animation: bounce 1s infinite ease-in-out;
}

.bar:nth-child(1) {
  height: 6px;
  animation-delay: 0s;
}

.bar:nth-child(2) {
  height: 12px;
  animation-delay: 0.1s;
}

.bar:nth-child(3) {
  height: 8px;
  animation-delay: 0.2s;
}

@keyframes bounce {

  0%,
  100% {
    transform: scaleY(0.5);
  }

  50% {
    transform: scaleY(1);
  }
}
</style>
