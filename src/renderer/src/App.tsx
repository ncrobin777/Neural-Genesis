import React, { useEffect, useState } from 'react'
import { ActivityBar } from './components/ActivityBar'
import { VaultExplorer } from './components/VaultExplorer'
import { EditorWorkbench } from './components/EditorWorkbench'
import { McpPayloadDock } from './components/McpPayloadDock'
import { TerminalDrawer } from './components/TerminalDrawer'
import { GraphView } from './components/GraphView'
import { SettingsModal } from './components/SettingsModal'
import { CanvasWhiteboard } from './components/CanvasWhiteboard'
import { SprintBoard } from './components/SprintBoard'
import { CommandPalette } from './components/CommandPalette'
import { DailyNotesHub } from './components/DailyNotesHub'
import { useVaultStore } from './store/useVaultStore'
import { useMcpStore } from './store/useMcpStore'
import { useThemeStore, applyThemeToDom } from './store/useThemeStore'
import { useAuthStore } from './store/useAuthStore'
import { LoginOnboardingModal } from './components/LoginOnboardingModal'
import { VaultUnlockModal } from './components/VaultUnlockModal'
import { CreateVaultModal } from './components/CreateVaultModal'
import { LeafLogo } from './components/LeafLogo'
import { Shield, Lock } from 'lucide-react'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hub' | 'explorer' | 'search' | 'graph' | 'canvas' | 'sprint' | 'mcp'>('hub')
  const [isPaletteOpen, setPaletteOpen] = useState(false)
  const [paletteMode, setPaletteMode] = useState<'commands' | 'files'>('commands')

  const { refreshFiles, openDocs, activeFileId, openFile } = useVaultStore()
  const { currentTheme } = useThemeStore()
  const { checkAuth, isLocked, isFirstTime, vaultInfo, lock } = useAuthStore()
  const [isCreateVaultOpen, setCreateVaultOpen] = useState(false)
  const {
    isDrawerOpen,
    setDrawerOpen,
    isDockOpen,
    setDockOpen,
    isSettingsOpen,
    setSettingsOpen
  } = useMcpStore()

  const [settingsInitialTab, setSettingsInitialTab] = useState<'vault' | 'theme' | 'mcp' | 'rules' | 'user'>('vault')

  // User avatar state synchronized with local storage
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem('ng_user_avatar') || 'leaf'
  })
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>(() => {
    return localStorage.getItem('ng_user_custom_avatar') || ''
  })

  useEffect(() => {
    const handleStorage = () => {
      setUserAvatar(localStorage.getItem('ng_user_avatar') || 'person')
      setCustomAvatarUrl(localStorage.getItem('ng_user_custom_avatar') || '')
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const isDocsActive = activeFileId === 'docs/guide.md'

  useEffect(() => {
    applyThemeToDom(currentTheme)
  }, [currentTheme])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    refreshFiles()

    if (window.genesis) {
      const unsub = window.genesis.onFileIndexed(() => {
        refreshFiles()
      })
      return () => unsub()
    }
    return undefined
  }, [])

  // Keyboard shortcuts: Ctrl+K / Cmd+K (Quick Switcher), Cmd+G (Graph), Cmd+P (Command Palette), Cmd+O (Files)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteMode('commands')
        setPaletteOpen((prev) => !prev)
      } else if (isMod && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setActiveTab((prev) => (prev === 'graph' ? 'explorer' : 'graph'))
      } else if (isMod && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setPaletteMode('commands')
        setPaletteOpen((prev) => !prev)
      } else if (isMod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        setPaletteMode('files')
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen bg-surface overflow-hidden text-on-surface select-none font-body-md text-body-md">
      {/* Top Header (h-16 / 64px) */}
      <header className="h-16 flex-shrink-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between border-b border-[#c3c6d7]/30">
        {/* Top Row (h-9) */}
        <div className="h-9 px-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Vault / App Pill with Leaf logo */}
            <div
              onClick={() => setActiveTab('hub')}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors"
            >
              <LeafLogo className="w-4 h-4 shrink-0" />
              <span className="font-label-md text-label-md text-on-surface font-semibold tracking-tight">
                {vaultInfo?.vaultName || 'Neural Genesis'}
              </span>
            </div>

            {/* Lock Vault button */}
            {vaultInfo && (
              <button
                onClick={() => lock()}
                title="Lock Vault session"
                className="p-1 rounded text-on-surface-variant hover:text-amber-400 hover:bg-surface-container transition-colors cursor-pointer"
              >
                <Lock size={14} />
              </button>
            )}

            {/* History Back/Forward */}
            <div className="flex items-center gap-0.5 text-on-surface-variant ml-1">
              <button
                onClick={() => setActiveTab('hub')}
                className="p-1 rounded hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                type="button"
                title="Back"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              </button>
              <button
                onClick={() => setActiveTab('explorer')}
                className="p-1 rounded hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                type="button"
                title="Forward"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Center Search / Quick Switcher with Ctrl+K */}
          <div className="flex items-center gap-2">
            <div
              onClick={() => {
                setPaletteMode('commands')
                setPaletteOpen(true)
              }}
              className="flex items-center gap-2 px-3 py-1 bg-surface-container-lowest rounded-full shadow-[0_1px_4px_rgba(15,23,42,0.05)] text-on-surface-variant cursor-pointer hover:bg-surface-container transition-colors border border-[#c3c6d7]/30"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">search</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Quick Switcher</span>
              <kbd className="font-label-sm text-label-sm bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface font-semibold">
                Ctrl + K
              </kbd>
            </div>
          </div>

          {/* Right Action Icons & Interactive User Avatar */}
          <div className="flex items-center gap-2">
            {/* Synced status indicator (time removed) */}
            <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded bg-surface-container-low">
              <span className="material-symbols-outlined text-[15px] text-primary">sync</span>
              <span className="font-medium">Synced</span>
            </div>

            <button
              onClick={() => setDrawerOpen(!isDrawerOpen)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              type="button"
              title="Terminal Drawer"
            >
              <span className="material-symbols-outlined text-[18px]">vertical_split</span>
            </button>
            <button
              onClick={() => setDockOpen(!isDockOpen)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              type="button"
              title="MCP Payload Dock"
            >
              <span className="material-symbols-outlined text-[18px]">horizontal_split</span>
            </button>
            <button
              onClick={() => {
                setSettingsInitialTab('theme')
                setSettingsOpen(true)
              }}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              type="button"
              title="Theme & Colors"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">palette</span>
            </button>
            <button
              onClick={() => setCreateVaultOpen(true)}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-emerald-400 transition-colors cursor-pointer"
              type="button"
              title="Create New Protected Vault"
            >
              <Shield size={17} />
            </button>
            <button
              onClick={() => {
                setSettingsInitialTab('vault')
                setSettingsOpen(true)
              }}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              type="button"
              title="Vault Settings"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>

            {/* Clickable User Avatar: Opens Settings to 'user' tab to change avatar */}
            <div
              onClick={() => {
                setSettingsInitialTab('user')
                setSettingsOpen(true)
              }}
              title="User Settings (Click to change avatar / logo)"
              className="w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-sm hover:ring-2 hover:ring-primary/40 transition-all overflow-hidden border border-white/20 p-0.5"
            >
              {userAvatar === 'custom' && customAvatarUrl ? (
                <img src={customAvatarUrl} alt="User Avatar" className="w-full h-full object-cover rounded-full" />
              ) : userAvatar === 'leaf' ? (
                <LeafLogo className="w-4 h-4" />
              ) : (
                <span className="material-symbols-outlined text-on-primary text-[16px]">
                  {userAvatar === 'psychology'
                    ? 'psychology'
                    : userAvatar === 'terminal'
                    ? 'terminal'
                    : userAvatar === 'rocket'
                    ? 'rocket_launch'
                    : userAvatar === 'code'
                    ? 'code'
                    : userAvatar === 'sparkles'
                    ? 'auto_awesome'
                    : 'person'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Tab Bar (h-7) */}
        <div className="h-7 px-14 flex items-end gap-1 bg-surface-container-low overflow-x-auto">
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`px-3 py-1 rounded-t-lg font-label-md text-label-md transition-colors inline-flex items-center cursor-pointer ${
                activeTab === 'explorer'
                  ? 'bg-surface-container-lowest text-primary font-semibold shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Editor & Visual Canvas
            </button>
            <button
              onClick={() => setActiveTab('hub')}
              className={`px-3 py-1 rounded-t-lg font-label-md text-label-md transition-colors inline-flex items-center cursor-pointer ${
                activeTab === 'hub'
                  ? 'bg-surface-container-lowest text-primary font-semibold shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Daily Notes Hub
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Zone 1: Activity Bar */}
        <ActivityBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          toggleTerminal={() => setDrawerOpen(!isDrawerOpen)}
          isTerminalOpen={isDrawerOpen}
          toggleDock={() => setDockOpen(!isDockOpen)}
          isDockOpen={isDockOpen}
          openSettings={(tab = 'vault') => {
            setSettingsInitialTab(tab)
            setSettingsOpen(true)
          }}
          onOpenDocs={() => {
            if (activeTab === 'graph') setActiveTab('explorer')
            openDocs()
          }}
          isDocsActive={isDocsActive && activeTab !== 'graph'}
        />

        {/* Zone 2: Vault Explorer (stays visible across all views) */}
        <VaultExplorer />

        {/* Zone 3: Main Viewport (Daily Notes Hub, Editor Workbench, Graph, Canvas, or Sprint) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {activeTab === 'hub' ? (
            <DailyNotesHub
              onOpenNote={(id) => {
                openFile(id)
                setActiveTab('explorer')
              }}
              onOpenGraph={() => setActiveTab('graph')}
              onOpenCanvas={() => setActiveTab('canvas')}
              onOpenCommandPalette={() => {
                setPaletteMode('commands')
                setPaletteOpen(true)
              }}
            />
          ) : activeTab === 'graph' ? (
            <GraphView onClose={() => setActiveTab('hub')} />
          ) : activeTab === 'canvas' ? (
            <CanvasWhiteboard onClose={() => setActiveTab('hub')} />
          ) : activeTab === 'sprint' ? (
            <SprintBoard onClose={() => setActiveTab('hub')} />
          ) : (
            <EditorWorkbench />
          )}

          {/* Zone 5: Terminal Drawer (collapsible, closed by default) */}
          <TerminalDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>

        {/* Zone 4: Right MCP Payload Dock (toggled via icon near terminal) */}
        {isDockOpen && <McpPayloadDock />}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsInitialTab}
      />

      {/* Command Palette & Quick Switcher (Cmd+P / Cmd+O) */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setPaletteOpen(false)}
        initialMode={paletteMode}
        onSwitchView={(view) => {
          setActiveTab(view)
        }}
      />

      {/* First-Time Login / Onboarding Modal */}
      {isFirstTime && <LoginOnboardingModal />}

      {/* Unlock Password Modal when Vault is Locked */}
      {isLocked && <VaultUnlockModal />}

      {/* Create New Encrypted Vault Modal (Accessible anytime) */}
      <CreateVaultModal
        isOpen={isCreateVaultOpen}
        onClose={() => setCreateVaultOpen(false)}
      />
    </div>
  )
}

export default App
