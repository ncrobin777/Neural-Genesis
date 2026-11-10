import fs from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'
import { VaultDatabase } from '../indexer/vault-db'
import { vaultCrypto } from '../vault-crypto'

export class SpecMutator {
  private vaultPath: string
  private db: VaultDatabase
  private failureCounts: Map<string, number> = new Map()

  constructor(vaultPath: string, db: VaultDatabase) {
    this.vaultPath = vaultPath
    this.db = db
  }

  /**
   * Ticks or unticks a criterion checkbox in file or active editor buffer
   */
  public mutateCriterion(criterionId: string, checked: boolean, mainWindow?: BrowserWindow | null): boolean {
    const all = this.db.getAllCriteria()
    const criterion = all.find((c) => c.id === criterionId)
    if (!criterion) return false

    // Update SQLite state
    this.db.updateCriterionStatus(criterionId, checked)

    // Notify Renderer for CodeMirror buffer transaction (preserves cursor & history)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('editor:mutate-criterion', {
        criterionId,
        fileId: criterion.fileId,
        checked
      })
    }

    // Also persist directly to disk file for closed tabs
    const filePath = path.join(this.vaultPath, criterion.fileId)
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const decrypted = vaultCrypto.decryptText(raw)
      const lines = decrypted.split(/\r?\n/)

      let modified = false
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Match line containing description
        if (line.includes(criterion.description) && /^(\s*)-\s+\[[ xX]\]/.test(line)) {
          lines[i] = line.replace(/^(\s*)-\s+\[[ xX]\]/, checked ? '$1- [x]' : '$1- [ ]')
          modified = true
          break
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, vaultCrypto.encryptText(lines.join('\n')), 'utf-8')
      }
    }

    return true
  }

  /**
   * Handles failure retry safeguards. After 3 consecutive fails, injects a > [!failure] callout into markdown.
   */
  public recordFailure(criterionId: string, errorLog: string): { halted: boolean; retryCount: number } {
    const current = (this.failureCounts.get(criterionId) || 0) + 1
    this.failureCounts.set(criterionId, current)

    if (current >= 3) {
      const all = this.db.getAllCriteria()
      const criterion = all.find((c) => c.id === criterionId)
      if (criterion) {
        const filePath = path.join(this.vaultPath, criterion.fileId)
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8')
          const decrypted = vaultCrypto.decryptText(raw)
          const callout = `\n> [!failure] Automated Verification Halted (Criterion: ${criterion.description})\n> 3 consecutive test executions failed:\n> \`\`\`\n> ${errorLog.trim().replace(/\n/g, '\n> ')}\n> \`\`\`\n`
          fs.writeFileSync(filePath, vaultCrypto.encryptText(decrypted + callout), 'utf-8')
        }
      }
      return { halted: true, retryCount: current }
    }

    return { halted: false, retryCount: current }
  }

  /**
   * Injects a question block into a spec file when agent needs human clarification
   */
  public injectQuestion(specFileId: string, question: string): void {
    const filePath = path.join(this.vaultPath, specFileId)
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const decrypted = vaultCrypto.decryptText(raw)
      const questionBlock = `\n> [!question] Agent Spec Clarification Request\n> **Question:** ${question}\n> *Please edit your spec above and re-run the mission.*\n`
      fs.writeFileSync(filePath, vaultCrypto.encryptText(decrypted + questionBlock), 'utf-8')
    }
  }
}
