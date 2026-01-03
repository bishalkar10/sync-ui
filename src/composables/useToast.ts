/**
 * Global toast notification system.
 * Uses a singleton state pattern to allow triggering notifications from 
 * anywhere in the application without needing to inject components.
 */
import { ref, computed } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  type?: ToastType
}

export interface Toast extends ToastOptions {
  id: number
  message: string // Main content, alias for compatibility or primary text
}

const toasts = ref<Toast[]>([])
let counter = 0

const DEFAULT_DURATION = 4000
const DEFAULT_POSITION = 'top-right'

function addToast(message: string, options: ToastOptions = {}) {
  const id = counter++
  const toast: Toast = {
    id,
    message,
    duration: DEFAULT_DURATION,
    position: DEFAULT_POSITION,
    type: 'info',
    ...options,
  }

  toasts.value.push(toast)

  if (toast.duration !== Infinity) {
    setTimeout(() => {
      dismiss(id)
    }, toast.duration)
  }

  return id
}

function dismiss(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export const useToast = () => {
  return {
    toasts: computed(() => toasts.value),
    dismiss,
    toast: Object.assign((message: string, options?: ToastOptions) => addToast(message, options), {
      success: (message: string, options?: ToastOptions) => addToast(message, { ...options, type: 'success' }),
      error: (message: string, options?: ToastOptions) => addToast(message, { ...options, type: 'error' }),
      info: (message: string, options?: ToastOptions) => addToast(message, { ...options, type: 'info' }),
      warning: (message: string, options?: ToastOptions) => addToast(message, { ...options, type: 'warning' }),
    }),
  }
}
