import React, { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { keymap } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { mcpSemanticGutterPlugin } from '../../editor-extensions/mcp-gutter'
import { createWikilinkSuggestExtension } from '../../editor-extensions/wikilink-suggest'
import { livePreviewExtension } from '../../editor-extensions/live-preview'
import { useVaultStore, DOCS_FILE_ID } from '../../store/useVaultStore'
import { CANONICAL_DOCS_CONTENT } from '../../constants/docs'
import { useThemeStore, THEMES } from '../../store/useThemeStore'
import {
  Lock,
  FolderGit2,
  Sparkles,
  X,
  Link2,
  Check,
  BookOpen,
  RotateCcw,
  ShieldCheck
} from 'lucide-react'

export const EditorWorkbench: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  const [saveIndicator, setSaveIndicator] = useState(false)
  const [editorFontSize, setEditorFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('ng_editor_font_size')
    return saved ? parseInt(saved, 10) : 14
  })
  const [selectionPopup, setSelectionPopup] = useState<{
    text: string
    from: number
    to: number
    x: number
    y: number
    isExistingLink: boolean
    currentType: string
    targetNote: string
    alias?: string
  } | null>(null)

  const {
    files,
    activeFileId,
    openTabs,
    openFile,
    closeTab,
    updateFileContent,
    toggleMount,
    targetRepo,
    setTargetRepo
  } = useVaultStore()

  const { currentTheme } = useThemeStore()
  const activeFile = files.find((f) => f.id === activeFileId)

  // Obsidian Formatting Helper
  const handleFormatInsert = (prefix: string, suffix: string = '') => {
    if (!viewRef.current) return
    const view = viewRef.current
    const selection = view.state.selection.main
    const selectedText = view.state.sliceDoc(selection.from, selection.to)

    if (selectedText.length > 0) {
      // Wrap selected text
      const replacement = `${prefix}${selectedText}${suffix}`
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: replacement },
        selection: { anchor: selection.from + prefix.length, head: selection.from + prefix.length + selectedText.length }
      })
    } else {
      // Insert at cursor
      const replacement = `${prefix}${suffix}`
      view.dispatch({
        changes: { from: selection.from, insert: replacement },
        selection: { anchor: selection.from + prefix.length }
      })
    }
    view.focus()
  }

  // Initialize & Update CodeMirror 6 Editor
  useEffect(() => {
    if (!editorRef.current || !activeFile) return

    if (viewRef.current) {
      viewRef.current.destroy()
    }

    const availableNotes = files.map((f) => ({ id: f.id, title: f.title }))
    const activeThemeDef = THEMES[currentTheme] || THEMES.carbon

    const handleLinkEstablished = (edgeType: string, targetFileId: string, sourceFileId: string) => {
      if (['front', '<->', 'peer'].includes(edgeType.toLowerCase())) {
        const target = files.find((f) => f.id === targetFileId || f.id === targetFileId + '.md')
        if (target) {
          const sourceBase = sourceFileId.replace(/\.md$/, '')
          if (!target.content.includes(sourceBase)) {
            const reciprocalLink = `\n\n## Bidirectional Peer Connections\n- [[front:${sourceBase}]]\n`
            updateFileContent(target.id, target.content + reciprocalLink)
          }
        }
      }
    }

    const editorThemeExtension = EditorView.theme({
      '&': {
        height: '100%',
        backgroundColor: activeThemeDef.colors.editorBg,
        color: activeThemeDef.colors.textPrimary,
        fontSize: `${editorFontSize}px`
      },
      '.cm-scroller': { overflow: 'auto' },
      '.cm-content': {
        caretColor: activeThemeDef.colors.accent,
        fontSize: `${editorFontSize}px`
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: activeThemeDef.colors.accent
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: activeThemeDef.colors.accentBg
      },
      '.cm-panels': {
        backgroundColor: activeThemeDef.colors.bgSurface,
        color: activeThemeDef.colors.textPrimary
      },
      '.cm-gutters': {
        backgroundColor: activeThemeDef.colors.editorBg,
        color: activeThemeDef.colors.textMuted,
        borderRight: `1px solid ${activeThemeDef.colors.borderSubtle}`
      },
      '.cm-activeLine': {
        backgroundColor: activeThemeDef.colors.bgElevated
      },
      '.cm-activeLineGutter': {
        backgroundColor: activeThemeDef.colors.bgElevated
      }
    }, { dark: !activeThemeDef.isLight })

    const state = EditorState.create({
      doc: activeFile.content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        markdown(),
        editorThemeExtension,
        ...(!activeThemeDef.isLight ? [oneDark] : [syntaxHighlighting(defaultHighlightStyle)]),
        livePreviewExtension,
        mcpSemanticGutterPlugin,
        createWikilinkSuggestExtension(availableNotes, activeFile.id, handleLinkEstablished),
        keymap.of([
          // Prevent browser default Ctrl+S / Cmd+S save-as / download prompt!
          {
            key: 'Mod-s',
            run: (view) => {
              const currentContent = view.state.doc.toString()
              updateFileContent(activeFile.id, currentContent)
              setSaveIndicator(true)
              setTimeout(() => setSaveIndicator(false), 1200)
              return true
            }
          },
          // Selection hotkey Cmd/Ctrl + Shift + L
          {
            key: 'Mod-Shift-l',
            run: (view) => {
              const selection = view.state.selection.main
              const doc = view.state.doc
              const text = view.state.sliceDoc(selection.from, selection.to)
              const coords = view.coordsAtPos(selection.from)

              // Check if cursor or selection is inside an existing [[link]]
              const line = doc.lineAt(selection.from)
              const lineText = line.text

              const linkRegex = /\[\[([^\]]+)\]\]/g
              let m: RegExpExecArray | null
              while ((m = linkRegex.exec(lineText)) !== null) {
                const linkStart = line.from + m.index
                const linkEnd = linkStart + m[0].length

                if (selection.from >= linkStart && selection.from <= linkEnd) {
                  let inner = m[1].trim()
                  let alias: string | undefined = undefined
                  if (inner.includes('|')) {
                    const parts = inner.split('|')
                    inner = parts[0].trim()
                    alias = parts.slice(1).join('|').trim()
                  }
                  let currentType = 'back'
                  let targetNote = inner
                  if (inner.includes(':')) {
                    const p = inner.split(':')
                    currentType = p[0].toLowerCase()
                    targetNote = p.slice(1).join(':')
                  }

                  if (coords) {
                    setSelectionPopup({
                      text: m[0],
                      from: linkStart,
                      to: linkEnd,
                      x: coords.left,
                      y: coords.top - 48,
                      isExistingLink: true,
                      currentType,
                      targetNote,
                      alias
                    })
                  }
                  return true
                }
              }

              // Otherwise transform raw selection into link
              if (!selection.empty && coords) {
                setSelectionPopup({
                  text,
                  from: selection.from,
                  to: selection.to,
                  x: coords.left,
                  y: coords.top - 48,
                  isExistingLink: false,
                  currentType: 'back',
                  targetNote: text
                })
                return true
              }

              return false
            }
          },
          ...defaultKeymap,
          ...historyKeymap
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const nextContent = update.state.doc.toString()
            if (activeFile.id === DOCS_FILE_ID || activeFile.isDocs) {
              // User attempted to edit the documentation: revert it back!
              if (nextContent !== CANONICAL_DOCS_CONTENT) {
                setTimeout(() => {
                  if (viewRef.current) {
                    viewRef.current.dispatch({
                      changes: { from: 0, to: viewRef.current.state.doc.length, insert: CANONICAL_DOCS_CONTENT }
                    })
                  }
                }, 10)
              }
              return
            }
            updateFileContent(activeFile.id, nextContent)
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' }
        })
      ]
    })

    const view = new EditorView({
      state,
      parent: editorRef.current
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [activeFileId, currentTheme, editorFontSize])

  // Prevent browser window from intercepting Ctrl+S
  useEffect(() => {
    const handleGlobalSave = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        e.stopPropagation()
        if (activeFile && viewRef.current) {
          const currentContent = viewRef.current.state.doc.toString()
          updateFileContent(activeFile.id, currentContent)
          setSaveIndicator(true)
          setTimeout(() => setSaveIndicator(false), 1200)
        }
      }
    }
    window.addEventListener('keydown', handleGlobalSave, true)
    return () => window.removeEventListener('keydown', handleGlobalSave, true)
  }, [activeFileId])

  // Listen to external IPC mutations
  useEffect(() => {
    if (!window.genesis) return
    const unsubscribe = window.genesis.onMutateCriterion(({ fileId, criterionId: _criterionId, checked }) => {
      if (activeFileId === fileId && viewRef.current) {
        const view = viewRef.current
        const doc = view.state.doc.toString()
        const lines = doc.split(/\r?\n/)

        for (let i = 0; i < lines.length; i++) {
          if (/^(\s*)-\s+\[[ xX]\]/.test(lines[i])) {
            lines[i] = lines[i].replace(/^(\s*)-\s+\[[ xX]\]/, checked ? '$1- [x]' : '$1- [ ]')
            break
          }
        }

        const newDoc = lines.join('\n')
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: newDoc }
        })
      }
    })
    return () => unsubscribe()
  }, [activeFileId])

  // Transform or change existing link connection type anytime
  const handleConvertSelection = (newType: 'front' | 'back' | 'loop' | 'spider' | 'to' | 'shift') => {
    if (!selectionPopup || !viewRef.current) return
    const view = viewRef.current

    let targetSlug = selectionPopup.isExistingLink
      ? selectionPopup.targetNote
      : selectionPopup.text.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')

    const prefix = newType === 'back' ? '' : `${newType}:`
    const aliasPart = selectionPopup.alias ? `|${selectionPopup.alias}` : ''
    const replacement = `[[${prefix}${targetSlug}${aliasPart}]]`

    view.dispatch({
      changes: { from: selectionPopup.from, to: selectionPopup.to, insert: replacement }
    })

    // If converted to front: (bidirectional), establish reciprocal link in target file
    if (newType === 'front' && activeFile) {
      const target = files.find((f) => f.id.includes(targetSlug) || f.id.includes(targetSlug + '.md'))
      if (target) {
        const sourceBase = activeFile.id.replace(/\.md$/, '')
        if (!target.content.includes(sourceBase)) {
          const reciprocalLink = `\n\n## Bidirectional Peer Connections\n- [[front:${sourceBase}]]\n`
          updateFileContent(target.id, target.content + reciprocalLink)
        }
      }
    }

    setSelectionPopup(null)
  }

  const handlePromoteToSpec = () => {
    if (!activeFile || !viewRef.current) return
    const view = viewRef.current
    const currentDoc = view.state.doc.toString()

    const specTemplate = `<!-- mcp:ignore -->
${currentDoc}
<!-- /mcp:ignore -->

## Requirements
- Detail functional specifications here.

## Acceptance Criteria
- [ ] [cmd: pnpm test] Verify tests pass
`
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: specTemplate }
    })
  }

  const handleSelectRepo = async () => {
    if (window.genesis) {
      const res = await window.genesis.selectTargetRepo()
      if (res) {
        setTargetRepo(res)
      }
    }
  }

  if (!activeFile) {
    return (
      <div className="flex-1 bg-[#0D0F12] flex items-center justify-center text-slate-500">
        Select a note from the Vault Explorer to edit.
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[#0D0F12] flex flex-col h-full overflow-hidden relative">
      {/* Tab Bar */}
      <div className="h-9 bg-[#13161B] border-b border-[#22262E] flex items-center overflow-x-auto select-none px-2 gap-1">
        {openTabs
          .filter((tabId) => tabId !== DOCS_FILE_ID || activeFileId === DOCS_FILE_ID)
          .map((tabId) => {
            const file = files.find((f) => f.id === tabId) || (tabId === DOCS_FILE_ID ? { id: DOCS_FILE_ID, title: 'Docs', isLocked: true, isMounted: false, isAutoLinked: false, tokenCount: 450, content: '' } : undefined)
            const isActive = tabId === activeFileId
          return (
            <div
              key={tabId}
              onClick={() => openFile(tabId)}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs cursor-pointer border transition-colors ${
                isActive
                  ? 'bg-[#1A1E24] text-slate-100 border-[#22262E]'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#1A1E24]/40'
              }`}
            >
              {file?.id === DOCS_FILE_ID || file?.isDocs ? (
                <BookOpen size={11} className="text-amber-400" />
              ) : file?.isLocked ? (
                <Lock size={11} className="text-amber-400" />
              ) : file?.isMounted ? (
                <span className="text-[10px]">🟢</span>
              ) : null}
              <span className="truncate max-w-[140px]">
                {file?.id === DOCS_FILE_ID ? '📖 Docs' : (file?.title || tabId)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tabId)
                }}
                className="text-slate-500 hover:text-slate-300 ml-1"
              >
                <X size={11} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Top Breadcrumb Navigation & Live Dual-Sync */}
      <div className="h-8 bg-surface-container-lowest border-b border-[#c3c6d7]/30 px-4 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md overflow-hidden">
          <span className="hover:text-primary cursor-pointer">Vault</span>
          <span className="text-outline">›</span>
          <span className="hover:text-primary cursor-pointer truncate max-w-[120px]">
            {activeFile.id.includes('/') ? activeFile.id.split('/')[0] : '01 Projects'}
          </span>
          <span className="text-outline">›</span>
          <span className="text-on-surface font-semibold flex items-center gap-1.5 truncate max-w-[200px]">
            <span className="material-symbols-outlined text-[15px] text-primary">description</span>
            <span>{activeFile.title.replace(/\.md$/, '')}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saveIndicator && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-mono animate-fade-in">
              <Check size={12} />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Obsidian Formatting Toolbar */}
      <div className="h-10 bg-surface-container-lowest border-b border-[#c3c6d7]/30 px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* H1 */}
          <button
            onClick={() => handleFormatInsert('# ', '')}
            className="px-2 py-1 rounded hover:bg-surface-container text-on-surface font-bold text-xs transition-colors cursor-pointer"
            title="Heading 1"
          >
            H1
          </button>
          {/* H2 */}
          <button
            onClick={() => handleFormatInsert('## ', '')}
            className="px-2 py-1 rounded hover:bg-surface-container text-on-surface font-bold text-xs transition-colors cursor-pointer"
            title="Heading 2"
          >
            H2
          </button>

          <div className="h-4 w-[1px] bg-[#c3c6d7]/40 mx-1" />

          {/* Bold */}
          <button
            onClick={() => handleFormatInsert('**', '**')}
            className="px-2 py-1 rounded hover:bg-surface-container text-on-surface font-bold text-xs transition-colors cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          {/* Italic */}
          <button
            onClick={() => handleFormatInsert('*', '*')}
            className="px-2 py-1 rounded hover:bg-surface-container text-on-surface italic text-xs transition-colors cursor-pointer font-serif"
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          {/* Underline */}
          <button
            onClick={() => handleFormatInsert('<u>', '</u>')}
            className="px-2 py-1 rounded hover:bg-surface-container text-on-surface underline text-xs transition-colors cursor-pointer"
            title="Underline"
          >
            U
          </button>

          <div className="h-4 w-[1px] bg-[#c3c6d7]/40 mx-1" />

          {/* Wikilink */}
          <button
            onClick={() => handleFormatInsert('[[', ']]')}
            className="px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            title="Obsidian Wikilink [[Note]]"
          >
            <span className="material-symbols-outlined text-[13px]">link</span>
            <span>[[ ]]</span>
          </button>

          {/* LaTeX Math */}
          <button
            onClick={() => handleFormatInsert('$$\n', '\n$$')}
            className="px-2 py-1 rounded hover:bg-surface-container text-on-surface font-mono text-xs transition-colors cursor-pointer"
            title="LaTeX Math Block $$"
          >
            $$
          </button>

          {/* Blue Block: Code Block */}
          <button
            onClick={() => handleFormatInsert('```typescript\n// Code snippet\nconsole.log("Hello, Neural Genesis");\n', '\n```')}
            className="px-2.5 py-1 rounded bg-[#eff6ff] dark:bg-blue-500/15 border border-[#bfdbfe] dark:border-blue-500/35 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/25 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5 font-semibold"
            title="Add Blue Code Block (<>)"
          >
            <span className="material-symbols-outlined text-[15px] text-blue-600 dark:text-blue-400">code</span>
            <span>Code Block</span>
          </button>

          {/* Pink Block: Add Notes */}
          <button
            onClick={() => handleFormatInsert('> [!note] Key Research Synthesis\n> Enter note details here...\n', '')}
            className="px-2.5 py-1 rounded bg-[#fdf2f8] dark:bg-pink-500/15 border border-[#fbcfe8] dark:border-pink-500/35 text-pink-600 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-500/25 text-xs transition-colors cursor-pointer flex items-center gap-1.5 font-semibold"
            title="Add Pink Notes Block"
          >
            <span className="material-symbols-outlined text-[15px] text-pink-600 dark:text-pink-400">chat</span>
            <span>Add Notes</span>
          </button>
        </div>

        {/* Right side: Font Size Controls */}
        <div className="flex items-center gap-1 bg-surface-container/60 px-2 py-0.5 rounded-lg border border-[#c3c6d7]/30">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">format_size</span>
          <button
            onClick={() => {
              const next = Math.max(11, editorFontSize - 1)
              setEditorFontSize(next)
              localStorage.setItem('ng_editor_font_size', next.toString())
            }}
            title="Decrease font size"
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container text-on-surface font-bold text-xs transition-colors cursor-pointer"
          >
            -
          </button>
          <span className="font-mono text-xs font-semibold text-primary px-1 select-none min-w-[28px] text-center">
            {editorFontSize}px
          </span>
          <button
            onClick={() => {
              const next = Math.min(26, editorFontSize + 1)
              setEditorFontSize(next)
              localStorage.setItem('ng_editor_font_size', next.toString())
            }}
            title="Increase font size"
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container text-on-surface font-bold text-xs transition-colors cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      {/* Center CodeMirror 6 Container */}
      <div className="flex-1 overflow-hidden relative" ref={editorRef} />

      {/* Layer 3: Link Type Switcher & Hotkey Modal (Cmd/Ctrl + Shift + L) */}
      {selectionPopup && (
        <div
          className="fixed bg-[#13161B] border border-emerald-500/40 rounded-lg shadow-2xl p-1.5 z-50 flex items-center gap-1 text-xs select-none"
          style={{ top: selectionPopup.y, left: Math.max(16, selectionPopup.x - 120) }}
        >
          <div className="flex items-center gap-1 px-2 text-[10px] text-slate-400 border-r border-[#22262E]">
            <Link2 size={12} className="text-emerald-400" />
            <span>{selectionPopup.isExistingLink ? 'Change Link To:' : 'Link As:'}</span>
          </div>
          {[
            { type: 'front', label: '↔ Front' },
            { type: 'back', label: '→ Back' },
            { type: 'loop', label: '↺ Loop' },
            { type: 'spider', label: '🕸 Spider' },
            { type: 'to', label: '⇥ To' },
            { type: 'shift', label: '⤹ Shift' }
          ].map((opt) => (
            <button
              key={opt.type}
              onClick={() => handleConvertSelection(opt.type as any)}
              className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                selectionPopup.currentType === opt.type
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40'
                  : 'hover:bg-[#1A1E24] text-slate-200 hover:text-emerald-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setSelectionPopup(null)}
            className="text-slate-500 hover:text-slate-300 p-1 ml-1"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
