import React, { useState } from 'react'
import { Plus, X, Folder, Shield, KeyRound, Lock, User, AlertCircle } from 'lucide-react'
import { LeafLogo } from '../LeafLogo'
import { useAuthStore } from '../../store/useAuthStore'
import { useVaultStore } from '../../store/useVaultStore'

interface CreateVaultModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CreateVaultModal: React.FC<CreateVaultModalProps> = ({ isOpen, onClose }) => {
  const { createVault } = useAuthStore()
  const { refreshFiles } = useVaultStore()

  const [vaultName, setVaultName] = useState('')
  const [userName, setUserName] = useState(() => localStorage.getItem('ng_user_name') || '')
  const [parentDir, setParentDir] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSelectDirectory = async () => {
    if (window.genesis?.selectFolder) {
      const chosen = await window.genesis.selectFolder()
      if (chosen) {
        setParentDir(chosen)
        setError(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!vaultName.trim()) {
      setError('Vault Name is required')
      return
    }
    if (!userName.trim()) {
      setError('User Name is required for this vault')
      return
    }
    if (!parentDir.trim()) {
      setError('Please select a storage directory')
      return
    }
    if (!password || password.length < 4) {
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
        onClose()
      } else {
        setError(res.error || 'Failed to create vault')
      }
    } catch (err: any) {
      setError(err.message || 'Error creating vault')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0D10]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#13161B] border border-[#22262E] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#22262E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <LeafLogo className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Create New Encrypted Vault</h3>
              <p className="text-[11px] text-slate-400">Set up a clean, password-protected second brain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1A1E24]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Vault Name
            </label>
            <input
              type="text"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              placeholder="e.g. Work Spec Vault"
              autoFocus
              className="w-full px-3 py-1.5 bg-[#0D0F12] border border-[#22262E] focus:border-emerald-500 focus:outline-none rounded-lg text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              User Name for this Vault
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                <User size={13} />
              </span>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="User / Author Name"
                className="w-full pl-7 pr-3 py-1.5 bg-[#0D0F12] border border-[#22262E] focus:border-emerald-500 focus:outline-none rounded-lg text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Location Directory
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate px-3 py-1.5 bg-[#0D0F12] border border-[#22262E] rounded-lg text-xs font-mono text-slate-300">
                {parentDir || 'Choose destination folder...'}
              </div>
              <button
                type="button"
                onClick={handleSelectDirectory}
                className="px-3 py-1.5 rounded-lg bg-[#1A1E24] hover:bg-[#222832] border border-[#22262E] text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
              >
                <Folder size={13} className="text-emerald-400" />
                <span>Browse</span>
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#22262E]">
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-3 rounded-lg bg-[#1A1E24] hover:bg-[#222832] text-slate-400 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-1.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>{isSubmitting ? 'Creating...' : 'Create Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

