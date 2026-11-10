import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const ALGORITHM = 'aes-256-gcm'
const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH = 32 // 256 bits
const PREFIX = 'NGENC:v1:'

export interface VaultMetadata {
  vaultName: string
  userName: string
  salt: string
  verificationHash: string
  createdAt: string
  version: number
}

export class VaultCryptoManager {
  private currentKey: Buffer | null = null
  private currentSalt: Buffer | null = null

  /**
   * Derive a 256-bit key from user password and salt
   */
  public deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
  }

  /**
   * Create verification hash for password confirmation
   */
  public createVerificationHash(key: Buffer): string {
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  /**
   * Initialize a new vault with password protection
   */
  public initializeVault(
    vaultPath: string,
    vaultName: string,
    userName: string,
    password: string
  ): VaultMetadata {
    const salt = crypto.randomBytes(16)
    const key = this.deriveKey(password, salt)
    const verificationHash = this.createVerificationHash(key)

    const metadata: VaultMetadata = {
      vaultName,
      userName,
      salt: salt.toString('hex'),
      verificationHash,
      createdAt: new Date().toISOString(),
      version: 1
    }

    if (!fs.existsSync(vaultPath)) {
      fs.mkdirSync(vaultPath, { recursive: true })
    }

    const lockPath = path.join(vaultPath, '.vault-lock')
    fs.writeFileSync(lockPath, JSON.stringify(metadata, null, 2), 'utf-8')

    // Store active key in memory for current session
    this.currentKey = key
    this.currentSalt = salt

    return metadata
  }

  /**
   * Attempt to unlock an existing vault with password
   */
  public unlockVault(vaultPath: string, password: string): { success: boolean; error?: string; metadata?: VaultMetadata } {
    const lockPath = path.join(vaultPath, '.vault-lock')
    if (!fs.existsSync(lockPath)) {
      return { success: false, error: 'Vault lock file not found' }
    }

    try {
      const raw = fs.readFileSync(lockPath, 'utf-8')
      const metadata: VaultMetadata = JSON.parse(raw)
      const salt = Buffer.from(metadata.salt, 'hex')
      const key = this.deriveKey(password, salt)
      const testHash = this.createVerificationHash(key)

      if (testHash !== metadata.verificationHash) {
        return { success: false, error: 'Incorrect password' }
      }

      this.currentKey = key
      this.currentSalt = salt
      return { success: true, metadata }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to read vault lock' }
    }
  }

  /**
   * Lock current session (drop key from memory)
   */
  public lock(): void {
    this.currentKey = null
    this.currentSalt = null
  }

  /**
   * Check if session is currently unlocked
   */
  public isUnlocked(): boolean {
    return this.currentKey !== null
  }

  /**
   * Encrypt plain text using AES-256-GCM.
   * Format: NGENC:v1:<salt_hex>:<iv_hex>:<authTag_hex>:<cipher_hex>
   */
  public encryptText(plainText: string): string {
    if (!this.currentKey || !this.currentSalt) {
      // If vault is not protected or unlocked, return plain text
      return plainText
    }

    const iv = crypto.randomBytes(12) // 96 bits recommended for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, this.currentKey, iv)
    let encrypted = cipher.update(plainText, 'utf-8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')

    return `${PREFIX}${this.currentSalt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`
  }

  /**
   * Decrypt ciphertext. If not encrypted or already plain, returns input text.
   */
  public decryptText(cipherText: string): string {
    if (!cipherText || !cipherText.startsWith(PREFIX)) {
      return cipherText
    }

    if (!this.currentKey) {
      return '<!-- LOCKED: Vault is locked. Enter password to view content. -->'
    }

    try {
      const parts = cipherText.slice(PREFIX.length).split(':')
      if (parts.length !== 4) {
        return cipherText
      }

      const [_saltHex, ivHex, authTagHex, contentHex] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')

      const decipher = crypto.createDecipheriv(ALGORITHM, this.currentKey, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(contentHex, 'hex', 'utf-8')
      decrypted += decipher.final('utf-8')
      return decrypted
    } catch {
      return '<!-- ERROR: Decryption failed. Corrupt data or wrong key. -->'
    }
  }

  /**
   * Get metadata of a vault on disk
   */
  public getVaultMetadata(vaultPath: string): VaultMetadata | null {
    const lockPath = path.join(vaultPath, '.vault-lock')
    if (!fs.existsSync(lockPath)) return null
    try {
      const raw = fs.readFileSync(lockPath, 'utf-8')
      return JSON.parse(raw) as VaultMetadata
    } catch {
      return null
    }
  }
}

export const vaultCrypto = new VaultCryptoManager()

