import fs from 'fs'
import path from 'path'
import { VaultDatabase } from './vault-db'
import { McpStateManager } from '../mcp-state-manager'
import { McpMissionBundle } from '../types'
import { vaultCrypto } from '../vault-crypto'

export class ContextCompiler {
  private vaultPath: string
  private db: VaultDatabase
  private stateManager: McpStateManager

  constructor(vaultPath: string, db: VaultDatabase, stateManager: McpStateManager) {
    this.vaultPath = vaultPath
    this.db = db
    this.stateManager = stateManager
  }

  public compileMissionBundle(): McpMissionBundle {
    const state = this.stateManager.getState()
    let totalTokens = 0

    // 1. Compile Locked Constitution (00-constitution/instructions.md)
    let constitutionText = ''
    for (const lockedFileId of state.lockedFiles) {
      const fullPath = path.join(this.vaultPath, lockedFileId)
      if (fs.existsSync(fullPath)) {
        const raw = fs.readFileSync(fullPath, 'utf-8')
        const decrypted = vaultCrypto.decryptText(raw)
        constitutionText += `\n<!-- === CONSTITUTION: ${lockedFileId} === -->\n` + decrypted + '\n'
      }
    }
    totalTokens += Math.ceil(constitutionText.length / 4)

    // 2. Compile Mounted Specs & Transcluded Blocks (1-hop ![[...]])
    const mountedSpecs: McpMissionBundle['mountedSpecs'] = []
    const allAutoLinkedFiles = new Set<string>()

    for (const specFileId of state.mountedFiles) {
      const fullPath = path.join(this.vaultPath, specFileId)
      if (!fs.existsSync(fullPath)) continue

      const raw = fs.readFileSync(fullPath, 'utf-8')
      let rawContent = vaultCrypto.decryptText(raw)

      // Resolve Transcluded Blocks: ![[filename#^block-id]] or ![[filename#heading]]
      const transcludeRegex = /!\[\[([^\]]+)\]\]/g
      const resolvedContent = rawContent.replace(transcludeRegex, (match, target) => {
        let cleanTarget = target.trim()
        // Strip prefixes if transcluded
        cleanTarget = cleanTarget.replace(/^(front|<->|peer|loop|cycle|spider|mesh|to|opt|shift|deprecated):/i, '')

        let targetFile = cleanTarget
        let targetSubpath = ''
        if (cleanTarget.includes('#')) {
          const parts = cleanTarget.split('#')
          targetFile = parts[0]
          targetSubpath = '#' + parts.slice(1).join('#')
        }
        if (!targetFile.endsWith('.md')) targetFile += '.md'

        allAutoLinkedFiles.add(targetFile)

        const fullBlockKey = `${targetFile}${targetSubpath}`
        const block = this.db.getBlock(fullBlockKey)
        if (block && block.rawMarkdown) {
          return `\n> [!transclusion] Embedded from [[${fullBlockKey}]]\n> ${block.rawMarkdown.replace(/\n/g, '\n> ')}\n`
        }

        const targetFullPath = path.join(this.vaultPath, targetFile)
        if (fs.existsSync(targetFullPath)) {
          const raw = fs.readFileSync(targetFullPath, 'utf-8')
          const content = vaultCrypto.decryptText(raw)
          return `\n> [!transclusion] Embedded whole note [[${targetFile}]]\n> ${content.replace(/\n/g, '\n> ')}\n`
        }

        return match
      })

      const title = specFileId.split('/').pop()?.replace(/\.md$/, '') || specFileId
      mountedSpecs.push({
        id: specFileId,
        title,
        resolvedContent,
        targetRepo: state.targetRepoPath
      })

      totalTokens += Math.ceil(resolvedContent.length / 4)
    }

    // 3. Process Edge Semantics across Mounted Specs
    const coMountedPeers: McpMissionBundle['coMountedPeers'] = []
    const antiPatterns: McpMissionBundle['antiPatterns'] = []
    const cyclicLoops: McpMissionBundle['cyclicLoops'] = []
    const meshClusters: McpMissionBundle['meshClusters'] = []
    const weakHooks: McpMissionBundle['weakHooks'] = []

    const forwardLinks: McpMissionBundle['connectedGraph']['forwardLinks'] = []
    const backlinks: McpMissionBundle['connectedGraph']['backlinks'] = []

