import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { useToast } from '@/composables/useToast'
import {
  Room,
  RoomEvent,
  Participant,
} from 'livekit-client'

export const useCallStore = defineStore('call', () => {
  // --- State ---
  // We use shallowRef for complex class instances like Room to prevent Vue 
  // from deep-proxying their internal state, which can cause side effects 
  // or performance issues with third-party SDKs.
  const room = shallowRef<Room | undefined>(undefined)
  const isConnected = ref(false)
  
  // A Map allows for efficient lookups by SID during participant events.
  const participants = shallowRef<Map<string, Participant>>(new Map())
  
  // Local device state
  const isCameraEnabled = ref(false)
  const isMicrophoneEnabled = ref(false)
  const isScreenShareEnabled = ref(false)

  // --- Configuration ---
  const CONFIG = {
    TOKEN_URL: import.meta.env.VITE_SERVER_URL,
    LIVEKIT_URL: import.meta.env.VITE_LIVEKIT_URL,
    DEFAULT_VIDEO_ENCODING: {
      maxBitrate: 3_000_000,
    },
    DEFAULT_VIDEO_CODEC: 'vp8' as const,
  }

  // --- Getters ---
  const localParticipant = computed(() => room.value?.localParticipant)
  
  const participantList = computed(() => {
    return Array.from(participants.value.values())
  })

  const hasActiveScreenShare = computed(() => {
    return participantList.value.some(p => p.isScreenShareEnabled)
  })

  // --- Actions ---

  function updateParticipants() {
    // We re-assign the Map to a new instance to trigger Vue's reactivity system
    // since shallowRef only tracks the identity of the object itself.
    participants.value = new Map(participants.value)
  }

  function handleParticipantConnected(participant: Participant) {
    if (!participants.value.has(participant.sid)) {
      participants.value.set(participant.sid, participant)
      updateParticipants()
    }
  }

  function handleParticipantDisconnected(participant: Participant) {
    participants.value.delete(participant.sid)
    updateParticipants()
  }

  function handleActiveSpeakersChanged(_activeSpeakers: Participant[]) {
    // Manual trigger for UI components that rely on the speaking state of participants.
    updateParticipants()
  }

  function handleRoomDisconnected() {
    isConnected.value = false
    participants.value.clear()
    isCameraEnabled.value = false
    isMicrophoneEnabled.value = false
    isScreenShareEnabled.value = false
    room.value = undefined
  }

  // Token Fetcher
  async function getToken(roomName: string, participantName: string): Promise<string> {
    const response = await fetch(CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, participantName }),
    })
    const data = await response.json()
    return data.token
  }

  // Connect
  async function connect(roomName: string, userName: string) {
    if (isConnected.value) return

    try {
      const token = await getToken(roomName, userName)

      room.value = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoEncoding: CONFIG.DEFAULT_VIDEO_ENCODING,
          videoCodec: CONFIG.DEFAULT_VIDEO_CODEC,
        },
      })

      // Setup Listeners
      room.value
        .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
        .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
        .on(RoomEvent.TrackPublished, updateParticipants)
        .on(RoomEvent.TrackUnpublished, updateParticipants)
        .on(RoomEvent.Disconnected, handleRoomDisconnected)
        // Note: Track-specific events are handled within individual VideoCard components
        // to keep this store focused on room membership and global state.
  
      await room.value.connect(CONFIG.LIVEKIT_URL, token)
      
      isConnected.value = true
      
      // Initialize lists
      if (room.value.localParticipant) {
        handleParticipantConnected(room.value.localParticipant)
      }
      room.value.remoteParticipants.forEach(handleParticipantConnected)
      
    } catch (error) {
      console.error('Failed to connect:', error)
      throw error // Re-throw to let UI handle error
    }
  }

  async function disconnect() {
    await room.value?.disconnect()
    handleRoomDisconnected()
  }

  // Device Toggles
  async function toggleCamera(enable?: boolean) {
    if (!room.value?.localParticipant) return
    const { toast } = useToast()
    
    try {
      const newState = enable ?? !isCameraEnabled.value
      await room.value.localParticipant.setCameraEnabled(newState)
      isCameraEnabled.value = newState
    } catch (error: any) {
      console.error('Error toggling camera:', error)
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission denied')) {
        toast.error('Camera permission denied. Please allow access in your browser settings.')
      } else {
        toast.error(`Failed to toggle camera: ${error.message || 'Unknown error'}`)
      }
      // Revert state if needed, though here we only update state on success
    }
  }

  async function toggleMicrophone(enable?: boolean) {
    if (!room.value?.localParticipant) return
    const { toast } = useToast()

    try {
      const newState = enable ?? !isMicrophoneEnabled.value
      await room.value.localParticipant.setMicrophoneEnabled(newState)
      isMicrophoneEnabled.value = newState
    } catch (error: any) {
      console.error('Error toggling microphone:', error)
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission denied')) {
        toast.error('Microphone permission denied. Please allow access in your browser settings.')
      } else {
        toast.error(`Failed to toggle microphone: ${error.message || 'Unknown error'}`)
      }
    }
  }

  async function toggleScreenShare(enable?: boolean) {
    if (!room.value?.localParticipant) return
    const { toast } = useToast()

    try {
      const newState = enable ?? !isScreenShareEnabled.value
      await room.value.localParticipant.setScreenShareEnabled(newState)
      isScreenShareEnabled.value = newState
    } catch (error: any) {
      console.error('Error toggling screen share:', error)
      if (error.name === 'NotAllowedError' || error.message?.includes('Permission denied')) {
        toast.error('Screen sharing permission denied.')
      } else {
        toast.error(`Failed to toggle screen share: ${error.message || 'Unknown error'}`)
      }
    }
  }

  return {
    room,
    isConnected,
    participants,
    participantList,
    localParticipant,
    hasActiveScreenShare,
    isCameraEnabled,
    isMicrophoneEnabled,
    isScreenShareEnabled,
    connect,
    disconnect,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
  }
})
