import React, { useState } from 'react'
import {
  Lock,
  Folder,
  ArrowRight,
  User,
  KeyRound,
  AlertCircle,
  FolderOpen,
  LogIn,
  Plus
} from 'lucide-react'
import { LeafLogo } from '../LeafLogo'
import { useAuthStore } from '../../store/useAuthStore'
import { useVaultStore } from '../../store/useVaultStore'

interface LoginOnboardingModalProps {
  onSuccess?: () => void
}

export const LoginOnboardingModal: React.FC<LoginOnboardingModalProps> = ({ onSuccess }) => {
  const { createVault, openVault, unlock } = useAuthStore()
  const { refreshFiles } = useVaultStore()

  // Mode: 'create' (wizard steps 1 & 2) or 'existing' (jump back in)
  const [mode, setMode] = useState<'create' | 'existing'>('create')
  const [step, setStep] = useState<1 | 2>(1)
  const [userName, setUserName] = useState(() => localStorage.getItem('ng_user_name') || '')

  // Create Vault Form
  const [vaultName, setVaultName] = useState('My Neural Vault')
  const [parentDir, setParentDir] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Existing Vault Login Form
  const [existingVaultDir, setExistingVaultDir] = useState('')
  const [existingPassword, setExistingPassword] = useState('')
  const [existingVaultName, setExistingVaultName] = useState<string | null>(null)
  const [existingUserName, setExistingUserName] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectDirectory = async () => {
    if (window.genesis?.selectFolder) {
      const chosen = await window.genesis.selectFolder()
      if (chosen) {
        setParentDir(chosen)
        setError(null)
      }
    }
  }

  const handleSelectExistingFolder = async () => {
    if (window.genesis?.selectFolder) {
      const chosen = await window.genesis.selectFolder()
      if (chosen) {
        setExistingVaultDir(chosen)
        setError(null)
        // Check if directory has metadata
        if (window.genesis?.openExistingVault) {
          const res = await window.genesis.openExistingVault(chosen)
          if (res.success && res.metadata) {
            setExistingVaultName(res.metadata.vaultName)
            setExistingUserName(res.metadata.userName)
          } else {
            const folderBase = chosen.split(/[\\/]/).pop() || 'Selected Vault'
            setExistingVaultName(folderBase)
          }
        }
      }
    }
  }

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userName.trim()) {
      setError('Please enter your name to continue')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!vaultName.trim()) {
      setError('Please provide a name for your vault')
      return
    }

    if (!parentDir.trim()) {
      setError('Please choose a folder location on your computer')
      return
    }

    if (!password) {
      setError('Please enter a password to protect your vault')
      return
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createVault({
        parentDirectory: parentDir,
        vaultName: vaultName.trim(),
        userName: userName.trim(),
        password
      })

      if (res.success) {
        await refreshFiles()
        if (onSuccess) onSuccess()
      } else {
        setError(res.error || 'Failed to initialize encrypted vault')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Login to Existing Vault
  const handleLoginExisting = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!existingVaultDir.trim()) {
      setError('Please select your existing vault folder')
      return
    }

    if (!existingPassword) {
      setError('Please enter your vault password')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Open the vault folder
      const openRes = await openVault(existingVaultDir)
      if (!openRes.success) {
        setError(openRes.error || 'Failed to open directory')
        setIsSubmitting(false)
        return
      }

      // 2. Unlock with password
      const unlockRes = await unlock(existingPassword)
      if (unlockRes.success) {
        await refreshFiles()
        if (onSuccess) onSuccess()
      } else {
        setError(unlockRes.error || 'Incorrect password')
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0D10]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#13161B] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-b from-emerald-500/10 to-transparent border-b border-[#22262E] flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-[0_0_24px_rgba(50,135,119,0.3)]">
            <LeafLogo className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">
            {mode === 'existing'
              ? 'Jump Back In'
              : step === 1
              ? 'Welcome to Neural Genesis'
              : 'Create Protected Vault'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {mode === 'existing'
              ? 'Enter your vault password to unlock and resume your session'
              : step === 1
              ? 'Your private, local-first second brain and deterministic AI workbench'
              : 'Protected and stored locally on your device.'}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 mt-4 p-0.5 rounded-lg bg-[#0D0F12] border border-[#22262E]">
            <button
              type="button"
              onClick={() => {
                setMode('create')
                setError(null)
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'create'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus size={13} />
              <span>Create New Vault</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('existing')
                setError(null)
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'existing'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn size={13} />
              <span>Already have a vault?</span>
            </button>
          </div>
        </div>

        {/* MODE: CREATE VAULT */}
        {mode === 'create' && (
          <>
            {/* Step 1: User Profile / Name */}
            {step === 1 && (
              <form onSubmit={handleStep1Next} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    What is your name?
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User size={15} />
                    </span>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Alex Hunter"
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 bg-[#0D0F12] border border-[#22262E] focus:border-emerald-500 focus:outline-none rounded-lg text-sm text-slate-100 placeholder-slate-600"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <span>Continue to Vault Setup</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}

            {/* Step 2: Create Encrypted Vault */}
            {step === 2 && (
              <form onSubmit={handleCreateVault} className="p-6 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Vault Name
                  </label>
                  <input
                    type="text"
                    value={vaultName}
                    onChange={(e) => setVaultName(e.target.value)}
                    placeholder="Personal Vault"
                    className="w-full px-3 py-1.5 bg-[#0D0F12] border border-[#22262E] focus:border-emerald-500 focus:outline-none rounded-lg text-xs text-slate-100 placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Vault Storage Location
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate px-3 py-1.5 bg-[#0D0F12] border border-[#22262E] rounded-lg text-xs font-mono text-slate-300">
                      {parentDir || 'No folder chosen yet...'}
                    </div>
                    <button
                      type="button"
                      onClick={handleSelectDirectory}
                      className="px-3 py-1.5 rounded-lg bg-[#1A1E24] hover:bg-[#222832] border border-[#22262E] text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Folder size={13} className="text-emerald-400" />
                      <span>Choose</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Vault Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                        <KeyRound size={13} />
                      </span>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-7 pr-2.5 py-1.5 bg-[#0D0F12] border border-[#22262E] focus:border-emerald-500 focus:outline-none rounded-lg text-xs text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                        <Lock size={13} />
                      </span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat"
                        className="w-full pl-7 pr-2.5 py-1.5 bg-[#0D0F12] border border-[#22262E] focus:border-emerald-500 focus:outline-none rounded-lg text-xs text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-2 px-3 rounded-lg bg-[#1A1E24] hover:bg-[#222832] text-slate-400 text-xs cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    {isSubmitting ? (
                      <span>Initializing Secure Vault...</span>
                    ) : (
                      <span>Create & Launch Vault</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* MODE: LOGIN TO EXISTING VAULT ("ALREADY HAVE A VAULT") */}
        {mode === 'existing' && (
          <form onSubmit={handleLoginExisting} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vault Directory
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate px-3 py-2 bg-[#0D0F12] border border-[#22262E] rounded-lg text-xs font-mono text-slate-300">
                  {existingVaultDir || 'Select existing vault directory...'}
                </div>
                <button
                  type="button"
                  onClick={handleSelectExistingFolder}
                  className="px-3 py-2 rounded-lg bg-[#1A1E24] hover:bg-[#222832] border border-[#22262E] text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FolderOpen size={14} className="text-emerald-400" />
                  <span>Browse</span>
                </button>
              </div>
            </div>

            {existingVaultName && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-slate-300">
                <span className="font-semibold text-emerald-400">Vault: {existingVaultName}</span>
                {existingUserName && (
                  <span className="text-[11px] text-slate-400">User: {existingUserName}</span>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vault Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound size={14} />
                </span>
                <input
                  type="password"
                  value={existingPassword}
                  onChange={(e) => setExistingPassword(e.target.value)}
                  placeholder="Enter your vault password"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-[#0D0F12] border border-[#22262E] focus:border-emerald-500 focus:outline-none rounded-lg text-xs text-slate-100 placeholder-slate-600"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? (
                <span>Unlocking Vault...</span>
              ) : (
                <>
                  <span>Jump Back In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