    for (const spec of mountedSpecs) {
      const outLinks = this.db.getFileOutgoingLinks(spec.id)
      for (const link of outLinks) {
        forwardLinks.push({
          from: spec.id,
          to: link.targetFileId,
          type: link.edgeType,
          title: `${link.edgeType.toUpperCase()} link to ${link.targetFileId}`
        })

        // Edge Semantic 1: Front Link (Co-mounting peer)
        if (link.edgeType === 'front') {
          const peerPath = path.join(this.vaultPath, link.targetFileId)
          if (fs.existsSync(peerPath)) {
            const raw = fs.readFileSync(peerPath, 'utf-8')
            const peerContent = vaultCrypto.decryptText(raw)
            coMountedPeers.push({
              id: link.targetFileId,
              title: link.targetFileId.replace(/\.md$/, ''),
              content: peerContent,
              reason: `Co-mounted as bidirectional peer of ${spec.id}. Any edit in ${spec.id} requires checking and updating ${link.targetFileId}.`
            })
            totalTokens += Math.ceil(peerContent.length / 4)
          }
        }

        // Edge Semantic 3: Loop Link (Deadlock / Infinite Loop Guard)
        if (link.edgeType === 'loop') {
          cyclicLoops.push({
            cycle: [spec.id, link.targetFileId, spec.id],
            directive: `Event cycle detected between ${spec.id} and ${link.targetFileId}. You must enforce terminating exit conditions or idempotency keys to prevent infinite execution.`
          })
        }

        // Edge Semantic 4: Spider Link (Mesh Cluster Blast Radius)
        if (link.edgeType === 'spider') {
          meshClusters.push({
            clusterName: `${spec.id} ↔ ${link.targetFileId} mesh`,
            members: [spec.id, link.targetFileId],
            blastRadiusWarning: `Spider Mesh detected. Mutating ${spec.id} ripples across ${link.targetFileId}. Execute integration test suite across the entire mesh.`
          })
        }

        // Edge Semantic 5: To Link (Weak / Optional Hook)
        if (link.edgeType === 'to') {
          weakHooks.push({
            plugId: link.targetFileId,
            directive: `${link.targetFileId} is a weak/future hook. Expose an extension point, callback, or interface plug, but DO NOT fully implement or bloat context.`
          })
        }

        // Edge Semantic 6: Shift Link (Anti-Pattern / Tombstone Guard)
        if (link.edgeType === 'shift') {
          antiPatterns.push({
            deprecatedId: link.targetFileId,
            warning: `ANTI-PATTERN GUARD: DO NOT USE or import ${link.targetFileId}. This pattern is tombstoned/deprecated. Follow the modern replacement path specified in the active spec.`
          })
        }
      }

      // Reverse Backlinks
      const incoming = this.db.getFileBacklinks(spec.id)
      for (const inc of incoming) {
        backlinks.push({
          specId: spec.id,
          affectedBy: inc.sourceFileId,
          type: inc.edgeType,
          blastRadiusNotice: `Warning: ${inc.sourceFileId} references this spec via [${inc.edgeType.toUpperCase()}]. Modifications here may alter its dependencies.`
        })
      }
    }

    // 4. Compile Acceptance Criteria
    const allCriteria = this.db.getAllCriteria()
    const activeCriteria = allCriteria.filter((crit) => state.mountedFiles.includes(crit.fileId))

    return {
      constitution: constitutionText,
      mountedSpecs,
      coMountedPeers,
      antiPatterns,
      cyclicLoops,
      meshClusters,
      weakHooks,
      connectedGraph: {
        forwardLinks,
        backlinks
      },
      acceptanceCriteria: activeCriteria.map((c) => ({
        criterionId: c.id,
        fileId: c.fileId,
        description: c.description,
        verifyCmd: c.verifyCmd,
        checked: c.checked
      })),
      totalTokens,
      tokenBudget: 8000
    }
  }

  public getAutoLinkedFiles(): string[] {
    const state = this.stateManager.getState()
    const autoLinked = new Set<string>()

    for (const specFileId of state.mountedFiles) {
      const embeds = this.db.getFileEmbeds(specFileId)
      for (const e of embeds) {
        autoLinked.add(e.targetFileId)
      }
      const outgoing = this.db.getFileOutgoingLinks(specFileId)
      for (const o of outgoing) {
        if (o.edgeType === 'front' || o.edgeType === 'loop' || o.edgeType === 'spider') {
          autoLinked.add(o.targetFileId)
        }
      }
    }
    return Array.from(autoLinked)
  }
}
