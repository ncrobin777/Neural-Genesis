import React, { useState } from 'react'
import { Lock, KeyRound, AlertCircle, FolderOpen, ArrowRight, ShieldCheck } from 'lucide-react'
import { LeafLogo } from '../LeafLogo'
import { useAuthStore } from '../../store/useAuthStore'
import { useVaultStore } from '../../store/useVaultStore'

export const VaultUnlockModal: React.FC = () => {
  const { vaultInfo, activeVaultPath, unlock, openVault } = useAuthStore()
  const { refreshFiles } = useVaultStore()

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('Please enter your vault password')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await unlock(password)
      if (res.success) {
        await refreshFiles()
      } else {
        setError(res.error || 'Incorrect password')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDifferentVault = async () => {
    if (window.genesis?.selectFolder) {
      const folder = await window.genesis.selectFolder()
      if (folder) {
        await openVault(folder)
        setPassword('')
        setError(null)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0D10]/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-[#13161B] border border-emerald-500/30 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(50,135,119,0.3)]">
          <LeafLogo className="w-10 h-10" />
        </div>

        <h2 className="text-base font-bold text-slate-100 tracking-tight">
          {vaultInfo?.vaultName || 'Protected Vault'}
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>User: <strong className="text-slate-200">{vaultInfo?.userName || 'Owner'}</strong></span>
        </div>

        <p className="text-[11px] text-slate-500 mt-1 mb-4 truncate max-w-xs font-mono">
          {activeVaultPath}
        </p>

        <form onSubmit={handleUnlock} className="w-full space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <KeyRound size={14} />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Vault Password"
              autoFocus
              className="w-full pl-9 pr-3 py-2 bg-[#0D0F12] border border-[#22262E] focus:border-emerald-500 focus:outline-none rounded-lg text-xs text-slate-100 placeholder-slate-600 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-left">
              <AlertCircle size={13} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting ? <span>Decrypting...</span> : (
              <>
                <span>Unlock Vault</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-[#22262E] w-full flex justify-center">
          <button
            type="button"
            onClick={handleOpenDifferentVault}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FolderOpen size={13} />
            <span>Open or switch vault</span>
          </button>
        </div>
      </div>
    </div>
  )
}

