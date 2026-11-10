import { create } from 'zustand'

export interface Criterion {
  criterionId: string
  fileId: string
  description: string
  verifyCmd?: string
  checked: boolean
}

export interface McpMission {
  constitution: string
  mountedSpecs: Array<{ id: string; title: string; resolvedContent: string; targetRepo?: string }>
  connectedGraph: {
    forwardLinks: Array<{ from: string; to: string; title: string }>
    backlinks: Array<{ specId: string; affectedBy: string; blastRadiusNotice: string }>
  }
  acceptanceCriteria: Criterion[]
  totalTokens: number
  tokenBudget: number
}

interface McpStore {
  mission: McpMission | null
  isVerifying: Record<string, boolean>
  isJsonModalOpen: boolean
  isDrawerOpen: boolean
  isDockOpen: boolean
  isSettingsOpen: boolean
  setJsonModalOpen: (open: boolean) => void
  setDrawerOpen: (open: boolean) => void
  setDockOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  fetchMission: () => Promise<void>
  verifyCriterion: (criterionId: string) => Promise<{ success: boolean; stderr?: string; stdout?: string }>
}

export const useMcpStore = create<McpStore>((set, get) => ({
  mission: null,
  isVerifying: {},
  isJsonModalOpen: false,
  isDrawerOpen: false,   // Default closed on startup as requested
  isDockOpen: false,     // Toggled via icon near terminal
  isSettingsOpen: false, // Settings modal toggle

  setJsonModalOpen: (open) => set({ isJsonModalOpen: open }),
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
  setDockOpen: (open) => set({ isDockOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  fetchMission: async () => {
    if (!window.genesis) return
    try {
      const mission = await window.genesis.getMission()
      set({ mission })
    } catch (e) {
      console.error('Failed to load MCP mission bundle:', e)
    }
  },

  verifyCriterion: async (criterionId: string) => {
    if (!window.genesis) return { success: false }
    set((state) => ({ isVerifying: { ...state.isVerifying, [criterionId]: true } }))

    try {
      const res = await window.genesis.verifyCriterion(criterionId)
      await get().fetchMission()
      set((state) => ({ isVerifying: { ...state.isVerifying, [criterionId]: false } }))
      return res
    } catch (err: any) {
      set((state) => ({ isVerifying: { ...state.isVerifying, [criterionId]: false } }))
      return { success: false, stderr: err.message }
    }
  }
}))
