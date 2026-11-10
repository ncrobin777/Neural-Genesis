import fs from 'fs'
import path from 'path'
import { parseMarkdown } from './indexer/ast-parser'
import { VaultDatabase } from './indexer/vault-db'
import { BrowserWindow } from 'electron'
import { vaultCrypto } from './vault-crypto'

export class VaultWatcher {
  private vaultPath: string
  private db: VaultDatabase
  private getMainWindow: () => BrowserWindow | null
  private watcher: fs.FSWatcher | null = null

  constructor(vaultPath: string, db: VaultDatabase, getMainWindow: () => BrowserWindow | null) {
    this.vaultPath = vaultPath
    this.db = db
    this.getMainWindow = getMainWindow
    this.indexAllFiles()
    this.startWatch()
  }

  public indexAllFiles(): void {
    const scanDir = (dir: string): void => {
      if (!fs.existsSync(dir)) return
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          scanDir(fullPath)
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.canvas'))) {
          this.indexSingleFile(fullPath)
        }
      }
    }

    scanDir(this.vaultPath)
  }

  public indexSingleFile(filePath: string): void {
    try {
      const relPath = path.relative(this.vaultPath, filePath).replace(/\\/g, '/')
      const raw = fs.readFileSync(filePath, 'utf-8')
      const content = vaultCrypto.decryptText(raw)
      const parsed = parseMarkdown(relPath, content)

      // Clear previous records
      this.db.clearFileData(relPath)

      // Insert updated file
      this.db.upsertFile({
        id: relPath,
        title: parsed.title,
        frontmatterJson: JSON.stringify(parsed.frontmatter),
        cleanMarkdown: parsed.cleanMarkdown,
        contentHash: parsed.contentHash,
        tokenCount: parsed.tokenCount,
        updatedAt: Date.now()
      })

      // Insert blocks, links, and criteria
      this.db.insertBlocks(parsed.blocks)
      this.db.insertLinks(parsed.links)
      this.db.insertCriteria(parsed.criteria)

      // Notify UI
      const win = this.getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('vault:file-indexed', { fileId: relPath })
      }
    } catch (e) {
      console.error(`Error indexing file ${filePath}:`, e)
    }
  }

  private startWatch(): void {
    try {
      this.watcher = fs.watch(this.vaultPath, { recursive: true }, (_eventType, filename) => {
        if (!filename) return
        if (filename.includes('.genesis') || filename.includes('.git')) return

        const fullPath = path.join(this.vaultPath, filename)
        if (fs.existsSync(fullPath)) {
          if (filename.endsWith('.md') || filename.endsWith('.canvas')) {
            this.indexSingleFile(fullPath)
          }
        }
      })
    } catch (e) {
      console.warn('Filesystem watch error:', e)
    }
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}
