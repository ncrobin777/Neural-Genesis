import React, { useEffect, useRef, useState } from 'react'
import { useVaultStore } from '../../store/useVaultStore'
import { useThemeStore, THEMES } from '../../store/useThemeStore'
import {
  Network,
  X,
  Check,
  Sliders,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Link2,
  ArrowRight
} from 'lucide-react'

export type EdgeType = 'front' | 'back' | 'loop' | 'spider' | 'to' | 'shift'

interface NodeItem {
  id: string
  title: string
  x: number
  y: number
  vx: number
  vy: number
  color: string
  isLocked: boolean
  isMounted: boolean
  isAutoLinked: boolean
  tokenCount: number
}

interface EdgeItem {
  source: string
  target: string
  type: EdgeType
  alias?: string
}

const EDGE_COLORS: Record<EdgeType, string> = {
  front: '#10B981', // Emerald (Bold Two-Way)
  back: '#64748B',  // Slate (One-Way)
  loop: '#F59E0B',  // Amber (Cyclic Circuit)
  spider: '#8B5CF6',// Purple (Mesh Cluster)
  to: '#06B6D4',    // Cyan (Dotted Hook)
  shift: '#EF4444'  // Crimson Red (Deprecated Anti-Pattern)
}

export const GraphView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { files, openFile, toggleMount, updateFileContent } = useVaultStore()
  const { currentTheme } = useThemeStore()

  // Google Stitch Interactive HUD & Physics Controls
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isControlsOpen, setIsControlsOpen] = useState(false)
  const [centerGravity, setCenterGravity] = useState(0.65)
  const [nodeRepel, setNodeRepel] = useState(280)
  const [linkLength, setLinkLength] = useState(120)
  const [glowIntensity, setGlowIntensity] = useState(0.85)
  const [searchQuery, setSearchQuery] = useState('')
  const [zoomLevel, setZoomLevel] = useState(1.0)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    edge: EdgeItem
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800)
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600)

    // Build Nodes with stable initial layout
    const nodes: NodeItem[] = files.map((f, i) => {
      let color = '#475569'
      if (f.isLocked) color = '#f59e0b'
      else if (f.isMounted) color = '#10b981'
      else if (f.isAutoLinked) color = '#0ea5e9'

      const angle = (i / Math.max(1, files.length)) * 2 * Math.PI
      const radius = 160 + (i % 2) * 50

      return {
        id: f.id,
        title: f.title.replace(/\.md$/, ''),
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        color,
        isLocked: f.isLocked,
        isMounted: f.isMounted,
        isAutoLinked: f.isAutoLinked,
        tokenCount: f.tokenCount
      }
    })

    // Robust edge extraction across all link formats
    const edges: EdgeItem[] = []
    for (const f of files) {
      const linkRegex = /\[\[([^\]]+)\]\]/g
      let match: RegExpExecArray | null
      while ((match = linkRegex.exec(f.content)) !== null) {
        let raw = match[1].trim()
        let alias: string | undefined = undefined
        if (raw.includes('|')) {
          const parts = raw.split('|')
          raw = parts[0].trim()
          alias = parts.slice(1).join('|').trim()
        }

        let type: EdgeType = 'back'
        const prefixMatch = raw.match(/^(front|<->|peer|loop|cycle|spider|mesh|to|opt|shift|deprecated):/i)
        if (prefixMatch) {
          const p = prefixMatch[1].toLowerCase()
          if (['front', '<->', 'peer'].includes(p)) type = 'front'
          else if (['loop', 'cycle'].includes(p)) type = 'loop'
          else if (['spider', 'mesh'].includes(p)) type = 'spider'
          else if (['to', 'opt'].includes(p)) type = 'to'
          else if (['shift', 'deprecated'].includes(p)) type = 'shift'
          raw = raw.slice(prefixMatch[0].length).trim()
        }

        const cleanTarget = raw.split('#')[0].replace(/\.md$/, '').toLowerCase()
        const target = files.find((targetFile) => {
          const idClean = targetFile.id.replace(/\.md$/, '').toLowerCase()
          const titleClean = targetFile.title.toLowerCase()
          return (
            idClean === cleanTarget ||
            idClean.endsWith('/' + cleanTarget) ||
            cleanTarget.endsWith('/' + idClean) ||
            titleClean === cleanTarget
          )
        })

        if (target && target.id !== f.id) {
          edges.push({ source: f.id, target: target.id, type, alias })
        }
      }
    }

    let animId: number
    const activeTheme = THEMES[currentTheme] || THEMES.carbon
    let draggedNode: NodeItem | null = null

    const render = () => {
      ctx.fillStyle = activeTheme.colors.graphBg
      ctx.fillRect(0, 0, width, height)

      // Background subtle grid
      ctx.strokeStyle = activeTheme.colors.graphGrid
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Draw Edges with Semantics
      for (const edge of edges) {
        const s = nodes.find((n) => n.id === edge.source)
        const t = nodes.find((n) => n.id === edge.target)
        if (!s || !t) continue

        const edgeColor = EDGE_COLORS[edge.type] || (activeTheme.isLight ? '#94a3b8' : '#64748B')
        ctx.strokeStyle = edgeColor
        ctx.lineWidth = edge.type === 'front' ? 2 : edge.type === 'spider' ? 2 : 1.5

        if (edge.type === 'to') {
          ctx.setLineDash([4, 4])
        } else if (edge.type === 'shift') {
          ctx.setLineDash([5, 3])
        } else {
          ctx.setLineDash([])
        }

        ctx.beginPath()
        if (edge.type === 'loop') {
          const midX = (s.x + t.x) / 2 - 25
          const midY = (s.y + t.y) / 2 - 25
          ctx.moveTo(s.x, s.y)
          ctx.quadraticCurveTo(midX, midY, t.x, t.y)
        } else {
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(t.x, t.y)
        }
        ctx.stroke()
        ctx.setLineDash([])

        // Directional junction dot
        const midPointX = (s.x + t.x) / 2
        const midPointY = (s.y + t.y) / 2
        ctx.fillStyle = edgeColor
        ctx.beginPath()
        ctx.arc(midPointX, midPointY, 3, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Draw Nodes (Stable, Non-Drifting)
      for (const node of nodes) {
        // High-contrast Theme-aware node colors
        let fillColor = node.color
        if (activeTheme.isLight && node.color === '#64748B') {
          fillColor = '#3b82f6' // Vibrant sapphire for normal notes in light theme
        }

        // Soft outer halo ring
        ctx.beginPath()
        ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI)
        ctx.fillStyle = activeTheme.isLight ? `${fillColor}25` : `${fillColor}20`
        ctx.fill()

        // Core Solid Node
        ctx.beginPath()
        ctx.arc(node.x, node.y, 7, 0, 2 * Math.PI)
        ctx.fillStyle = fillColor
        ctx.shadowColor = fillColor
        ctx.shadowBlur = 6
        ctx.fill()
        ctx.shadowBlur = 0

        // Clean typography label with contrast
        ctx.fillStyle = activeTheme.colors.textPrimary
        ctx.font = '600 11px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(node.title, node.x, node.y + 20)
      }

      animId = requestAnimationFrame(render)
    }

    render()

    // Drag & Click interactions (No endless floating or bouncing)
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      for (const node of nodes) {
        if (Math.hypot(node.x - clickX, node.y - clickY) <= 20) {
          draggedNode = node
          setSelectedNodeId(node.id)
          break
        }
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedNode) return
      const rect = canvas.getBoundingClientRect()
      draggedNode.x = Math.max(30, Math.min(width - 30, e.clientX - rect.left))
      draggedNode.y = Math.max(30, Math.min(height - 30, e.clientY - rect.top))
    }

    const handleMouseUp = () => {
      draggedNode = null
    }

    // Handle Left Click
    const handleClick = (e: MouseEvent) => {
      setContextMenu(null)
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      for (const node of nodes) {
        if (Math.hypot(node.x - clickX, node.y - clickY) <= 20) {
          setSelectedNodeId(node.id)
          break
        }
      }
    }

    // Handle Right Click on Edge
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      for (const edge of edges) {
        const s = nodes.find((n) => n.id === edge.source)
        const t = nodes.find((n) => n.id === edge.target)
        if (!s || !t) continue

        const midX = (s.x + t.x) / 2
        const midY = (s.y + t.y) / 2
        if (Math.hypot(midX - clickX, midY - clickY) < 18) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            edge
          })
          return
        }
      }
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('contextmenu', handleContextMenu)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [files, currentTheme])

  // Convert Edge handler
  const handleConvertEdge = (targetType: EdgeType) => {
    if (!contextMenu) return
    const { edge } = contextMenu
    const sourceFile = files.find((f) => f.id === edge.source)
    if (!sourceFile) return

    const targetBase = edge.target.split('/').pop()?.replace(/\.md$/, '') || edge.target
    const oldRegex = new RegExp(`\\[\\[(?:[a-zA-Z<>:-]*:)?(?:[^\\]]*\/)?${targetBase}(?:#[^\\]]+)?(?:\\|[^\\]]+)?\\]\\]`, 'gi')
    const prefix = targetType === 'back' ? '' : `${targetType}:`
    const newLink = `[[${prefix}${edge.target.replace(/\.md$/, '')}]]`

    const updatedContent = sourceFile.content.replace(oldRegex, newLink)
    updateFileContent(sourceFile.id, updatedContent)
    setContextMenu(null)
  }

  const selectedNode = files.find((f) => f.id === selectedNodeId)

  return (
    <div className="flex-1 h-full relative bg-surface-container-lowest flex flex-col select-none overflow-hidden">
      {/* Graph Toolbar with 6 Edge Semantics Legend */}
      <div className="h-10 bg-surface-container-lowest border-b border-[#c3c6d7]/30 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <Network size={16} className="text-primary" />
          <span className="text-xs font-semibold text-on-surface">
            Interactive Knowledge Graph
          </span>
          <span className="text-[11px] text-on-surface-variant font-mono">
            {files.length} Nodes Indexed · Interactive
          </span>
        </div>

        {/* Semantic Edge Legend & Toolbar Controls */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container border border-[#c3c6d7]/30">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold">
              <span>↔</span> Peer
            </span>
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-semibold">
              <span>→</span> Dependency
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-semibold">
              <span>↺</span> Loop
            </span>
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-semibold">
              <span>🕸</span> Spider
            </span>
            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-mono text-[10px] font-semibold">
              <span>⇥</span> To
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-semibold">
              <span>⤹</span> Shift
            </span>
          </div>

          <button
            onClick={() => setIsControlsOpen(!isControlsOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isControlsOpen
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-surface-container-low border-[#c3c6d7]/40 text-on-surface hover:bg-surface-container'
            }`}
          >
            <Sliders size={13} />
            <span>Physics Controls</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {/* Canvas */}
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

        {/* Top-Left Quick Info Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container/90 backdrop-blur-md border border-[#c3c6d7]/30 shadow-md text-on-surface">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-xs text-on-surface">Global Knowledge Mesh</span>
            <span className="text-[11px] text-on-surface-variant font-mono">
              {files.length} notes active
            </span>
          </div>
        </div>

        {/* Right-Side Graph Physics Control Panel */}
        {isControlsOpen && (
          <div className="absolute top-4 right-4 z-30 w-80 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-xl border border-[#c3c6d7]/35 shadow-2xl p-4 flex flex-col gap-3.5 text-xs text-on-surface">
            <div className="flex items-center justify-between pb-2 border-b border-[#c3c6d7]/30">
              <div className="flex items-center gap-2 font-bold text-sm text-on-surface">
                <Sliders size={15} className="text-primary" />
                <span>Force Directed Physics</span>
              </div>
              <button
                onClick={() => {
                  setCenterGravity(0.65)
                  setNodeRepel(280)
                  setLinkLength(120)
                  setGlowIntensity(0.85)
                }}
                title="Reset Parameters"
                className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            {/* Slider 1: Center Gravity */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-on-surface-variant font-medium">Center Gravity</span>
                <span className="font-mono text-primary font-semibold">{centerGravity}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={centerGravity}
                onChange={(e) => setCenterGravity(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-surface-container rounded cursor-pointer"
              />
            </div>

            {/* Slider 2: Node Repel Strength */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-on-surface-variant font-medium">Repel Strength</span>
                <span className="font-mono text-primary font-semibold">-{nodeRepel}</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={nodeRepel}
                onChange={(e) => setNodeRepel(parseInt(e.target.value))}
                className="w-full accent-primary h-1.5 bg-surface-container rounded cursor-pointer"
              />
            </div>

            {/* Slider 3: Link Distance */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-on-surface-variant font-medium">Link Length</span>
                <span className="font-mono text-secondary font-semibold">{linkLength}px</span>
              </div>
              <input
                type="range"
                min="40"
                max="250"
                step="5"
                value={linkLength}
                onChange={(e) => setLinkLength(parseInt(e.target.value))}
                className="w-full accent-secondary h-1.5 bg-surface-container rounded cursor-pointer"
              />
            </div>

            {/* Slider 4: Aura Glow */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-on-surface-variant font-medium">Aura Glow Intensity</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{Math.round(glowIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={glowIntensity}
                onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-surface-container rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Selected Node Contextual Inspector Card */}
        {selectedNode && (
          <div className="absolute bottom-6 left-6 z-30 w-84 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-xl border border-[#c3c6d7]/35 shadow-2xl p-4 flex flex-col gap-3">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-primary to-secondary rounded-full" />
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                  {selectedNode.isLocked ? 'Constitution' : selectedNode.isMounted ? 'Mounted Spec' : 'Vault Note'}
                </span>
                <h3 className="font-bold text-sm text-on-surface mt-0.5">{selectedNode.title}.md</h3>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface font-mono text-[11px] border border-[#c3c6d7]/30">
                {selectedNode.tokenCount} tokens
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                selectedNode.isMounted
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-surface-container text-on-surface-variant'
              }`}>
                {selectedNode.isMounted ? '🟢 Mounted' : 'Unmounted'}
              </span>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={() => {
                  toggleMount(selectedNode.id)
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-[#c3c6d7]/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Toggle Mount
              </button>
              <button
                onClick={() => {
                  openFile(selectedNode.id)
                  onClose()
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <span>Open Note</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Right-Click Edge Conversion Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-surface-container-lowest border border-[#c3c6d7]/40 rounded-xl shadow-2xl py-1.5 z-50 w-60 text-xs font-mono"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-on-surface-variant border-b border-[#c3c6d7]/30">
              Convert Edge Type
            </div>
            {[
              { type: 'front', label: '↔ Front (Bidirectional Peer)' },
              { type: 'back', label: '→ Back (One-Way Dependency)' },
              { type: 'loop', label: '↺ Loop (Cyclic Flow)' },
              { type: 'spider', label: '🕸 Spider (Mesh Cluster)' },
              { type: 'to', label: '⇥ To (Optional / Future Hook)' },
              { type: 'shift', label: '⤹ Shift (Tombstoned / Deprecated)' }
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => handleConvertEdge(item.type as EdgeType)}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-surface-container transition-colors cursor-pointer ${
                  contextMenu.edge.type === item.type ? 'text-primary font-bold bg-primary/10' : 'text-on-surface'
                }`}
              >
                <span>{item.label}</span>
                {contextMenu.edge.type === item.type && <Check size={13} className="text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

