import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { BrowserWindow } from 'electron'

export class PtyManager {
  private child: ChildProcessWithoutNullStreams | null = null
  private getMainWindow: () => BrowserWindow | null
  private cwd: string

  constructor(cwd: string, getMainWindow: () => BrowserWindow | null) {
    this.cwd = cwd
    this.getMainWindow = getMainWindow
  }

  public setCwd(newCwd: string): void {
    this.cwd = newCwd
  }

  public startShell(): void {
    if (this.child) return

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash'
    this.child = spawn(shell, [], {
      cwd: this.cwd,
      env: { ...process.env, TERM: 'xterm-256color' }
    })

    this.child.stdout.on('data', (data) => {
      const win = this.getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('pty:data', data.toString())
      }
    })

    this.child.stderr.on('data', (data) => {
      const win = this.getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('pty:data', data.toString())
      }
    })

    this.child.on('close', (code) => {
      const win = this.getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('pty:data', `\r\n[Process terminated with code ${code}]\r\n`)
      }
      this.child = null
    })
  }

  public sendInput(data: string): void {
    if (this.child && this.child.stdin.writable) {
      this.child.stdin.write(data)
    }
  }

  public runCommand(cmd: string): void {
    if (!this.child) {
      this.startShell()
    }
    if (this.child && this.child.stdin.writable) {
      this.child.stdin.write(cmd + '\r\n')
    }
  }

  public kill(): void {
    if (this.child) {
      this.child.kill()
      this.child = null
    }
  }
}
