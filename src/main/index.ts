import { app, shell, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { VaultDatabase } from './indexer/vault-db'
import { McpStateManager } from './mcp-state-manager'
import { ContextCompiler } from './indexer/context-compiler'
import { SpecMutator } from './mcp/mutator'
import { LocalMcpServer } from './mcp/server'
import { PtyManager } from './pty-manager'
import { VaultWatcher } from './vault-watcher'
import { bootstrapDefaultVault } from './vault-bootstrapper'
import { registerIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null

// Default Vault location in user data or app dir
let vaultPath = join(app.getPath('userData'), 'neural-genesis-vault')
if (is.dev) {
  vaultPath = join(process.cwd(), 'sample-vault')
}

// Only bootstrap default notes if no password-protected vault exists yet
const lockExists = fs.existsSync(join(vaultPath, '.vault-lock'))
if (!lockExists) {
  bootstrapDefaultVault(vaultPath)
}

// Initialize Core Subsystems
let db = new VaultDatabase(vaultPath)
let stateManager = new McpStateManager(vaultPath)
let compiler = new ContextCompiler(vaultPath, db, stateManager)
let mutator = new SpecMutator(vaultPath, db)
let ptyManager = new PtyManager(stateManager.getState().targetRepoPath, () => mainWindow)
new LocalMcpServer(43110, compiler, mutator, stateManager, () => mainWindow)
let watcher = new VaultWatcher(vaultPath, db, () => mainWindow)

function updateVaultPath(newPath: string): void {
  vaultPath = newPath
  const hasLock = fs.existsSync(join(vaultPath, '.vault-lock'))
  if (!hasLock) {
    bootstrapDefaultVault(vaultPath)
  }
  watcher.stop()
  db.close()

  db = new VaultDatabase(vaultPath)
  stateManager = new McpStateManager(vaultPath)
  compiler = new ContextCompiler(vaultPath, db, stateManager)
  mutator = new SpecMutator(vaultPath, db)
  ptyManager.setCwd(stateManager.getState().targetRepoPath)
  watcher = new VaultWatcher(vaultPath, db, () => mainWindow)
}

function createWindow(): void {
  // Resolve icon using nativeImage from resources or leaf svg
  let appIcon: Electron.NativeImage | undefined
  try {
    const iconCandidates = [
      join(__dirname, '../../resources/icon.png'),
      join(process.cwd(), 'resources/icon.png'),
      join(__dirname, '../../build/icon.png'),
      join(process.cwd(), 'build/icon.png')
    ]
    for (const cand of iconCandidates) {
      if (fs.existsSync(cand)) {
        appIcon = nativeImage.createFromPath(cand)
        if (!appIcon.isEmpty()) break
      }
    }
  } catch {
    // fallback
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0D0F12',
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.neuralgenesis.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPC
  registerIpcHandlers(
    () => vaultPath,
    (p) => updateVaultPath(p),
    () => db,
    () => stateManager,
    () => compiler,
    () => mutator,
    () => ptyManager,
    () => mainWindow
  )

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  watcher.stop()
  db.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
