import { create } from 'zustand'

export interface VaultAuthInfo {
  vaultName: string
  userName: string
  createdAt?: string
}

export interface AuthState {
  hasChecked: boolean
  isLocked: boolean
  isFirstTime: boolean
  activeVaultPath: string | null
  vaultInfo: VaultAuthInfo | null
  
  // Actions
  checkAuth: () => Promise<void>
  unlock: (password: string) => Promise<{ success: boolean; error?: string }>
  lock: () => Promise<void>
  createVault: (params: {
    parentDirectory: string
    vaultName: string
    userName: string
    password: string
  }) => Promise<{ success: boolean; error?: string }>
  openVault: (folderPath: string) => Promise<{ success: boolean; error?: string }>
}

export const useAuthStore = create<AuthState>((set) => ({
  hasChecked: false,
  isLocked: false,
  isFirstTime: false,
  activeVaultPath: null,
  vaultInfo: null,

  checkAuth: async () => {
    if (!window.genesis?.checkAuthStatus) {
      set({ hasChecked: true, isLocked: false, isFirstTime: false })
      return
    }

    try {
      const status = await window.genesis.checkAuthStatus()
      if (!status.isProtected) {
        // First time user: no protected vault configured
        set({
          hasChecked: true,
          isFirstTime: true,
          isLocked: false,
          activeVaultPath: status.vaultPath,
          vaultInfo: null
        })
      } else {
        // Vault is protected
        set({
          hasChecked: true,
          isFirstTime: false,
          isLocked: !status.isUnlocked,
          activeVaultPath: status.vaultPath,
          vaultInfo: status.metadata
        })
      }
    } catch {
      set({ hasChecked: true, isFirstTime: true, isLocked: false })
    }
  },

  unlock: async (password: string) => {
    if (!window.genesis?.unlockVault) return { success: false, error: 'IPC not available' }
    const res = await window.genesis.unlockVault(password)
    if (res.success) {
      set((state) => ({
        isLocked: false,
        vaultInfo: {
          vaultName: res.vaultName || state.vaultInfo?.vaultName || 'Protected Vault',
          userName: res.userName || state.vaultInfo?.userName || 'User'
        }
      }))
      return { success: true }
    }
    return { success: false, error: res.error || 'Incorrect password' }
  },

  lock: async () => {
    if (window.genesis?.lockVault) {
      await window.genesis.lockVault()
    }
    set({ isLocked: true })
  },

  createVault: async (params) => {
    if (!window.genesis?.createProtectedVault) return { success: false, error: 'IPC not available' }
    const res = await window.genesis.createProtectedVault(params)
    if (res.success) {
      // Save user profile name
      localStorage.setItem('ng_user_name', params.userName)
      set({
        isFirstTime: false,
        isLocked: false,
        activeVaultPath: res.vaultPath,
        vaultInfo: {
          vaultName: res.vaultName,
          userName: res.userName
        }
      })
      return { success: true }
    }
    return { success: false, error: res.error || 'Failed to create vault' }
  },

  openVault: async (folderPath: string) => {
    if (!window.genesis?.openExistingVault) return { success: false, error: 'IPC not available' }
    const res = await window.genesis.openExistingVault(folderPath)
    if (res.success) {
      if (!res.isProtected) {
        set({
          isFirstTime: false,
          isLocked: false,
          activeVaultPath: res.vaultPath,
          vaultInfo: null
        })
      } else {
        set({
          isFirstTime: false,
          isLocked: !res.isUnlocked,
          activeVaultPath: res.vaultPath,
          vaultInfo: res.metadata
        })
      }
      return { success: true }
    }
    return { success: false, error: res.error || 'Failed to open directory' }
  }
}))

