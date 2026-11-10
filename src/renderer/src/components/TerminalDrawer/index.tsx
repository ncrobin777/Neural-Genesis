import React, { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import 'xterm/css/xterm.css'
import { Terminal as TerminalIcon, X, Trash2 } from 'lucide-react'

interface TerminalDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({ isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    if (!termRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
        theme: {
          background: '#0D0F12',
          foreground: '#E2E8F0',
          cursor: '#10B981',
          selectionBackground: '#10B98133',
          black: '#0D0F12',
          red: '#EF4444',
          green: '#10B981',
          yellow: '#F59E0B',
          blue: '#3B82F6',
          magenta: '#EC4899',
          cyan: '#06B6D4',
          white: '#F8FAFC'
        }
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(containerRef.current)
      fitAddon.fit()

      termRef.current = term
      fitAddonRef.current = fitAddon

      // Initial welcome message
      term.writeln('\x1b[38;2;16;185;129m[Neural Genesis Agent Loop Initialized]\x1b[0m')
      term.writeln('Streamable MCP Server listening on \x1b[36mhttp://localhost:43110/mcp\x1b[0m')
      term.writeln('Ready to execute CLI agents: claude, agy, cursor-agent, pnpm, npm\r\n')

      // Listen to key typing
      term.onData((data) => {
        if (window.genesis) {
          window.genesis.sendPtyInput(data)
        }
      })

      // Start shell backend
      if (window.genesis) {
        window.genesis.initPty()
      }
    }

    const handleResize = () => {
      fitAddonRef.current?.fit()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  // Subscribe to pty stdout and mcp events
  useEffect(() => {
    if (!window.genesis) return

    const unsubPty = window.genesis.onPtyData((data) => {
      termRef.current?.write(data)
    })

    const unsubMcp = window.genesis.onMcpEvent(({ event }) => {
      termRef.current?.writeln(`\r\n\x1b[38;2;6;182;212m${event}\x1b[0m\r\n`)
    })

    return () => {
      unsubPty()
      unsubMcp()
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="h-52 bg-[#0D0F12] border-t border-[#22262E] flex flex-col z-30 select-none">
      {/* Terminal Title Bar */}
      <div className="h-8 bg-[#13161B] border-b border-[#22262E] px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon size={13} className="text-emerald-400" />
          <span className="text-[11px] font-semibold text-slate-300 font-mono">
            TERMINAL / AGENT LOOP DRAWER
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            (node-pty shell stream)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => termRef.current?.clear()}
            title="Clear Terminal"
            className="text-slate-400 hover:text-slate-200"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={onClose}
            title="Close Drawer"
            className="text-slate-400 hover:text-slate-200"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Terminal container */}
      <div className="flex-1 p-2 overflow-hidden" ref={containerRef} />
    </div>
  )
}
