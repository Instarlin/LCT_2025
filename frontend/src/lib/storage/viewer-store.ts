import { create } from 'zustand'

type ViewerState = {
  fullscreen: boolean
  setFullscreen: (value: boolean) => void
  reset: () => void
}

export const useViewerStore = create<ViewerState>((set) => ({
  fullscreen: false,
  setFullscreen: (fullscreen) => set({ fullscreen }),
  reset: () => set({ fullscreen: false }),
}))
