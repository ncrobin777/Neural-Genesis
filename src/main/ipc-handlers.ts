import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { VaultDatabase } from './indexer/vault-db'
import { McpStateManager } from './mcp-state-manager'
import { ContextCompiler } from './indexer/context-compiler'
import { SpecVerifier } from './mcp/verifier'
import { SpecMutator } from './mcp/mutator'
import { PtyManager } from './pty-manager'
import { vaultCrypto } from './vault-crypto'

export function registerIpcHandlers(
  getVaultPath: () => string,
  setVaultPath: (newPath: string) => void,
  _getDb: () => VaultDatabase,
  getStateManager: () => McpStateManager,
  getCompiler: () => ContextCompiler,
  getMutator: () => SpecMutator,
  getPtyManager: () => PtyManager,
  getMainWindow: () => BrowserWindow | null
): void {
  // Vault Explorer & File listing (Decrypts content transparently if session is unlocked)
  ipcMain.handle('vault:get-files', async () => {
    const vaultPath = getVaultPath()
    const stateManager = getStateManager()
    const compiler = getCompiler()
    const autoLinked = compiler.getAutoLinkedFiles()

    const files: any[] = []
    const scan = (dir: string): void => {
      if (!fs.existsSync(dir)) return
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          scan(full)
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.canvas'))) {
          const rel = path.relative(vaultPath, full).replace(/\\/g, '/')
          const raw = fs.readFileSync(full, 'utf-8')
          const content = vaultCrypto.decryptText(raw)
          const stat = fs.statSync(full)
          files.push({
            id: rel,
            title: entry.name.replace(/\.(md|canvas)$/, ''),
            content,
            isLocked: stateManager.isLocked(rel),
            isMounted: stateManager.isMounted(rel),
            isAutoLinked: autoLinked.includes(rel),
            tokenCount: Math.ceil(content.length / 4),
            mtime: stat.mtimeMs,
            birthtime: stat.birthtimeMs || stat.ctimeMs
          })
        }
      }
    }
    scan(vaultPath)
    return files
  })

  // Read file content with transparent decryption
  ipcMain.handle('vault:read-file', async (_, fileId: string) => {
    const full = path.join(getVaultPath(), fileId)
    if (fs.existsSync(full)) {
      const raw = fs.readFileSync(full, 'utf-8')
      return vaultCrypto.decryptText(raw)
    }
    return ''
  })

  // Write file content with transparent encryption on disk
  ipcMain.handle('vault:write-file', async (_, { fileId, content }: { fileId: string; content: string }) => {
    const full = path.join(getVaultPath(), fileId)
    const dir = path.dirname(full)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    // Encrypt so no one can read raw files from outside the app
    const encrypted = vaultCrypto.encryptText(content)
    fs.writeFileSync(full, encrypted, 'utf-8')
    return true
  })

  // Rename file and refactor all wikilinks across vault
  ipcMain.handle('vault:rename-file', async (_, { oldFileId, newFileId }: { oldFileId: string; newFileId: string }) => {
    const vaultPath = getVaultPath()
    const oldFull = path.join(vaultPath, oldFileId)
    const newFull = path.join(vaultPath, newFileId)

    if (!fs.existsSync(oldFull)) return false

    const newDir = path.dirname(newFull)
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true })
    }

    // 1. Move file on disk
    fs.renameSync(oldFull, newFull)

    // 2. Update state manager (locked/mounted lists)
    getStateManager().renameFile(oldFileId, newFileId)

    // 3. Scan all vault files and refactor existing links targeting oldFileId
    const oldBase = oldFileId.split('/').pop()?.replace(/\.md$/, '') || oldFileId
    const newBase = newFileId.split('/').pop()?.replace(/\.md$/, '') || newFileId

    const scanAndRefactor = (dir: string) => {
      if (!fs.existsSync(dir)) return
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          scanAndRefactor(full)
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.canvas'))) {
          const raw = fs.readFileSync(full, 'utf-8')
          let content = vaultCrypto.decryptText(raw)
          // Matches [[prefix:oldBase]], [[oldBase]], [[oldBase|alias]], ![[oldBase]]
          const refactorRegex = new RegExp(`\\[\\[([^\\]]*[:/])?${oldBase}([#\\|\\]])`, 'g')
          if (refactorRegex.test(content)) {
            const updated = content.replace(refactorRegex, `[[$1${newBase}$2`)
            const encrypted = vaultCrypto.encryptText(updated)
            fs.writeFileSync(full, encrypted, 'utf-8')
          }
        }
      }
    }
    scanAndRefactor(vaultPath)

    // 4. Notify UI to refresh index and graph
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('vault:file-indexed', { fileId: newFileId })
    }

    return true
  })

  // Delete file and purge SQLite index records
  ipcMain.handle('vault:delete-file', async (_, fileId: string) => {
    const vaultPath = getVaultPath()
    const full = path.join(vaultPath, fileId)
    if (fs.existsSync(full)) {
      fs.unlinkSync(full)
    }

    // Purge from SQLite
    _getDb().deleteFile(fileId)

    // Notify UI
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('vault:file-indexed', { fileId })
    }
    return true
  })

  // Toggle Locked Constitution
  ipcMain.handle('vault:toggle-lock', async (_, fileId: string) => {
    return getStateManager().toggleLockedFile(fileId)
  })

  // Toggle Mounted Spec
  ipcMain.handle('vault:toggle-mount', async (_, fileId: string) => {
    return getStateManager().toggleMountedFile(fileId)
  })

  // Return current mission bundle to Terminal Drawer / MCP Inspector
  ipcMain.handle('mcp:get-mission', async () => {
    return getCompiler().compileMissionBundle()
  })

  // Deterministic Acceptance Criteria Verification via bash/powershell PTY
  ipcMain.handle('mcp:verify-criterion', async (_, { criterionId }: { criterionId: string; summary?: string }) => {
    const bundle = getCompiler().compileMissionBundle()
    const crit = bundle.acceptanceCriteria.find((c) => c.criterionId === criterionId)
    if (!crit || !crit.verifyCmd) {
      getMutator().mutateCriterion(criterionId, true, getMainWindow())
      return { success: true, stdout: 'Criterion marked complete (no verify command).' }
    }

    const targetRepo = getStateManager().getState().targetRepoPath
    const res = await SpecVerifier.executeCommand(crit.verifyCmd, targetRepo)

    if (res.success) {
      getMutator().mutateCriterion(criterionId, true, getMainWindow())
      return { success: true, stdout: res.stdout }
    } else {
      getMutator().recordFailure(criterionId, res.stderr || res.stdout)
      return { success: false, stderr: res.stderr, stdout: res.stdout }
    }
  })

  // Select Vault Folder Dialog
  ipcMain.handle('vault:select-folder', async () => {
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Vault Directory'
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // Select Target Code Repo Dialog
  ipcMain.handle('vault:select-target-repo', async () => {
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Target Code Repository'
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const chosen = result.filePaths[0]
      getStateManager().setTargetRepoPath(chosen)
      getPtyManager().setCwd(chosen)
      return chosen
    }
    return null
  })

  // --- VAULT AUTH & ENCRYPTION OPERATIONS ---

  // Check auth & lock status of currently active vault
  ipcMain.handle('vault:check-auth-status', async () => {
    const currentPath = getVaultPath()
    const metadata = vaultCrypto.getVaultMetadata(currentPath)
    return {
      hasVault: fs.existsSync(currentPath),
      vaultPath: currentPath,
      isProtected: metadata !== null,
      isUnlocked: metadata ? vaultCrypto.isUnlocked() : true,
      metadata: metadata
        ? {
            vaultName: metadata.vaultName,
            userName: metadata.userName,
            createdAt: metadata.createdAt
          }
        : null
    }
  })

  // Create a brand new password-protected vault
  ipcMain.handle(
    'vault:create-protected',
    async (
      _,
      {
        parentDirectory,
        vaultName,
        userName,
        password
      }: {
        parentDirectory: string
        vaultName: string
        userName: string
        password: string
      }
    ) => {
      try {
        const fullVaultPath = path.join(parentDirectory, vaultName)
        if (!fs.existsSync(fullVaultPath)) {
          fs.mkdirSync(fullVaultPath, { recursive: true })
        }

        // Initialize cryptography and generate .vault-lock
        const metadata = vaultCrypto.initializeVault(fullVaultPath, vaultName, userName, password)

        // Create standard empty directories without mock or demo files
        const subdirs = ['.genesis', '00-constitution', '03-scratchpad']
        for (const dir of subdirs) {
          const p = path.join(fullVaultPath, dir)
          if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
        }

        // Create a blank starter constitution file
        const constPath = path.join(fullVaultPath, '00-constitution', 'instructions.md')
        const initialConst = `---\nlocked: true\nscope: global\n---\n\n# Engineering Constitution\n\n1. Deterministic architecture\n2. Strict TypeScript standards\n`
        fs.writeFileSync(constPath, vaultCrypto.encryptText(initialConst), 'utf-8')

        // Switch application to the newly created vault
        setVaultPath(fullVaultPath)

        return {
          success: true,
          vaultPath: fullVaultPath,
          vaultName: metadata.vaultName,
          userName: metadata.userName
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to create vault' }
      }
    }
  )

  // Unlock existing vault with password
  ipcMain.handle('vault:unlock', async (_, { password }: { password: string }) => {
    const currentPath = getVaultPath()
    const res = vaultCrypto.unlockVault(currentPath, password)
    if (res.success) {
      return {
        success: true,
        vaultName: res.metadata?.vaultName,
        userName: res.metadata?.userName
      }
    }
    return { success: false, error: res.error || 'Incorrect password' }
  })

  // Lock vault session
  ipcMain.handle('vault:lock', async () => {
    vaultCrypto.lock()
    return true
  })

  // Open existing vault folder from disk
  ipcMain.handle('vault:open-existing', async (_, { folderPath }: { folderPath: string }) => {
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Directory does not exist' }
    }
    setVaultPath(folderPath)
    const metadata = vaultCrypto.getVaultMetadata(folderPath)
    return {
      success: true,
      vaultPath: folderPath,
      isProtected: metadata !== null,
      isUnlocked: metadata ? vaultCrypto.isUnlocked() : true,
      metadata: metadata
        ? {
            vaultName: metadata.vaultName,
            userName: metadata.userName
          }
        : null
    }
  })

  // PTY Shell interactions
  ipcMain.handle('pty:init', async () => {
    getPtyManager().startShell()
    return true
  })

  ipcMain.on('pty:input', (_, data: string) => {
    getPtyManager().sendInput(data)
  })

  ipcMain.handle('pty:run-command', async (_, cmd: string) => {
    getPtyManager().runCommand(cmd)
    return true
  })
}
