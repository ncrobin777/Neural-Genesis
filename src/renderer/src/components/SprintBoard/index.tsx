import React, { useMemo, useState } from 'react'
import {
  LayoutDashboard,
  CheckCircle2,
  Circle,
  FolderGit2,
  Layers,
  RefreshCw,
  X,
  PlayCircle,
  GripVertical
} from 'lucide-react'
import { useVaultStore, VaultFile } from '../../store/useVaultStore'

interface SprintBoardProps {
  onClose: () => void
}

interface ParsedSpecItem {
  file: VaultFile
  status: string
  targetRepo: string
  criteria: Array<{
    line: number
    checked: boolean
    command?: string
    text: string
  }>
  progress: number
}

type ColumnType = 'mounted' | 'backlog' | 'in_progress' | 'completed'

export const SprintBoard: React.FC<SprintBoardProps> = ({ onClose }) => {
  const { files, openFile, toggleMount, refreshFiles, updateFileContent } = useVaultStore()
  const [draggedSpecId, setDraggedSpecId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ColumnType | null>(null)

  // Parse frontmatter and acceptance criteria for all specs
  const specs = useMemo(() => {
    const list: ParsedSpecItem[] = []

    for (const f of files) {
      if (f.id.startsWith('00-constitution') || f.isDocs || f.id.startsWith('03-scratchpad')) {
        continue
      }

      // Simple frontmatter parsing
      let status = 'draft'
      let targetRepo = 'default'
      const lines = f.content.split(/\r?\n/)

      if (lines[0]?.trim() === '---') {
        const end = lines.slice(1).findIndex((l) => l.trim() === '---')
        if (end !== -1) {
          const fm = lines.slice(1, end + 1).join('\n')
          const statusMatch = fm.match(/status:\s*([^\n\r]+)/i)
          if (statusMatch) status = statusMatch[1].trim()

          const repoMatch = fm.match(/target(?:_repo)?:\s*([^\n\r]+)/i)
          if (repoMatch) targetRepo = repoMatch[1].trim()
        }
      }

      // Parse criteria checkboxes
      const criteria: ParsedSpecItem['criteria'] = []
      lines.forEach((line, index) => {
        const m = line.match(/^\s*-\s*\[([ xX])\]\s*(.*)$/)
        if (m) {
          const checked = m[1].toLowerCase() === 'x'
          const rawText = m[2].trim()
          let command: string | undefined = undefined
          let text = rawText

          const cmdMatch = rawText.match(/\[cmd:\s*([^\]]+)\]/)
          if (cmdMatch) {
            command = cmdMatch[1].trim()
            text = rawText.replace(/\[cmd:\s*([^\]]+)\]/, '').trim()
          }

          criteria.push({
            line: index + 1,
            checked,
            command,
            text
          })
        }
      })

      const completed = criteria.filter((c) => c.checked).length
      const progress = criteria.length > 0 ? Math.round((completed / criteria.length) * 100) : 0

      list.push({
        file: f,
        status,
        targetRepo,
        criteria,
        progress
      })
    }

    return list
  }, [files])

  // Column specs categorization
  const mountedSpecs = useMemo(
    () => specs.filter((s) => s.file.isMounted),
    [specs]
  )

  const backlogSpecs = useMemo(
    () =>
      specs.filter(
        (s) =>
          !s.file.isMounted &&
          s.status.toLowerCase() !== 'completed' &&
          s.status.toLowerCase() !== 'done' &&
          s.status.toLowerCase() !== 'in-progress' &&
          s.status.toLowerCase() !== 'in_progress' &&
          s.status.toLowerCase() !== 'doing' &&
          (s.progress < 100 || s.criteria.length === 0)
      ),
    [specs]
  )

  const inProgressSpecs = useMemo(
    () =>
      specs.filter(
        (s) =>
          !s.file.isMounted &&
          s.status.toLowerCase() !== 'completed' &&
          s.status.toLowerCase() !== 'done' &&
          (s.status.toLowerCase() === 'in-progress' ||
            s.status.toLowerCase() === 'in_progress' ||
            s.status.toLowerCase() === 'doing')
      ),
    [specs]
  )

  const completedSpecs = useMemo(
    () =>
      specs.filter(
        (s) =>
          s.status.toLowerCase() === 'completed' ||
          s.status.toLowerCase() === 'done' ||
          (!s.file.isMounted &&
            s.progress === 100 &&
            s.criteria.length > 0 &&
            s.status.toLowerCase() !== 'in-progress')
      ),
    [specs]
  )

  // Drag and drop handlers - can drag and drop anywhere between all columns
  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData('text/plain', fileId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedSpecId(fileId)
  }

  const handleDragEnd = () => {
    setDraggedSpecId(null)
    setDragOverCol(null)
  }

  const handleDragOver = (e: React.DragEvent, col: ColumnType) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== col) {
      setDragOverCol(col)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetCol: ColumnType) => {
    e.preventDefault()
    setDragOverCol(null)
    const fileId = e.dataTransfer.getData('text/plain') || draggedSpecId
    setDraggedSpecId(null)
    if (!fileId) return

    const spec = specs.find((s) => s.file.id === fileId)
    if (!spec) return

    const { file } = spec
    let content = file.content

    // Helper to update or set frontmatter status
    const updateStatusInContent = (rawContent: string, newStatus: string) => {
      const lines = rawContent.split(/\r?\n/)
      if (lines[0]?.trim() === '---') {
        const end = lines.slice(1).findIndex((l) => l.trim() === '---')
        if (end !== -1) {
          const fm = lines.slice(1, end + 1).join('\n')
          if (/status:\s*([^\n\r]+)/i.test(fm)) {
            return rawContent.replace(/status:\s*([^\n\r]+)/i, `status: ${newStatus}`)
          } else {
            lines.splice(1, 0, `status: ${newStatus}`)
            return lines.join('\n')
          }
        }
      }
      return `---\nstatus: ${newStatus}\n---\n\n${rawContent}`
    }

    if (targetCol === 'mounted') {
      if (!file.isMounted) {
        await toggleMount(file.id)
      }
      const updated = updateStatusInContent(content, 'ready')
      if (updated !== content) {
        await updateFileContent(file.id, updated)
      }
    } else if (targetCol === 'backlog') {
      if (file.isMounted) {
        await toggleMount(file.id)
      }
      // Uncheck criteria if dragged back from completed
      const lines = content.split(/\r?\n/)
      const updatedLines = lines.map((line) => {
        if (/^\s*-\s*\[[xX]\]/.test(line)) {
          return line.replace(/^(\s*-\s*)\[[xX]\]/, '$1[ ]')
        }
        return line
      })
      const contentUnchecked = updatedLines.join('\n')
      const updated = updateStatusInContent(contentUnchecked, 'draft')
      await updateFileContent(file.id, updated)
    } else if (targetCol === 'in_progress') {
      if (file.isMounted) {
        await toggleMount(file.id)
      }
      const updated = updateStatusInContent(content, 'in-progress')
      await updateFileContent(file.id, updated)
    } else if (targetCol === 'completed') {
      if (file.isMounted) {
        await toggleMount(file.id)
      }
      // Check all criteria in content
      const lines = content.split(/\r?\n/)
      const updatedLines = lines.map((line) => {
        if (/^\s*-\s*\[\s*\]/.test(line)) {
          return line.replace(/^(\s*-\s*)\[\s*\]/, '$1[x]')
        }
        return line
      })
      const checkedContent = updatedLines.join('\n')
      const finalContent = updateStatusInContent(checkedContent, 'completed')
      await updateFileContent(file.id, finalContent)
    }
  }

  return (
    <div className="flex-1 h-full relative bg-surface-container-lowest text-on-surface flex flex-col select-none overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="h-11 bg-surface-container-low border-b border-[#c3c6d7]/30 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard size={16} className="text-primary" />
          <span className="text-sm font-semibold text-on-surface">
            Sprint Control & Mission Dashboard
          </span>
          <span className="text-[11px] text-on-surface-variant font-mono">
            (Dataview SQL Query: SELECT * FROM specs WHERE status)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshFiles()}
            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="Refresh database index"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="Close sprint board"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Kanban / Multi-column Query Table */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4">
        {/* Column 1: Mounted to MCP Loop */}
        <div
          onDragOver={(e) => handleDragOver(e, 'mounted')}
          onDrop={(e) => handleDrop(e, 'mounted')}
          className={`flex-1 min-w-[280px] max-w-[380px] bg-surface-container-low border rounded-xl flex flex-col overflow-hidden transition-all ${
            dragOverCol === 'mounted'
              ? 'border-primary ring-2 ring-primary/20 bg-surface-container'
              : 'border-[#c3c6d7]/30'
          }`}
        >
          <div className="p-3 border-b border-[#c3c6d7]/30 flex items-center justify-between bg-primary/10">
            <div className="flex items-center gap-2 font-semibold text-xs text-primary">
              <span className="material-symbols-outlined text-[16px]">sync</span>
              <span>Mounted to MCP Loop</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold">
              {mountedSpecs.length}
            </span>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            {mountedSpecs.map((spec) => (
              <div
                key={spec.file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, spec.file.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  openFile(spec.file.id)
                  onClose()
                }}
                className={`p-3 rounded-lg bg-surface-container-lowest border border-[#c3c6d7]/30 hover:border-primary/60 cursor-grab active:cursor-grabbing transition-all shadow-sm group ${
                  draggedSpecId === spec.file.id ? 'opacity-40 scale-95' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <GripVertical size={13} className="text-on-surface-variant/40 group-hover:text-primary flex-shrink-0" />
                    <span className="font-semibold text-xs text-on-surface group-hover:text-primary truncate">
                      {spec.file.title}.md
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMount(spec.file.id)
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 font-medium hover:bg-primary/25 cursor-pointer transition-colors"
                  >
                    Mounted
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono mb-2">
                  <FolderGit2 size={12} />
                  <span className="truncate">{spec.targetRepo}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mb-2.5">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${spec.progress}%` }}
                  />
                </div>

                {/* Criteria preview */}
                <div className="space-y-1">
                  {spec.criteria.slice(0, 3).map((crit, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                      {crit.checked ? (
                        <CheckCircle2 size={12} className="text-primary flex-shrink-0" />
                      ) : (
                        <Circle size={12} className="text-on-surface-variant/40 flex-shrink-0" />
                      )}
                      <span className={`truncate ${crit.checked ? 'line-through text-on-surface-variant/60' : ''}`}>
                        {crit.command ? `[${crit.command}] ` : ''}
                        {crit.text}
                      </span>
                    </div>
                  ))}
                  {spec.criteria.length > 3 && (
                    <div className="text-[10px] text-on-surface-variant/70 font-mono mt-1">
                      +{spec.criteria.length - 3} more acceptance criteria
                    </div>
                  )}
                </div>
              </div>
            ))}
            {mountedSpecs.length === 0 && (
              <div className="h-28 border border-dashed border-[#c3c6d7]/40 rounded-lg flex items-center justify-center text-xs text-on-surface-variant/60">
                Drag spec here to mount
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Backlog & Specifications */}
        <div
          onDragOver={(e) => handleDragOver(e, 'backlog')}
          onDrop={(e) => handleDrop(e, 'backlog')}
          className={`flex-1 min-w-[280px] max-w-[380px] bg-surface-container-low border rounded-xl flex flex-col overflow-hidden transition-all ${
            dragOverCol === 'backlog'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-surface-container'
              : 'border-[#c3c6d7]/30'
          }`}
        >
          <div className="p-3 border-b border-[#c3c6d7]/30 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-xs text-on-surface">
              <Layers size={13} className="text-amber-500" />
              <span>Backlog & Specifications</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
              {backlogSpecs.length}
            </span>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            {backlogSpecs.map((spec) => (
              <div
                key={spec.file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, spec.file.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  openFile(spec.file.id)
                  onClose()
                }}
                className={`p-3 rounded-lg bg-surface-container-lowest border border-[#c3c6d7]/30 hover:border-amber-500/60 cursor-grab active:cursor-grabbing transition-all shadow-sm group ${
                  draggedSpecId === spec.file.id ? 'opacity-40 scale-95' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <GripVertical size={13} className="text-on-surface-variant/40 group-hover:text-amber-500 flex-shrink-0" />
                    <span className="font-semibold text-xs text-on-surface group-hover:text-amber-500 truncate">
                      {spec.file.title}.md
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMount(spec.file.id)
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-surface-container hover:bg-primary/15 text-on-surface-variant hover:text-primary border border-[#c3c6d7]/40 cursor-pointer transition-colors"
                  >
                    Mount Spec
                  </button>
                </div>

                <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${spec.progress}%` }}
                  />
                </div>

                <div className="text-[11px] text-on-surface-variant">
                  {spec.criteria.filter((c) => c.checked).length} of {spec.criteria.length} criteria passed
                </div>
              </div>
            ))}
            {backlogSpecs.length === 0 && (
              <div className="h-28 border border-dashed border-[#c3c6d7]/40 rounded-lg flex items-center justify-center text-xs text-on-surface-variant/60">
                Drag spec here for backlog
              </div>
            )}
          </div>
        </div>

        {/* Column 3: In Progress */}
        <div
          onDragOver={(e) => handleDragOver(e, 'in_progress')}
          onDrop={(e) => handleDrop(e, 'in_progress')}
          className={`flex-1 min-w-[280px] max-w-[380px] bg-surface-container-low border rounded-xl flex flex-col overflow-hidden transition-all ${
            dragOverCol === 'in_progress'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-surface-container'
              : 'border-[#c3c6d7]/30'
          }`}
        >
          <div className="p-3 border-b border-[#c3c6d7]/30 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-xs text-on-surface">
              <PlayCircle size={13} className="text-indigo-500" />
              <span>In Progress</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
              {inProgressSpecs.length}
            </span>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            {inProgressSpecs.map((spec) => (
              <div
                key={spec.file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, spec.file.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  openFile(spec.file.id)
                  onClose()
                }}
                className={`p-3 rounded-lg bg-surface-container-lowest border border-[#c3c6d7]/30 hover:border-indigo-500/60 cursor-grab active:cursor-grabbing transition-all shadow-sm group ${
                  draggedSpecId === spec.file.id ? 'opacity-40 scale-95' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <GripVertical size={13} className="text-on-surface-variant/40 group-hover:text-indigo-500 flex-shrink-0" />
                    <span className="font-semibold text-xs text-on-surface group-hover:text-indigo-500 truncate">
                      {spec.file.title}.md
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-medium">
                    Active
                  </span>
                </div>

                <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${spec.progress}%` }}
                  />
                </div>

                <div className="text-[11px] text-on-surface-variant">
                  {spec.criteria.filter((c) => c.checked).length} of {spec.criteria.length} criteria passed ({spec.progress}%)
                </div>
              </div>
            ))}
            {inProgressSpecs.length === 0 && (
              <div className="h-28 border border-dashed border-[#c3c6d7]/40 rounded-lg flex items-center justify-center text-xs text-on-surface-variant/60">
                Drag spec here to mark in progress
              </div>
            )}
          </div>
        </div>

        {/* Column 4: Verified & Completed */}
        <div
          onDragOver={(e) => handleDragOver(e, 'completed')}
          onDrop={(e) => handleDrop(e, 'completed')}
          className={`flex-1 min-w-[280px] max-w-[380px] bg-surface-container-low border rounded-xl flex flex-col overflow-hidden transition-all ${
            dragOverCol === 'completed'
              ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-surface-container'
              : 'border-[#c3c6d7]/30'
          }`}
        >
          <div className="p-3 border-b border-[#c3c6d7]/30 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-xs text-cyan-600 dark:text-cyan-400">
              <CheckCircle2 size={13} className="text-cyan-600 dark:text-cyan-400" />
              <span>Verified Complete (100%)</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
              {completedSpecs.length}
            </span>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            {completedSpecs.map((spec) => (
              <div
                key={spec.file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, spec.file.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  openFile(spec.file.id)
                  onClose()
                }}
                className={`p-3 rounded-lg bg-surface-container-lowest border border-[#c3c6d7]/30 hover:border-cyan-500/60 cursor-grab active:cursor-grabbing transition-all shadow-sm group ${
                  draggedSpecId === spec.file.id ? 'opacity-40 scale-95' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <GripVertical size={13} className="text-on-surface-variant/40 group-hover:text-cyan-500 flex-shrink-0" />
                    <span className="font-semibold text-xs text-on-surface group-hover:text-cyan-500 truncate">
                      {spec.file.title}.md
                    </span>
                  </div>
                  <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                </div>
              </div>
            ))}
            {completedSpecs.length === 0 && (
              <div className="h-28 border border-dashed border-[#c3c6d7]/40 rounded-lg flex items-center justify-center text-xs text-on-surface-variant/60">
                Drag spec here to mark complete
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
