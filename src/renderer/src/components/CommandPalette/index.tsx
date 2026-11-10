import React, { useState, useEffect } from 'react'
import {
  Search,
  FileText,
  Terminal,
  Zap,
  Lock,
  Sparkles,
  Network,
  RotateCcw,
  LayoutDashboard
} from 'lucide-react'
import { useVaultStore } from '../../store/useVaultStore'
import { useMcpStore } from '../../store/useMcpStore'

export interface PaletteItem {
  id: string
  title: string
  subtitle: string
  category: 'files' | 'mcp' | 'views'
  icon: React.ReactNode
  action: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'commands' | 'files'
  onSwitchView?: (view: 'explorer' | 'graph' | 'canvas' | 'sprint') => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  initialMode = 'commands',
  onSwitchView
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { files, activeFileId, openFile, toggleMount, toggleLock } = useVaultStore()
  const { setDockOpen, setSettingsOpen } = useMcpStore()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const activeFile = files.find((f) => f.id === activeFileId)

  // Build searchable items
  const items: PaletteItem[] = []

  // MCP & Core Commands
  if (initialMode === 'commands' || query.startsWith('>')) {
    items.push({
      id: 'cmd-mount',
      title: activeFile?.isMounted ? 'MCP: Unmount Current Note' : 'MCP: Mount Current Note',
      subtitle: activeFile ? `Toggle mount state for ${activeFile.title}.md` : 'Requires active note',
      category: 'mcp',
      icon: <Zap size={14} className="text-emerald-400" />,
      action: () => {
        if (activeFile) toggleMount(activeFile.id)
      }
    })

    items.push({
      id: 'cmd-lock',
      title: activeFile?.isLocked ? 'MCP: Unlock Note' : 'MCP: Lock as Global Constitution',
      subtitle: 'Permanently mounts instructions across all agent missions',
      category: 'mcp',
      icon: <Lock size={14} className="text-amber-400" />,
      action: () => {
        if (activeFile) toggleLock(activeFile.id)
      }
    })

    items.push({
      id: 'cmd-dock',
      title: 'MCP: Toggle Mission & Context Dock',
      subtitle: 'Inspect compiled JSON mission bundle sent to local agents',
      category: 'mcp',
      icon: <Terminal size={14} className="text-cyan-400" />,
      action: () => {
        setDockOpen(true)
      }
    })

    items.push({
      id: 'cmd-view-graph',
      title: 'View: Open 2D Visual Dependency Graph',
      subtitle: 'Switch to spatial network view (Cmd+G)',
      category: 'views',
      icon: <Network size={14} className="text-cyan-400" />,
      action: () => {
        onSwitchView?.('graph')
      }
    })

    items.push({
      id: 'cmd-view-canvas',
      title: 'View: Open Spatial Canvas Whiteboard (.canvas)',
      subtitle: 'Infinite 2D spatial whiteboard and executable flowchart',
      category: 'views',
      icon: <Sparkles size={14} className="text-purple-400" />,
      action: () => {
        onSwitchView?.('canvas')
      }
    })

    items.push({
      id: 'cmd-view-sprint',
      title: 'View: Sprint Control & Mission Dashboard (Dataview)',
      subtitle: 'Query status, pending criteria checkboxes, and verification exit codes',
      category: 'views',
      icon: <LayoutDashboard size={14} className="text-emerald-400" />,
      action: () => {
        onSwitchView?.('sprint')
      }
    })

    items.push({
      id: 'cmd-settings',
      title: 'Settings: Open Vault & Theme Settings',
      subtitle: 'Configure color themes, MCP port 43110, and code repository path',
      category: 'views',
      icon: <RotateCcw size={14} className="text-slate-400" />,
      action: () => {
        setSettingsOpen(true)
      }
    })
  }

  // Vault Notes (Quick Switcher)
  const cleanQ = query.replace(/^>/, '').trim().toLowerCase()
  for (const f of files) {
    if (f.id === 'docs/guide.md' || f.isDocs) continue
    items.push({
      id: `file-${f.id}`,
      title: `${f.title}.md`,
      subtitle: f.id,
      category: 'files',
      icon: <FileText size={14} className="text-slate-400" />,
      action: () => {
        openFile(f.id)
      }
    })
  }

  // Filter items by query
  const filtered = items.filter((item) => {
    if (!cleanQ) return true
    return (
      item.title.toLowerCase().includes(cleanQ) ||
      item.subtitle.toLowerCase().includes(cleanQ)
    )
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filtered[selectedIndex]
      if (target) {
        target.action()
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-24 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#13161B] border border-[#22262E] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#22262E] gap-2.5">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder={
              initialMode === 'commands'
                ? 'Type a command or search notes (e.g. MCP, View, Checkout)...'
                : 'Quick switcher: Type note title to open...'
            }
            autoFocus
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none font-mono"
          />
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
            <span className="px-1.5 py-0.5 rounded bg-[#1A1E24] border border-[#22262E]">ESC</span>
            <span>to close</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">
              No matching notes or commands found.
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action()
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-slate-100'
                      : 'text-slate-300 hover:bg-[#1A1E24] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <div className="flex flex-col truncate">
                      <span className={`text-xs font-medium ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A1E24] text-slate-400 font-mono uppercase ml-2 flex-shrink-0">
                    {item.category}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
