import React from 'react'
import {
  Folder,
  Search,
  Network,
  BookOpen,
  Sparkles,
  LayoutDashboard,
  Cpu,
  Settings,
  Terminal as TerminalIcon
} from 'lucide-react'

interface ActivityBarProps {
  activeTab: 'hub' | 'explorer' | 'search' | 'graph' | 'canvas' | 'sprint' | 'mcp'
  setActiveTab: (tab: 'hub' | 'explorer' | 'search' | 'graph' | 'canvas' | 'sprint' | 'mcp') => void
  toggleTerminal: () => void
  isTerminalOpen: boolean
  toggleDock: () => void
  isDockOpen: boolean
  openSettings: (tab?: 'vault' | 'theme' | 'mcp' | 'rules') => void
  onOpenDocs: () => void
  isDocsActive?: boolean
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  setActiveTab,
  toggleTerminal,
  isTerminalOpen,
  toggleDock,
  isDockOpen,
  openSettings,
  onOpenDocs,
  isDocsActive
}) => {
  return (
    <div className="w-12 bg-surface-container-low border-r border-[#c3c6d7]/30 flex flex-col items-center justify-between py-3 select-none z-40 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
      {/* Nav Icons */}
      <div className="flex flex-col gap-2 items-center flex-1">
        {/* Daily Note / Hub Button */}
        <button
          onClick={() => setActiveTab('hub')}
          title="Daily Notes Hub"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'hub'
              ? 'bg-surface-container-lowest text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">calendar_today</span>
        </button>

        <button
          onClick={() => setActiveTab('explorer')}
          title="File Explorer"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'explorer' && !isDocsActive
              ? 'bg-surface-container-lowest text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">folder</span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          title="Vault Search"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'search'
              ? 'bg-surface-container-lowest text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          title="Interactive Knowledge Graph"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'graph'
              ? 'bg-surface-container-lowest text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">hub</span>
        </button>

        {/* Spatial Canvas Whiteboard */}
        <button
          onClick={() => setActiveTab('canvas')}
          title="Canvas Workspace"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'canvas'
              ? 'bg-surface-container-lowest text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
        </button>

        {/* Sprint Control Dashboard */}
        <button
          onClick={() => setActiveTab('sprint')}
          title="Sprint & Mission Control"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            activeTab === 'sprint'
              ? 'bg-surface-container-lowest text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
        </button>

        {/* Docs Button */}
        <button
          onClick={onOpenDocs}
          title="Documentation & App Guide"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            isDocsActive
              ? 'bg-secondary-fixed text-on-secondary-fixed shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">bookmark</span>
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col items-center gap-2">
        {/* MCP Status & Settings Quick Access */}
        <button
          onClick={() => openSettings('mcp')}
          title="MCP Bridge Active (:43110)"
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">extension</span>
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
          </span>
        </button>

        {/* Terminal Toggle Icon */}
        <button
          onClick={toggleTerminal}
          title="Toggle Embedded Terminal Drawer"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            isTerminalOpen
              ? 'bg-surface-container-lowest text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">terminal</span>
        </button>

        {/* Settings Modal Toggle */}
        <button
          onClick={() => openSettings()}
          title="Vault Settings"
          className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
        </button>
      </div>
    </div>
  )
}
