import fs from 'fs'
import path from 'path'
import { VaultState } from './types'

export class McpStateManager {
  private configPath: string
  private state: VaultState

  constructor(vaultPath: string) {
    const genesisDir = path.join(vaultPath, '.genesis')
    if (!fs.existsSync(genesisDir)) {
      fs.mkdirSync(genesisDir, { recursive: true })
    }
    this.configPath = path.join(genesisDir, 'state.json')
    this.state = this.loadState(vaultPath)
  }

  private loadState(vaultPath: string): VaultState {
    const defaultState: VaultState = {
      currentVaultPath: vaultPath,
      lockedFiles: ['00-constitution/instructions.md'],
      mountedFiles: ['02-specs/checkout-screen.md'],
      targetRepoPath: path.resolve(vaultPath, '..'),
      mcpPort: 43110
    }

    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf-8')
        const parsed = JSON.parse(raw)
        return { ...defaultState, ...parsed, currentVaultPath: vaultPath }
      } catch (e) {
        console.error('Failed to parse .genesis/state.json, using defaults', e)
      }
    }

    this.saveState(defaultState)
    return defaultState
  }

  private saveState(state: VaultState): void {
    fs.writeFileSync(this.configPath, JSON.stringify(state, null, 2), 'utf-8')
  }

  public getState(): VaultState {
    return { ...this.state }
  }

  public toggleLockedFile(fileId: string): boolean {
    const index = this.state.lockedFiles.indexOf(fileId)
    let isLockedNow = false
    if (index >= 0) {
      this.state.lockedFiles.splice(index, 1)
      isLockedNow = false
    } else {
      this.state.lockedFiles.push(fileId)
      isLockedNow = true
    }
    this.saveState(this.state)
    return isLockedNow
  }

  public toggleMountedFile(fileId: string): boolean {
    const index = this.state.mountedFiles.indexOf(fileId)
    let isMountedNow = false
    if (index >= 0) {
      this.state.mountedFiles.splice(index, 1)
      isMountedNow = false
    } else {
      this.state.mountedFiles.push(fileId)
      isMountedNow = true
    }
    this.saveState(this.state)
    return isMountedNow
  }

  public setTargetRepoPath(targetRepo: string): void {
    this.state.targetRepoPath = targetRepo
    this.saveState(this.state)
  }

  public renameFile(oldId: string, newId: string): void {
    const lockIdx = this.state.lockedFiles.indexOf(oldId)
    if (lockIdx !== -1) {
      this.state.lockedFiles[lockIdx] = newId
    }
    const mountIdx = this.state.mountedFiles.indexOf(oldId)
    if (mountIdx !== -1) {
      this.state.mountedFiles[mountIdx] = newId
    }
    this.saveState(this.state)
  }

  public isLocked(fileId: string): boolean {
    return this.state.lockedFiles.includes(fileId)
  }

  public isMounted(fileId: string): boolean {
    return this.state.mountedFiles.includes(fileId)
  }
}
