import React, { useEffect } from 'react'
import {
  Cpu,
  CheckCircle2,
  Circle,
  Eye,
  Play,
  AlertTriangle,
  RotateCcw
} from 'lucide-react'
import { useMcpStore } from '../../store/useMcpStore'
import confetti from 'canvas-confetti'

export const McpPayloadDock: React.FC = () => {
  const {
    mission,
    fetchMission,
    verifyCriterion,
    isVerifying,
    isJsonModalOpen,
    setJsonModalOpen
  } = useMcpStore()

  useEffect(() => {
    fetchMission()
    const interval = setInterval(() => {
      fetchMission()
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const totalTokens = mission?.totalTokens || 0
  const maxTokens = mission?.tokenBudget || 8000
  const tokenPercent = Math.min(100, Math.round((totalTokens / maxTokens) * 100))

  const handleVerify = async (criterionId: string) => {
    const res = await verifyCriterion(criterionId)
    if (res.success) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 }
      })
    }
  }

  const handleRunAgentMission = async () => {
    if (window.genesis) {
      await window.genesis.runPtyCommand(
        `echo ">>> DISPATCHING NEURAL GENESIS MISSION TO CLAUDE CODE / AGY AGENT..." && curl -s http://localhost:43110/mcp`
      )
    }
  }

  return (
    <div className="w-[300px] bg-[#13161B] border-l border-[#22262E] flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3 border-b border-[#22262E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-emerald-400" />
          <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
            MCP Payload Dock
          </span>
        </div>
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE :43110
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 1. Live Token Budget Meter */}
        <div className="bg-[#1A1E24] p-3 rounded-lg border border-[#22262E]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400">Context Window</span>
            <span className="font-mono text-emerald-400 font-medium">
              {totalTokens.toLocaleString()} / {maxTokens.toLocaleString()} t
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full bg-[#13161B] h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-400 h-full transition-all duration-300 shadow-sm shadow-emerald-400"
              style={{ width: `${tokenPercent}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Locked: 580t</span>
            <span>Mounted: {Math.max(0, totalTokens - 580)}t</span>
            <span>Budget: {tokenPercent}%</span>
          </div>
        </div>

        {/* 2. Primary CTA: RUN AGENT MISSION */}
        <button
          onClick={handleRunAgentMission}
          className="w-full py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0D0F12] font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all active:scale-[0.99]"
        >
          <Play size={13} fill="#0D0F12" />
          <span>RUN AGENT MISSION</span>
        </button>

        {/* 3. Acceptance Criteria Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Live Acceptance Criteria
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {mission?.acceptanceCriteria.filter((c) => c.checked).length || 0} /{' '}
              {mission?.acceptanceCriteria.length || 0}
            </span>
          </div>

          <div className="space-y-2">
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
                      onClick={() => handleVerify(crit.criterionId)}
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
              <div className="text-center py-4 text-xs text-slate-500">
                No active criteria in mounted specs.
              </div>
            )}
          </div>
        </div>

        {/* 4. Blast Radius / Backlink Warnings */}
        {mission?.connectedGraph.backlinks && mission.connectedGraph.backlinks.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
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

        {/* 5. Peek Raw JSON Button */}
        <button
          onClick={() => setJsonModalOpen(true)}
          className="w-full py-2 px-3 rounded-lg bg-[#1A1E24] hover:bg-[#22262E] text-slate-300 border border-[#22262E] text-xs font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Eye size={13} className="text-slate-400" />
          <span>Peek Raw MCP JSON</span>
        </button>
      </div>

      {/* Raw MCP JSON Modal */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-8">
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
