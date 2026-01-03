<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toaster-container">
    <TransitionGroup name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast-item"
        :class="[toast.type, toast.position]"
        role="alert"
      >
        <div class="toast-content">
            <span class="toast-message">{{ toast.message }}</span>
        </div>
        <button @click="dismiss(toast.id)" class="close-btn">&times;</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toaster-container {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
}

.toast-item {
    position: absolute;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 24px;
    min-width: 300px;
    max-width: 400px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background-color: white;
    color: #18181b;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px; 
    font-weight: 500;
    transition: all 0.3s ease;
}

/* Positions */
.toast-item.top-right {
    top: 20px;
    right: 20px;
}
.toast-item.top-left {
    top: 20px;
    left: 20px;
}
.toast-item.bottom-right {
    bottom: 20px;
    right: 20px;
}
.toast-item.bottom-left {
    bottom: 20px;
    left: 20px;
}

.toast-item.error {
    background-color: #ef4444;
    color: white;
}
.toast-item.success {
    background-color: #22c55e;
    color: white;
}
.toast-item.info {
    background-color: #3b82f6;
    color: white;
}
.toast-item.warning {
    background-color: #f59e0b;
    color: white;
}

.close-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    opacity: 0.7;
    color: inherit;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
.close-btn:hover {
    opacity: 1;
}


/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
