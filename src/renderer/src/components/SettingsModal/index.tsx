import React, { useState, useEffect } from 'react'
import {
  FolderOpen,
  HardDrive,
  Check,
  X,
  Shield,
  Cpu,
  Palette,
  Sun,
  Moon,
  Sparkles,
  Play,
  CheckCircle2,
  Circle,
  Eye,
  AlertTriangle,
  RotateCcw,
  Type,
  User,
  Upload,
  Image as ImageIcon
} from 'lucide-react'
import { LeafLogo } from '../LeafLogo'
import { useVaultStore } from '../../store/useVaultStore'
import { useThemeStore, THEMES, ThemeId, FONTS, FontId } from '../../store/useThemeStore'
import { useMcpStore } from '../../store/useMcpStore'
import confetti from 'canvas-confetti'

export const PREDEFINED_AVATARS = [
  { id: 'leaf', label: 'Leaf Brand (Default)', icon: 'eco', isLeaf: true, bg: 'bg-emerald-900/60' },
  { id: 'person', label: 'Default Person', icon: 'person', bg: 'bg-primary' },
  { id: 'psychology', label: 'Neural Mind', icon: 'psychology', bg: 'bg-secondary' },
  { id: 'terminal', label: 'Hacker', icon: 'terminal', bg: 'bg-emerald-600' },
  { id: 'rocket', label: 'Mission Lead', icon: 'rocket_launch', bg: 'bg-amber-600' },
  { id: 'code', label: 'Developer', icon: 'code', bg: 'bg-indigo-600' },
  { id: 'sparkles', label: 'AI Synthesis', icon: 'auto_awesome', bg: 'bg-purple-600' }
]

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'vault' | 'theme' | 'mcp' | 'rules' | 'user'
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'vault' }) => {
  const { targetRepo, setTargetRepo, refreshFiles } = useVaultStore()
  const { currentTheme, setTheme, currentFont, setFont } = useThemeStore()
  const {
    mission,
    fetchMission,
    verifyCriterion,
    isVerifying,
    isJsonModalOpen,
    setJsonModalOpen
  } = useMcpStore()
  const [activeTab, setActiveTab] = useState<'vault' | 'theme' | 'mcp' | 'rules' | 'user'>(initialTab)
  const [localTarget, setLocalTarget] = useState(targetRepo)
  const [saved, setSaved] = useState(false)

  // User Profile Avatar State
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem('ng_user_avatar') || 'leaf'
  })
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>(() => {
    return localStorage.getItem('ng_user_custom_avatar') || ''
  })
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleSelectPredefined = (avatarId: string) => {
    setUserAvatar(avatarId)
    setCustomAvatarUrl('')
    localStorage.setItem('ng_user_avatar', avatarId)
    localStorage.removeItem('ng_user_custom_avatar')
    window.dispatchEvent(new Event('storage'))
  }

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setCustomAvatarUrl(result)
        setUserAvatar('custom')
        localStorage.setItem('ng_user_avatar', 'custom')
        localStorage.setItem('ng_user_custom_avatar', result)
        window.dispatchEvent(new Event('storage'))
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      fetchMission()
    }
  }, [isOpen, initialTab])

  if (!isOpen) return null

  const handleChooseVault = async () => {
    if (window.genesis) {
      const res = await window.genesis.selectFolder()
      if (res) {
        await refreshFiles()
      }
    }
  }

  const handleChooseRepo = async () => {
    if (window.genesis) {
      const res = await window.genesis.selectTargetRepo()
      if (res) {
        setLocalTarget(res)
        setTargetRepo(res)
      }
    }
  }

  const handleSave = () => {
    setTargetRepo(localTarget)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 600)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none">
      <div className="bg-[#13161B] border border-[#22262E] rounded-xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#22262E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">Settings & Configuration</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#1A1E24]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#22262E] px-4 gap-4 bg-[#0D0F12]">
          <button
            onClick={() => setActiveTab('vault')}
            className={`py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'vault'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Vault & Paths
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'theme'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette size={13} />
            <span>Theme & Colors</span>
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'mcp'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu size={13} />
            <span>MCP Bridge</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'rules'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Constitution Rules
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'user'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={13} />
            <span>User Profile & Avatar</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-300 overflow-y-auto flex-1">
          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  Second Brain Vault Directory
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#1A1E24] px-3 py-2 rounded border border-[#22262E] font-mono text-[11px] text-slate-200 truncate">
                    Active: ./sample-vault (or custom directory)
                  </div>
                  <button
                    onClick={handleChooseVault}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-[#0D0F12] font-semibold rounded flex items-center gap-1.5 transition-colors"
                  >
                    <FolderOpen size={14} />
                    <span>Change Vault</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  All local .md and .canvas notes will be indexed into SQLite automatically.
                </p>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  Target Code Repository
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={localTarget}
                    onChange={(e) => setLocalTarget(e.target.value)}
                    className="flex-1 bg-[#1A1E24] px-3 py-2 rounded border border-[#22262E] font-mono text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400"
                    placeholder="e.g. ~/code/my-project"
                  />
                  <button
                    onClick={handleChooseRepo}
                    className="px-3 py-2 bg-[#1A1E24] hover:bg-[#22262E] text-slate-200 border border-[#22262E] font-medium rounded flex items-center gap-1.5 transition-colors"
                  >
                    <HardDrive size={14} />
                    <span>Browse</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Directory where [cmd: ...] verification directives will execute.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200">Interface Color Theme</span>
                  <span className="text-[11px] text-slate-400">Instantly changes every UI element, canvas & editor</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Choose between the default high-contrast dark theme, iconic open-source themes (Dracula, Nord), or the crisp GitHub light mode.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(Object.values(THEMES) as Array<typeof THEMES[ThemeId]>).map((theme) => {
                  const isSelected = currentTheme === theme.id
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setTheme(theme.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-[#1A1E24] shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                          : 'border-[#22262E] bg-[#13161B] hover:border-slate-600 hover:bg-[#1A1E24]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {theme.isLight ? (
                            <Sun size={14} className="text-amber-400" />
                          ) : theme.id === 'dracula' ? (
                            <Sparkles size={14} className="text-purple-400" />
                          ) : (
                            <Moon size={14} className="text-cyan-400" />
                          )}
                          <span className={`font-semibold text-xs ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {theme.name}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[#0D0F12]">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>

                      <p className="text-[10.5px] text-slate-400 line-clamp-2 mb-3">
                        {theme.description}
                      </p>

                      {/* Theme Palette Swatches */}
                      <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/20 border border-[#22262E]">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                          style={{ backgroundColor: theme.colors.bgMain }}
                          title="Background Main"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                          style={{ backgroundColor: theme.colors.bgSurface }}
                          title="Sidebar & Panels"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                          style={{ backgroundColor: theme.colors.bgElevated }}
                          title="Elevated Cards"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                          style={{ backgroundColor: theme.colors.accent }}
                          title="Accent Color"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shadow-sm ml-auto"
                          style={{ backgroundColor: theme.colors.textPrimary }}
                          title="Text Color"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Typography / Font Selector */}
              <div className="pt-4 border-t border-[#22262E]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Type size={15} className="text-emerald-400" />
                    <span className="font-semibold text-slate-200">Typography & Font Family</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Default: Inter · Alternative: Open Sans</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Select your preferred typeface. Changes are applied instantly across the entire application interface, editor, and graph overlays.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {(Object.values(FONTS) as Array<typeof FONTS[FontId]>).map((font) => {
                    const isSelected = currentFont === font.id
                    return (
                      <div
                        key={font.id}
                        onClick={() => setFont(font.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-[#1A1E24] shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                            : 'border-[#22262E] bg-[#13161B] hover:border-slate-600 hover:bg-[#1A1E24]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`font-semibold text-xs ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}
                            style={{ fontFamily: font.family }}
                          >
                            {font.name}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[#0D0F12]">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">
                          {font.description}
                        </p>
                        <div
                          className="px-2.5 py-1.5 rounded bg-black/25 border border-[#22262E] text-slate-300 text-xs truncate"
                          style={{ fontFamily: font.family }}
                        >
                          The quick brown fox jumps over 12345
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="space-y-4">
              {/* Server Status Header */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1A1E24] border border-[#22262E]">
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <Cpu size={14} className="text-emerald-400" />
                    <span>Streamable HTTP Server & MCP Bridge</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Port: <span className="font-mono text-emerald-400">43110</span> (Endpoint: <span className="font-mono text-slate-300">/mcp</span>)
                  </div>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE :43110
                </span>
              </div>

              {/* 1. Live Token Budget Meter */}
              {(() => {
                const totalTokens = mission?.totalTokens || 0
                const maxTokens = mission?.tokenBudget || 8000
                const tokenPercent = Math.min(100, Math.round((totalTokens / maxTokens) * 100))

                return (
                  <div className="bg-[#1A1E24] p-3 rounded-lg border border-[#22262E]">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-400 font-medium">Context Window Budget</span>
                      <span className="font-mono text-emerald-400 font-medium">
                        {totalTokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens
                      </span>
                    </div>

                    <div className="w-full bg-[#13161B] h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-400 h-full transition-all duration-300 shadow-sm shadow-emerald-400"
                        style={{ width: `${tokenPercent}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Locked Constitution: 580t</span>
                      <span>Mounted Specs: {Math.max(0, totalTokens - 580)}t</span>
                      <span>Utilization: {tokenPercent}%</span>
                    </div>
                  </div>
                )
              })()}

              {/* 2. Primary CTA: Dispatch Agent Mission */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (window.genesis) {
                      await window.genesis.runPtyCommand(
                        `echo ">>> DISPATCHING NEURAL GENESIS MISSION TO CLAUDE CODE / AGY AGENT..." && curl -s http://localhost:43110/mcp`
                      )
                    }
                  }}
                  className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0D0F12] font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all active:scale-[0.99]"
                >
                  <Play size={13} fill="#0D0F12" />
                  <span>RUN AGENT MISSION (CURL /MCP)</span>
                </button>

                <button
                  onClick={() => setJsonModalOpen(true)}
                  className="py-2.5 px-3 rounded-lg bg-[#1A1E24] hover:bg-[#22262E] text-slate-300 border border-[#22262E] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye size={13} className="text-slate-400" />
                  <span>Raw MCP JSON</span>
                </button>
              </div>

              {/* 3. Blast Radius / Backlink Warnings */}
              {mission?.connectedGraph.backlinks && mission.connectedGraph.backlinks.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                    <AlertTriangle size={13} />
                    <span>Blast Radius Detected</span>
                  </div>
                  {mission.connectedGraph.backlinks.map((b, i) => (
                    <div key={i} className="text-[11px] leading-tight text-amber-200/80">
                      {b.blastRadiusNotice}
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Acceptance Criteria Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Live Acceptance Criteria ({mission?.acceptanceCriteria.filter((c) => c.checked).length || 0} / {mission?.acceptanceCriteria.length || 0})
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {mission?.acceptanceCriteria.map((crit) => {
                    const loading = isVerifying[crit.criterionId]

                    return (
                      <div
                        key={crit.criterionId}
                        className={`p-2.5 rounded-lg border text-xs transition-all ${
                          crit.checked
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300'
                            : 'bg-[#1A1E24] border-[#22262E] text-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={async () => {
                              const res = await verifyCriterion(crit.criterionId)
                              if (res.success) {
                                confetti({
                                  particleCount: 40,
                                  spread: 60,
                                  origin: { y: 0.8 }
                                })
                              }
                            }}
                            disabled={loading}
                            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            {loading ? (
                              <RotateCcw size={14} className="animate-spin text-emerald-400" />
                            ) : crit.checked ? (
                              <CheckCircle2 size={14} className="text-emerald-400" />
                            ) : (
                              <Circle size={14} className="text-slate-500" />
                            )}
                          </button>
                          <div className="flex-1 overflow-hidden">
                            <div className="leading-snug break-words">{crit.description}</div>
                            {crit.verifyCmd && (
                              <div className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-[#13161B] px-1.5 py-0.5 rounded border border-[#22262E] truncate">
                                <span className="text-emerald-400">$</span>
                                <span className="truncate">{crit.verifyCmd}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {(!mission?.acceptanceCriteria || mission.acceptanceCriteria.length === 0) && (
                    <div className="text-center py-4 text-xs text-slate-500 bg-[#1A1E24]/40 rounded-lg border border-[#22262E]">
                      No active criteria in currently mounted specs. Mount a spec in Vault Explorer to bundle verification tests.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#1A1E24] border border-[#22262E]">
                <div className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1">
                  <Shield size={13} />
                  <span>Permanent Constitution Lock</span>
                </div>
                <div className="text-slate-400 text-[11px] leading-relaxed">
                  Files located inside <span className="text-amber-400 font-mono">00-constitution/</span> are permanently mounted into all agent missions to enforce clean code, zero bloat, and TypeScript discipline.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'user' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200">User Profile & Avatar Logo</span>
                  <span className="text-[11px] text-slate-400">Personalize your identity in the app header</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                  Choose from predefined Material icons or upload your own custom image/logo. This avatar appears in the top navigation bar.
                </p>
              </div>

              {/* Current Active Avatar Preview */}
              <div className="p-4 rounded-xl bg-[#1A1E24] border border-[#22262E] flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-primary text-white shadow-md border-2 border-emerald-500/40 relative">
                  {userAvatar === 'custom' && customAvatarUrl ? (
                    <img src={customAvatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : userAvatar === 'leaf' ? (
                    <div className="w-full h-full bg-emerald-950/80 flex items-center justify-center p-2.5">
                      <LeafLogo className="w-8 h-8" />
                    </div>
                  ) : (
                    <span className="material-symbols-outlined text-[32px]">
                      {PREDEFINED_AVATARS.find((a) => a.id === userAvatar)?.icon || 'person'}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                    <span>Active Avatar</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {userAvatar === 'custom' ? 'Custom Logo' : PREDEFINED_AVATARS.find((a) => a.id === userAvatar)?.label || 'Default'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {userAvatar === 'custom'
                      ? 'Custom logo uploaded from your device'
                      : 'Built-in vector avatar synced with your local profile'}
                  </p>
                </div>
              </div>

              {/* Predefined Avatars Grid */}
              <div>
                <label className="block text-slate-300 font-medium text-xs mb-2.5">
                  Predefined Avatars
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {PREDEFINED_AVATARS.map((av) => {
                    const isSelected = userAvatar === av.id
                    return (
                      <div
                        key={av.id}
                        onClick={() => handleSelectPredefined(av.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-emerald-500 bg-[#1A1E24] ring-1 ring-emerald-500/40 shadow-sm'
                            : 'border-[#22262E] bg-[#13161B] hover:border-slate-600 hover:bg-[#1A1E24]/60'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full ${av.bg} text-white flex items-center justify-center shadow-sm overflow-hidden p-1`}>
                          {(av as any).isLeaf ? (
                            <LeafLogo className="w-5 h-5" />
                          ) : (
                            <span className="material-symbols-outlined text-[20px]">{av.icon}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-semibold truncate ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {av.label}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[#0D0F12]">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Custom Logo Upload */}
              <div className="pt-2 border-t border-[#22262E]">
                <label className="block text-slate-300 font-medium text-xs mb-1.5">
                  Upload Custom Avatar / Logo
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Upload a PNG, JPG, or SVG image to use as your customized logo avatar.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCustomFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-semibold text-xs border border-primary/30 flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                  >
                    <Upload size={14} />
                    <span>Choose Image from Disk...</span>
                  </button>

                  {customAvatarUrl && (
                    <button
                      onClick={() => {
                        handleSelectPredefined('person')
                      }}
                      className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <X size={13} />
                      <span>Remove Custom Logo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#22262E] flex items-center justify-end gap-2 bg-[#13161B]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-slate-400 hover:text-slate-200 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-[#0D0F12] font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            {saved ? <Check size={14} /> : null}
            <span>{saved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Raw MCP JSON Modal */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-8">
          <div className="bg-[#13161B] border border-[#22262E] rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-[#22262E] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 font-mono">
                get_active_mission — Compiled JSON Payload
              </span>
              <button
                onClick={() => setJsonModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-[#1A1E24]"
              >
                Close (Esc)
              </button>
            </div>
            <pre className="p-4 overflow-auto flex-1 font-mono text-[11px] text-slate-300 leading-relaxed bg-[#0D0F12]">
              {JSON.stringify(mission, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
