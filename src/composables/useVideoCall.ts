import { ref, type Ref, shallowRef } from 'vue'
import {
  Room,
  RoomEvent,
  Participant,
  LocalParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  LocalTrackPublication,
} from 'livekit-client'


export interface ParticipantInfo {
  participant: Participant
}

export interface UseVideoCallReturn {
  isConnected: Ref<boolean>
  isMicrophoneEnabled: Ref<boolean>
  isCameraEnabled: Ref<boolean>
  isScreenShareEnabled: Ref<boolean>
  participants: Ref<Map<string, ParticipantInfo>>
  localParticipant: Ref<LocalParticipant | undefined>
  connectRoom: (roomNameInput: string, userNameInput: string) => Promise<void>
  setupEventListeners: () => void
  toggleCamera: (enable?: boolean) => Promise<void>
  toggleMic: (enable?: boolean) => Promise<void>
  toggleScreenShare: (enable?: boolean) => Promise<void>
  disconnectRoom: () => Promise<void>
}

const isConnected = ref(false)
const isMicrophoneEnabled = ref(false)
const isCameraEnabled = ref(false)
const isScreenShareEnabled = ref(false)

const participants = shallowRef<Map<string, ParticipantInfo>>(new Map())
const localParticipant: Ref<LocalParticipant | undefined> = ref(undefined)


const Config = {
  TOKEN_URL: import.meta.env.VITE_SERVER_URL,
  LIVEKIT_URL: import.meta.env.VITE_LIVEKIT_URL,

  DEFAULT_VIDEO_ENCODING: {
    maxBitrate: 3_000_000,
  },
  DEFAULT_VIDEO_CODEC: 'vp8' as const,
}

let room: Room | undefined

function getToken(roomname: string, participantName: string) {
  return fetch(Config.TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomName: roomname,
      participantName: participantName,
    }),
  })
    .then((response) => response.json())
    .then((data) => data.token)
    .catch((error) => {
      console.error('Error fetching token:', error)
      throw error
    })
}

export function useVideoCall(): UseVideoCallReturn {
  function updateParticipants() {
    participants.value = new Map(participants.value)
  }

  function handleParticipantConnected(participant: Participant) {

    if (!participants.value.has(participant.sid)) {
      participants.value.set(participant.sid, {
        participant: participant,
      })
      updateParticipants()
    }
  }

  function handleParticipantDisconnected(participant: Participant) {

    participants.value.delete(participant.sid)
    updateParticipants()
  }

  function handleActiveSpeakersChanged(activeSpeakers: Participant[]) {
    activeSpeakers.forEach((speaker) => {
      if (participants.value.has(speaker.sid)) {
        const p = participants.value.get(speaker.sid)
        if (p) {
          p.participant = speaker
        }
      }
    })
    updateParticipants()
  }

  function handleTrackSubscribed(
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: Participant,
  ) {


    window.dispatchEvent(
      new CustomEvent('livekit-attach-track', {
        detail: { track, participantSid: participant.sid },
      }),
    )
  }

  function handleTrackUnsubscribed(
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: Participant,
  ) {

    window.dispatchEvent(
      new CustomEvent('livekit-detach-track', {
        detail: { track, participantSid: participant.sid },
      }),
    )
  }

  function handleLocalTrackPublished(publication: LocalTrackPublication, participant: Participant) {

    if (publication.track) {
      window.dispatchEvent(
        new CustomEvent('livekit-attach-track', {
          detail: { track: publication.track, participantSid: participant.sid },
        }),
      )
    }
  }

  function handleLocalTrackUnpublished(
    publication: LocalTrackPublication,
    participant: Participant,
  ) {

    if (publication.track) {
      window.dispatchEvent(
        new CustomEvent('livekit-detach-track', {
          detail: { track: publication.track, participantSid: participant.sid },
        }),
      )
    }
  }

  function handleRoomDisconnected() {

    isConnected.value = false
    isCameraEnabled.value = false
    isMicrophoneEnabled.value = false
    isScreenShareEnabled.value = false
    participants.value.clear()
    updateParticipants()
    room = undefined
  }

  async function connectRoom(roomNameInput: string, userNameInput: string) {

    if (isConnected.value) {

      return
    }

    let token
    try {
      token = await getToken(roomNameInput, userNameInput)

      if (!token) {
        console.error('Failed to get token')
        return
      }
    } catch (error) {
      console.error('Error fetching token:', error)
      return
    }


    if (!room) {
      room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          videoEncoding: Config.DEFAULT_VIDEO_ENCODING,
          videoCodec: Config.DEFAULT_VIDEO_CODEC,
        },
      })
    }
    setupEventListeners()
    try {

      await room.connect(Config.LIVEKIT_URL, token)


      isConnected.value = true
      localParticipant.value = room.localParticipant
      handleParticipantConnected(room.localParticipant)
      room.remoteParticipants.forEach(handleParticipantConnected)

      isMicrophoneEnabled.value = false
      isScreenShareEnabled.value = false
    } catch (error) {
      console.error('Failed to connect to room:', error)
      isConnected.value = false
      room = undefined
    }
  }

  function setupEventListeners() {
    if (!room) return

    room
      .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
      .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
      .on(RoomEvent.Disconnected, handleRoomDisconnected)
      .on(RoomEvent.Reconnecting, () => { })
      .on(RoomEvent.Reconnecting, () => { })
      .on(RoomEvent.Reconnected, () => { })
      .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
  }

  async function toggleCamera(enable?: boolean) {
    if (!room || !room.localParticipant) return
    const newState = typeof enable === 'boolean' ? enable : !isCameraEnabled.value

    try {
      await room.localParticipant.setCameraEnabled(newState)
      isCameraEnabled.value = newState

    } catch (error) {
      console.error('Error toggling camera:', error)
      isCameraEnabled.value = room.localParticipant.isCameraEnabled
    }
  }

  async function toggleMic(enable?: boolean) {
    if (!room || !room.localParticipant) return
    const newState = typeof enable === 'boolean' ? enable : !isMicrophoneEnabled.value

    try {
      await room.localParticipant.setMicrophoneEnabled(newState)
      isMicrophoneEnabled.value = newState

    } catch (error) {
      console.error('Error toggling Mic:', error)
      isMicrophoneEnabled.value = room.localParticipant.isMicrophoneEnabled
    }
  }

  async function toggleScreenShare(enable?: boolean) {
    if (!room || !room.localParticipant) return
    const newState = typeof enable === 'boolean' ? enable : !isScreenShareEnabled.value

    try {
      await room.localParticipant.setScreenShareEnabled(newState)
      isScreenShareEnabled.value = newState
    } catch (error) {
      console.error('Error toggling screen share:', error)
      isScreenShareEnabled.value = room.localParticipant.isScreenShareEnabled
    }
  }

  async function disconnectRoom() {
    if (room) {

      await room.disconnect()

    }
  }


  return {
    isConnected,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    connectRoom,
    setupEventListeners,
    participants,
    localParticipant,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
    disconnectRoom,
  }
}
