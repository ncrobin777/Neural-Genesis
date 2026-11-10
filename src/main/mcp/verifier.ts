import { exec } from 'child_process'
import util from 'util'

const execAsync = util.promisify(exec)

export interface VerificationResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
}

export class SpecVerifier {
  public static async executeCommand(command: string, cwd: string): Promise<VerificationResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: 60000,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' }
      })
      return {
        success: true,
        exitCode: 0,
        stdout: stdout || '',
        stderr: stderr || ''
      }
    } catch (error: any) {
      return {
        success: false,
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || 'Verification command failed'
      }
    }
  }
}
