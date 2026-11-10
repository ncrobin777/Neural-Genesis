import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export const genesisAPI = {
  // Vault operations
  getFiles: () => ipcRenderer.invoke('vault:get-files'),
  readFile: (fileId: string) => ipcRenderer.invoke('vault:read-file', fileId),
  writeFile: (fileId: string, content: string) => ipcRenderer.invoke('vault:write-file', { fileId, content }),
  renameFile: (oldFileId: string, newFileId: string) =>
    ipcRenderer.invoke('vault:rename-file', { oldFileId, newFileId }),
  deleteFile: (fileId: string) => ipcRenderer.invoke('vault:delete-file', fileId),
  toggleLock: (fileId: string) => ipcRenderer.invoke('vault:toggle-lock', fileId),
  toggleMount: (fileId: string) => ipcRenderer.invoke('vault:toggle-mount', fileId),
  selectFolder: () => ipcRenderer.invoke('vault:select-folder'),
  selectTargetRepo: () => ipcRenderer.invoke('vault:select-target-repo'),

  // Vault Auth & Encryption operations
  checkAuthStatus: () => ipcRenderer.invoke('vault:check-auth-status'),
  createProtectedVault: (params: {
    parentDirectory: string
    vaultName: string
    userName: string
    password: string
  }) => ipcRenderer.invoke('vault:create-protected', params),
  unlockVault: (password: string) => ipcRenderer.invoke('vault:unlock', { password }),
  lockVault: () => ipcRenderer.invoke('vault:lock'),
  openExistingVault: (folderPath: string) => ipcRenderer.invoke('vault:open-existing', { folderPath }),

  // MCP operations
  getMission: () => ipcRenderer.invoke('mcp:get-mission'),
  verifyCriterion: (criterionId: string, summary?: string) =>
    ipcRenderer.invoke('mcp:verify-criterion', { criterionId, summary }),

  // PTY operations
  initPty: () => ipcRenderer.invoke('pty:init'),
  sendPtyInput: (data: string) => ipcRenderer.send('pty:input', data),
  runPtyCommand: (cmd: string) => ipcRenderer.invoke('pty:run-command', cmd),

  // Subscriptions
  onPtyData: (callback: (data: string) => void) => {
    const listener = (_: any, data: string) => callback(data)
    ipcRenderer.on('pty:data', listener)
    return () => {
      ipcRenderer.removeListener('pty:data', listener)
    }
  },
  onMcpEvent: (callback: (event: { event: string }) => void) => {
    const listener = (_: any, event: { event: string }) => callback(event)
    ipcRenderer.on('terminal:mcp-event', listener)
    return () => {
      ipcRenderer.removeListener('terminal:mcp-event', listener)
    }
  },
  onFileIndexed: (callback: (data: { fileId: string }) => void) => {
    const listener = (_: any, data: { fileId: string }) => callback(data)
    ipcRenderer.on('vault:file-indexed', listener)
    return () => {
      ipcRenderer.removeListener('vault:file-indexed', listener)
    }
  },
  onMutateCriterion: (callback: (data: { criterionId: string; fileId: string; checked: boolean }) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('editor:mutate-criterion', listener)
    return () => {
      ipcRenderer.removeListener('editor:mutate-criterion', listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('genesis', genesisAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.genesis = genesisAPI
}
