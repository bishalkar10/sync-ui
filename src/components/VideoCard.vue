<script setup lang="ts">
import { type Participant, type Track, Track as LivekitTrack, ParticipantEvent, RoomEvent, createAudioAnalyser, type AudioAnalyserOptions, TrackPublication } from 'livekit-client'
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useVideoCall } from '@/composables/useVideoCall'

const { localParticipant, isMicrophoneEnabled: isLocalMicrophoneEnabled, isCameraEnabled: isLocalCameraEnabled } = useVideoCall()

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
  return props.participant.sid === localParticipant.value?.sid
})

const isMicrophoneEnabled = computed(() => {
  if (isMine.value) {
    return isLocalMicrophoneEnabled.value
  }
  return remoteIsMicrophoneEnabled.value
})

const isCameraEnabled = computed(() => {
  if (isMine.value) {
    return isLocalCameraEnabled.value
  }
  return remoteIsCameraEnabled.value
})

let audioAnalyser: { calculateVolume: () => number; cleanup: () => void } | undefined
let animationFrameId: number

const startAudioVisualizer = (track: Track) => {
  if (track.kind !== LivekitTrack.Kind.Audio) return

  // Stop existing if any
  stopAudioVisualizer()

  const options: AudioAnalyserOptions = { smoothingTimeConstant: 0.8 }
  // @ts-ignore - Types might mismatch slightly depending on version, but this is the helper signature
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

interface TrackEventDetail {
  track: Track
  participantSid: string
}

const handleAttachTrackEvent = (event: Event) => {
  const customEvent = event as CustomEvent<TrackEventDetail>
  const { track, participantSid } = customEvent.detail

  if (participantSid !== props.participant.sid) return

  if (track.kind === LivekitTrack.Kind.Video) {
    attachTrack(track, videoElement.value)
    remoteIsCameraEnabled.value = true
  } else if (track.kind === LivekitTrack.Kind.Audio) {
    if (!previousIsMine.value) { // Only attach audio for remote participants to avoid echo
       attachTrack(track, audioElement.value)
    }
    remoteIsMicrophoneEnabled.value = true
    startAudioVisualizer(track)
  }
}

const handleDetachTrackEvent = (event: Event) => {
  const customEvent = event as CustomEvent<TrackEventDetail>
  const { track, participantSid } = customEvent.detail

  if (participantSid !== props.participant.sid) return

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

// Needed to avoid echo for local participant - we check this in handleAttach, 
// but we need it reactive because 'isMine' is computed.
const previousIsMine = ref(false) 

onMounted(() => {
  previousIsMine.value = isMine.value
  updateState() 

  window.addEventListener('livekit-attach-track', handleAttachTrackEvent)
  window.addEventListener('livekit-detach-track', handleDetachTrackEvent)
  
  // Listen to participant events directly
  props.participant
    .on(ParticipantEvent.TrackMuted, onTrackMuted)
    .on(ParticipantEvent.TrackUnmuted, onTrackUnmuted)
    .on(ParticipantEvent.IsSpeakingChanged, onIsSpeakingChanged)


  props.participant.trackPublications.forEach((pub) => {
    if (pub.track) {
      if (pub.track.kind === LivekitTrack.Kind.Audio) {
        startAudioVisualizer(pub.track)
      }
      handleAttachTrackEvent(
        new CustomEvent('livekit-attach-track', {
          detail: { track: pub.track, participantSid: props.participant.sid },
        }),
      )
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('livekit-attach-track', handleAttachTrackEvent)
  window.removeEventListener('livekit-detach-track', handleDetachTrackEvent)
  
  stopAudioVisualizer()
  props.participant.removeAllListeners()

  props.participant.trackPublications.forEach((pub) => {
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
      <svg v-if="!isMicrophoneEnabled" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
      <div v-else class="audio-bars"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>
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
  min-height: 200px;
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
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
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

.bar:nth-child(1) { height: 6px; animation-delay: 0s; }
.bar:nth-child(2) { height: 12px; animation-delay: 0.1s; }
.bar:nth-child(3) { height: 8px; animation-delay: 0.2s; }

@keyframes bounce {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}
</style>
