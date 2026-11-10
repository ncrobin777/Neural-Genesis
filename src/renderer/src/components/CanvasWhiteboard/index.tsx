import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Move,
  X,
  CheckCircle2,
  Cpu,
  Plus,
  MousePointer,
  Hand,
  Trash2,
  ZoomIn,
  ZoomOut,
  Link2,
  FileCode,
  Layout,
  Database,
  FileText
} from 'lucide-react'
import { useVaultStore } from '../../store/useVaultStore'

export interface CanvasNode {
  id: string
  title: string
  type: 'screen' | 'api' | 'db' | 'spec'
  x: number
  y: number
  width: number
  height: number
  color: string
  content: string
}

export interface CanvasEdge {
  id: string
  fromNode: string
  toNode: string
  type: 'front' | 'back' | 'loop' | 'spider' | 'to' | 'shift'
  label?: string
}

export const CanvasWhiteboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { files } = useVaultStore()

  // Nodes state
  const [nodes, setNodes] = useState<CanvasNode[]>([
    {
      id: 'node-ui',
      title: 'Checkout Screen UI',
      type: 'screen',
      x: 80,
      y: 120,
      width: 220,
      height: 110,
      color: '#10B981',
      content: 'Page component src/pages/Checkout.tsx'
    },
    {
      id: 'node-api',
      title: 'Stripe Webhook API',
      type: 'api',
      x: 390,
      y: 120,
      width: 220,
      height: 110,
      color: '#F59E0B',
      content: 'Contract: POST /api/webhooks/stripe'
    },
    {
      id: 'node-db',
      title: 'Orders SQLite Table',
      type: 'db',
      x: 700,
      y: 120,
      width: 220,
      height: 110,
      color: '#06B6D4',
      content: 'Transcluded: ![[db-schema#^orders-table]]'
    }
  ])

  // Edges state (fully addable & removable)
  const [edges, setEdges] = useState<CanvasEdge[]>([
    {
      id: 'edge-1',
      fromNode: 'node-ui',
      toNode: 'node-api',
      type: 'loop',
      label: '↺ Payment Feedback Loop'
    },
    {
      id: 'edge-2',
      fromNode: 'node-api',
      toNode: 'node-db',
      type: 'front',
      label: '↔ Orders Contract Sync'
    }
  ])

  // Zero-delay Drag state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number } | null>(null)

  // Connection Creation state
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null)

  // Add Custom Item Dialog state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customType, setCustomType] = useState<'screen' | 'api' | 'db' | 'spec'>('spec')
  const [customContent, setCustomContent] = useState('')

  const [executionOutput, setExecutionOutput] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [activeTool, setActiveTool] = useState<'select' | 'pan'>('select')

  // Zero-delay Drag Event Handlers with Global Window Listeners
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    setDraggingNodeId(nodeId)
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeX: node.x,
      nodeY: node.y
    }
  }

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!draggingNodeId || !dragStartRef.current) return
      const dx = (e.clientX - dragStartRef.current.mouseX) / (zoom / 100)
      const dy = (e.clientY - dragStartRef.current.mouseY) / (zoom / 100)

      const targetX = Math.max(10, Math.round(dragStartRef.current.nodeX + dx))
      const targetY = Math.max(10, Math.round(dragStartRef.current.nodeY + dy))

      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: targetX, y: targetY } : n))
      )
    }

    const handleWindowMouseUp = () => {
      setDraggingNodeId(null)
      dragStartRef.current = null
    }

    if (draggingNodeId) {
      window.addEventListener('mousemove', handleWindowMouseMove)
      window.addEventListener('mouseup', handleWindowMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [draggingNodeId, zoom])

  // Delete Node and its attached edges
  const handleDeleteNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes((prev) => prev.filter((n) => n.id !== nodeId))
    setEdges((prev) => prev.filter((edge) => edge.fromNode !== nodeId && edge.toNode !== nodeId))
    if (connectingSourceId === nodeId) setConnectingSourceId(null)
  }

  // Remove connection edge
  const handleRemoveEdge = (edgeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEdges((prev) => prev.filter((edge) => edge.id !== edgeId))
  }

  // Connection Port Click: Start or Complete connection
  const handlePortClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!connectingSourceId) {
      setConnectingSourceId(nodeId)
    } else if (connectingSourceId === nodeId) {
      setConnectingSourceId(null)
    } else {
      // Create new edge
      const edgeExists = edges.some(
        (edge) =>
          (edge.fromNode === connectingSourceId && edge.toNode === nodeId) ||
          (edge.fromNode === nodeId && edge.toNode === connectingSourceId)
      )

      if (!edgeExists) {
        const newEdge: CanvasEdge = {
          id: `edge-${Date.now()}`,
          fromNode: connectingSourceId,
          toNode: nodeId,
          type: 'front',
          label: '↔ Connected Sync'
        }
        setEdges((prev) => [...prev, newEdge])
      }
      setConnectingSourceId(null)
    }
  }

  // Add Custom Node
  const handleCreateCustomNode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTitle.trim()) return

    const colorMap = {
      screen: '#10B981',
      api: '#F59E0B',
      db: '#06B6D4',
      spec: '#8B5CF6'
    }

    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      title: customTitle.trim(),
      type: customType,
      x: 180 + Math.random() * 150,
      y: 160 + Math.random() * 120,
      width: 230,
      height: 110,
      color: colorMap[customType],
      content: customContent.trim() || '[[note]]'
    }

    setNodes((prev) => [...prev, newNode])
    setCustomTitle('')
    setCustomContent('')
    setIsAddModalOpen(false)
  }

  // Quick Card Adder
  const handleQuickAdd = (type: 'screen' | 'api' | 'db') => {
    const titles = {
      screen: 'Screen UI Component',
      api: 'API Endpoint Hook',
      db: 'SQLite State Table'
    }
    const colors = {
      screen: '#10B981',
      api: '#F59E0B',
      db: '#06B6D4'
    }
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      title: titles[type],
      type,
      x: 200 + Math.random() * 180,
      y: 180 + Math.random() * 120,
      width: 220,
      height: 110,
      color: colors[type],
      content: `// Canvas item ${nodes.length + 1}`
    }
    setNodes((prev) => [...prev, newNode])
  }

  // Compile Canvas flowchart to MCP
  const handleCompileToMcp = () => {
    let flowchart = `<!-- === EXECUTABLE FLOWCHART: ARCHITECTURE CANVAS === -->\n`
    flowchart += `## Sequential Execution Pipeline:\n`

    edges.forEach((edge, idx) => {
      const from = nodes.find((n) => n.id === edge.fromNode)
      const to = nodes.find((n) => n.id === edge.toNode)
      if (from && to) {
        flowchart += `Step ${idx + 1}: [${from.title}] ---(${edge.type.toUpperCase()}: ${edge.label || 'connects'})---> [${to.title}]\n`
        flowchart += `  - Input: ${from.content}\n`
        flowchart += `  - Target: ${to.content}\n`
      }
    })

    setExecutionOutput(flowchart)
  }

  return (
    <div
      className="flex-1 h-full relative bg-surface-container-lowest flex flex-col select-none overflow-hidden"
      onClick={() => {
        if (connectingSourceId) setConnectingSourceId(null)
      }}
    >
      {/* Canvas Top Bar */}
      <div className="h-10 bg-surface-container-lowest border-b border-[#c3c6d7]/30 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <Sparkles size={16} className="text-primary" />
          <span className="text-xs font-semibold text-on-surface">
            Executable Spatial Canvas (.canvas)
          </span>
          <span className="text-[11px] text-on-surface-variant font-mono">
            — {nodes.length} Nodes · {edges.length} Connections
          </span>
        </div>

        {/* Top-Right HUD & Actions */}
        <div className="flex items-center gap-2">
          {connectingSourceId && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-semibold animate-pulse">
              Click another node port to connect
            </span>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-lg border border-[#c3c6d7]/30 text-on-surface-variant">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              title="Zoom Out"
              className="hover:text-on-surface cursor-pointer"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-mono text-[11px] px-1 text-on-surface font-semibold">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
              title="Zoom In"
              className="hover:text-on-surface cursor-pointer"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-[#c3c6d7]/40 text-on-surface text-xs font-semibold transition-colors cursor-pointer shadow-sm"
          >
            <Plus size={14} className="text-primary" />
            <span>Add Custom Item</span>
          </button>

          <button
            onClick={handleCompileToMcp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Cpu size={14} />
            <span>Compile Flowchart</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Infinite Canvas Area */}
      <div
        className="flex-1 relative overflow-hidden bg-surface-container-lowest"
        style={{
          backgroundImage: 'radial-gradient(var(--stitch-outline-variant, #c3c6d7) 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* SVG Connectors for Flowchart */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map((edge) => {
            const from = nodes.find((n) => n.id === edge.fromNode)
            const to = nodes.find((n) => n.id === edge.toNode)
            if (!from || !to) return null

            const x1 = from.x + from.width
            const y1 = from.y + from.height / 2
            const x2 = to.x
            const y2 = to.y + to.height / 2

            const strokeColor =
              edge.type === 'front'
                ? '#10b981'
                : edge.type === 'loop'
                ? '#f59e0b'
                : edge.type === 'spider'
                ? '#8b5cf6'
                : '#0284c7'

            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2

            return (
              <g key={edge.id} className="group pointer-events-auto">
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeDasharray={edge.type === 'to' ? '5,5' : 'none'}
                />
                {/* Edge Delete Button */}
                <circle
                  cx={midX}
                  cy={midY}
                  r="7"
                  fill={strokeColor}
                  className="cursor-pointer hover:r-9 transition-all"
                  onClick={(e) => handleRemoveEdge(edge.id, e)}
                />
                <text
                  x={midX}
                  y={midY - 12}
                  textAnchor="middle"
                  className="font-mono text-[10px] fill-current text-on-surface-variant font-semibold select-none"
                >
                  {edge.label || 'Connection (Click dot to remove)'}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Spatial Cards with Instant Zero-Delay Dragging */}
        {nodes.map((node) => {
          const isConnectingSource = connectingSourceId === node.id

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
              style={{
                left: node.x,
                top: node.y,
                width: node.width
              }}
              className={`absolute p-3.5 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-md border shadow-xl select-none cursor-grab active:cursor-grabbing ${
                isConnectingSource
                  ? 'border-primary ring-2 ring-primary/40 shadow-primary/20'
                  : draggingNodeId === node.id
                  ? 'border-primary shadow-2xl scale-[1.02] z-40'
                  : 'border-[#c3c6d7]/35 hover:border-primary/50'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${node.color}20`, color: node.color }}
                >
                  {node.type}
                </span>

                <div className="flex items-center gap-1">
                  {/* Connect port trigger */}
                  <button
                    onClick={(e) => handlePortClick(node.id, e)}
                    title={isConnectingSource ? 'Cancel Connection' : 'Connect to another node'}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      isConnectingSource
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                    }`}
                  >
                    <Link2 size={13} />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteNode(node.id, e)}
                    title="Delete item"
                    className="p-1 rounded text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="font-bold text-xs text-on-surface mb-1.5 truncate">{node.title}</div>

              {/* Content box */}
              <div className="text-[11px] text-on-surface-variant font-mono leading-tight bg-surface-container p-2 rounded-xl border border-[#c3c6d7]/25 truncate">
                {node.content}
              </div>
            </div>
          )
        })}

        {/* Floating Bottom Canvas Toolkit Dock */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-container-lowest/95 backdrop-blur-xl border border-[#c3c6d7]/35 px-3.5 py-2 rounded-2xl shadow-2xl z-30">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeTool === 'select'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            title="Select & Move Tool (V)"
          >
            <MousePointer size={15} />
          </button>
          <button
            onClick={() => setActiveTool('pan')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            title="Pan Hand Tool (H)"
          >
            <Hand size={15} />
          </button>

          <div className="w-px h-5 bg-[#c3c6d7]/40 mx-1" />

          {/* Quick Node Adders */}
          <button
            onClick={() => handleQuickAdd('screen')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors border border-emerald-500/25 cursor-pointer"
            title="Add Screen UI Node"
          >
            <Plus size={13} />
            <span>+ Screen</span>
          </button>
          <button
            onClick={() => handleQuickAdd('api')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors border border-amber-500/25 cursor-pointer"
            title="Add API Endpoint Node"
          >
            <Plus size={13} />
            <span>+ API</span>
          </button>
          <button
            onClick={() => handleQuickAdd('db')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-cyan-600 dark:text-cyan-400 text-xs font-semibold transition-colors border border-cyan-500/25 cursor-pointer"
            title="Add Database Table Node"
          >
            <Plus size={13} />
            <span>+ DB</span>
          </button>
        </div>

        {/* Modal: Add Custom Item of My Own */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateCustomNode}
              className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-[#c3c6d7]/40 shadow-2xl p-5 flex flex-col gap-4 text-on-surface"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#c3c6d7]/30">
                <span className="font-bold text-sm text-on-surface">Add New Canvas Item</span>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Authentication Gateway"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-[#c3c6d7]/30 text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Node Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { type: 'spec', label: 'Spec', icon: FileText, color: 'text-purple-500' },
                    { type: 'screen', label: 'Screen', icon: Layout, color: 'text-emerald-500' },
                    { type: 'api', label: 'API', icon: FileCode, color: 'text-amber-500' },
                    { type: 'db', label: 'Database', icon: Database, color: 'text-cyan-500' }
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.type}
                      onClick={() => setCustomType(t.type as any)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
                        customType === t.type
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-[#c3c6d7]/30 hover:bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <t.icon size={16} className={t.color} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Content / Transclusion Spec
                </label>
                <input
                  type="text"
                  placeholder="e.g. [[auth-service]] or /api/auth/login"
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-[#c3c6d7]/30 text-on-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold shadow-md cursor-pointer"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Compiled Flowchart Output Overlay */}
        {executionOutput && (
          <div className="absolute right-4 bottom-4 w-96 max-h-72 bg-surface-container-lowest border border-primary/40 rounded-2xl shadow-2xl p-4 flex flex-col z-20">
            <div className="flex items-center justify-between pb-2 border-b border-[#c3c6d7]/30 mb-2">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Compiled MCP Flowchart
              </span>
              <button
                onClick={() => setExecutionOutput(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <X size={14} />
              </button>
            </div>
            <pre className="text-[11px] font-mono text-on-surface leading-relaxed overflow-auto flex-1">
              {executionOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

