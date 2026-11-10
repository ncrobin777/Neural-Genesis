export type EdgeSemantics = 'front' | 'back' | 'loop' | 'spider' | 'to' | 'shift'

export interface VaultFile {
  id: string              // relative path: e.g. "02-specs/checkout.md"
  title: string
  content: string
  cleanMarkdown: string
  tokenCount: number
  isLocked: boolean
  isMounted: boolean
  isAutoLinked: boolean
  frontmatter: Record<string, any>
  updatedAt: number
}

export interface CriterionItem {
  id: string              // crit_hash
  fileId: string
  lineNumber: number
  description: string
  verifyCmd?: string
  checked: boolean
}

export interface BlockItem {
  blockKey: string        // "01-architecture/db-schema.md#^orders-table"
  fileId: string
  blockType: 'heading' | 'block_id'
  rawMarkdown: string
  startLine: number
  endLine: number
  tokenCount: number
}

export interface LinkEdge {
  sourceFileId: string
  targetFileId: string
  targetSubpath?: string
  isEmbed: boolean        // true for ![[...]], false for [[...]]
  edgeType: EdgeSemantics // 'front' | 'back' | 'loop' | 'spider' | 'to' | 'shift'
  alias?: string
}

export interface McpMissionBundle {
  constitution: string
  mountedSpecs: Array<{
    id: string
    title: string
    resolvedContent: string
    targetRepo?: string
  }>
  coMountedPeers: Array<{
    id: string
    title: string
    content: string
    reason: string
  }>
  antiPatterns: Array<{
    deprecatedId: string
    warning: string
  }>
  cyclicLoops: Array<{
    cycle: string[]
    directive: string
  }>
  meshClusters: Array<{
    clusterName: string
    members: string[]
    blastRadiusWarning: string
  }>
  weakHooks: Array<{
    plugId: string
    directive: string
  }>
  connectedGraph: {
    forwardLinks: Array<{ from: string; to: string; type: EdgeSemantics; title: string }>
    backlinks: Array<{ specId: string; affectedBy: string; type: EdgeSemantics; blastRadiusNotice: string }>
  }
  acceptanceCriteria: Array<{
    criterionId: string
    fileId: string
    description: string
    verifyCmd?: string
    checked: boolean
  }>
  totalTokens: number
  tokenBudget: number
}

export interface VaultState {
  currentVaultPath: string
  lockedFiles: string[]
  mountedFiles: string[]
  targetRepoPath: string
  mcpPort: number
}
