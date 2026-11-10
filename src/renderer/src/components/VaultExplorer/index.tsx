import React, { useState, useMemo } from 'react'
import {
  Lock,
  CheckSquare,
  Square,
  Link as LinkIcon,
  FileText,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Shield,
  Layers,
  FileCode2,
  Compass,
  BookOpen
} from 'lucide-react'
import { useVaultStore, VaultFile, DOCS_FILE_ID } from '../../store/useVaultStore'
import { useMcpStore } from '../../store/useMcpStore'

export const VaultExplorer: React.FC = () => {
  const { files, activeFileId, openFile, toggleMount, createNewFile, renameFile, deleteFile, openDocs } =
    useVaultStore()
  const { setSettingsOpen } = useMcpStore()

  // Inline rename state
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  // New Note Category Picker Dropdown
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)

  const constitutionFiles = files.filter(
    (f) => (f.id.startsWith('00-constitution') || f.isLocked) && f.id !== DOCS_FILE_ID && !f.isDocs
  )
  // Calculate actual unlinked notes dynamically
  const unlinkedCount = useMemo(() => {
    // Collect all referenced targets across files
    const targets = new Set<string>()
    files.forEach((f) => {
      const matches = f.content.matchAll(/\[\[(?:[^:|\]]+\:)?([^\]|#]+)/g)
      for (const m of matches) {
        if (m[1]) {
          const target = m[1].trim().toLowerCase()
          targets.add(target)
          targets.add(`${target}.md`)
          targets.add(target.split('/').pop() || target)
        }
      }
    })

    // Count how many files have 0 incoming and 0 outgoing links
    return files.filter((f) => {
      const hasOutgoing = /\[\[(.*?)\]\]/.test(f.content)
      const baseName = f.title.toLowerCase()
      const hasIncoming = targets.has(baseName) || targets.has(f.id.toLowerCase())
      return !hasOutgoing && !hasIncoming
    }).length
  }, [files])

  // Consolidate all non-constitution and non-docs notes into Workpad
  const workpadFiles = files.filter(
    (f) => !f.id.startsWith('00-constitution') && !f.isLocked && f.id !== DOCS_FILE_ID && !f.isDocs
  )

  const handleStartRename = (file: VaultFile, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingFileId(file.id)
    setEditingTitle(file.title)
  }

  const handleCommitRename = async (file: VaultFile) => {
    if (editingTitle && editingTitle.trim() && editingTitle !== file.title) {
      await renameFile(file.id, editingTitle.trim())
    }
    setEditingFileId(null)
  }

  const handleCreateIn = (category: 'specs' | 'constitution' | 'architecture' | 'scratchpad') => {
    createNewFile(category)
    setIsAddMenuOpen(false)
  }

  const renderFileRow = (
    file: VaultFile,
    options: { showMountCheckbox?: boolean; isLocked?: boolean } = {}
  ) => {
    const isActive = activeFileId === file.id
    const isEditing = editingFileId === file.id

    return (
      <div
        key={file.id}
        onClick={() => !isEditing && openFile(file.id)}
        className={`group flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer select-none transition-colors ${
          isActive
            ? 'bg-[#1A1E24] text-slate-100 font-medium'
            : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1E24]/50'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
          {/* Mount Checkbox for Specs */}
          {options.showMountCheckbox && !file.isLocked && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleMount(file.id)
              }}
              className="text-slate-500 hover:text-emerald-400 transition-colors"
            >
              {file.isMounted ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckSquare size={13} className="text-emerald-400" />
                  <span className="text-[10px]">🟢</span>
                </span>
              ) : (
                <span className="flex items-center text-slate-500">
                  <Square size={13} />
                </span>
              )}
            </button>
          )}

          {options.isLocked && (
            <span title="Locked Constitution" className="text-amber-400">
              <Lock size={12} />
            </span>
          )}

          {file.isAutoLinked && !file.isMounted && !options.isLocked && (
            <span
              title="Transitive Dependency (Referenced in active spec)"
              className="text-cyan-400 flex items-center gap-0.5"
            >
              <LinkIcon size={12} />
              <span className="text-[10px]">🔗</span>
            </span>
          )}

          {!options.showMountCheckbox && !options.isLocked && !file.isAutoLinked && (
            <FileText size={13} className="text-slate-500" />
          )}

          {/* Editable File Title */}
          {isEditing ? (
            <div
              className="flex items-center gap-1 flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitRename(file)
                  if (e.key === 'Escape') setEditingFileId(null)
                }}
                autoFocus
                className="bg-[#0D0F12] text-slate-100 px-1 py-0.5 rounded border border-emerald-500 text-xs w-full focus:outline-none"
              />
              <button
                onClick={() => handleCommitRename(file)}
                className="text-emerald-400 hover:text-emerald-300"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => setEditingFileId(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <span className="truncate flex-1">{file.title}.md</span>
          )}
        </div>

        {/* Hover Action Buttons & Token Count */}
        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <button
                onClick={(e) => handleStartRename(file, e)}
                title="Rename file and refactor all links"
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-200 transition-opacity p-0.5"
              >
                <Edit2 size={11} />
              </button>
              {!options.isLocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Are you sure you want to delete "${file.title}.md"?`)) {
                      deleteFile(file.id)
                    }
                  }}
                  title="Delete note"
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </>
          )}
          <span className="text-[10px] text-slate-500 group-hover:text-slate-400 font-mono ml-0.5">
            {file.tokenCount}t
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-60 bg-surface-container-lowest border-r border-[#c3c6d7]/30 flex flex-col h-full select-none relative shadow-[0_1px_8px_rgba(0,0,0,0.03)] font-body-sm text-body-sm text-on-surface">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-[#c3c6d7]/30">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
          Atlas of Mind
        </span>
        <div className="flex items-center gap-1 relative">
          {/* New Item Dropdown Button */}
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            title="Create New Note..."
            className="p-1 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">note_add</span>
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            title="Vault Settings"
            className="p-1 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
          </button>

          {/* Category Picker Popover */}
          {isAddMenuOpen && (
            <div className="absolute right-0 top-7 w-48 bg-surface-container-lowest border border-[#c3c6d7]/40 rounded-lg shadow-xl p-1 z-50 text-xs">
              <div className="px-2 py-1 text-[10px] text-on-surface-variant uppercase font-bold border-b border-[#c3c6d7]/30">
                Add Item To:
              </div>
              <button
                onClick={() => handleCreateIn('scratchpad')}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-surface-container text-on-surface flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px] text-primary">edit_note</span>
                <span>Workpad Note</span>
              </button>
              <button
                onClick={() => handleCreateIn('constitution')}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-surface-container text-on-surface flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px] text-secondary">shield</span>
                <span>Constitution (Lock)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="px-2 py-1.5 flex items-center gap-1 border-b border-[#c3c6d7]/20">
        <button
          onClick={() => handleCreateIn('specs')}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-surface-container-low font-label-sm text-label-sm text-primary hover:bg-surface-container transition-colors cursor-pointer font-semibold"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          <span>Note</span>
        </button>
        <button
          onClick={() => handleCreateIn('scratchpad')}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-surface-container-low font-label-sm text-label-sm text-secondary hover:bg-surface-container transition-colors cursor-pointer font-semibold"
        >
          <span className="material-symbols-outlined text-[14px]">dashboard_customize</span>
          <span>Canvas</span>
        </button>
      </div>

      {/* Directory Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* DOCUMENTATION & GUIDE (Only visible when user has Docs opened) */}
        {activeFileId === DOCS_FILE_ID && (
          <div>
            <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              <BookOpen size={11} />
              <span>Learning & Docs</span>
            </div>
            <div
              onClick={() => openDocs()}
              className="group flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer select-none transition-colors border bg-[#1A1E24] text-amber-300 font-medium border-amber-500/30"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <BookOpen size={13} className="text-amber-400 flex-shrink-0" />
                <span className="truncate flex-1 font-medium">Docs (How App Works)</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                Active
              </span>
            </div>
          </div>
        )}

        {/* 1. CONSTITUTION (LOCKED) */}
        <div>
          <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            <Lock size={11} />
            <span>Constitution (Locked)</span>
          </div>
          <div className="space-y-0.5">
            {constitutionFiles.map((f) => renderFileRow(f, { isLocked: true }))}
          </div>
        </div>

        {/* 2. WORKPAD (SELECT TO MOUNT TO MCP) */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Workpad (Select to Send to MCP)
            </span>
          </div>
          <div className="space-y-0.5">
            {workpadFiles.map((f) =>
              renderFileRow(f, { showMountCheckbox: true })
            )}
          </div>
        </div>
      </div>

      {/* Google Stitch Vault Stats Footer */}
      <div className="p-2.5 bg-surface-container-low border-t border-[#c3c6d7]/30 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] text-secondary">link</span>
          <span>{unlinkedCount} Unlinked</span>
        </div>
        <span className="text-primary font-semibold">
          {files.length.toLocaleString()} Notes
        </span>
      </div>
    </div>
  )
}
