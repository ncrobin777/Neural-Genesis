import crypto from 'crypto'
import { BlockItem, LinkEdge, CriterionItem, EdgeSemantics } from '../types'

export interface ParsedMarkdownFile {
  title: string
  cleanMarkdown: string
  frontmatter: Record<string, any>
  contentHash: string
  tokenCount: number
  blocks: BlockItem[]
  links: LinkEdge[]
  criteria: CriterionItem[]
}

export function parseMarkdown(fileId: string, content: string): ParsedMarkdownFile {
  const contentHash = crypto.createHash('sha256').update(content).digest('hex')
  const lines = content.split(/\r?\n/)

  // 1. Extract Frontmatter if present
  let frontmatter: Record<string, any> = {}
  let contentStartIndex = 0

  if (lines[0] && lines[0].trim() === '---') {
    const endIdx = lines.slice(1).findIndex((line) => line.trim() === '---')
    if (endIdx !== -1) {
      const rawFm = lines.slice(1, endIdx + 1).join('\n')
      frontmatter = parseSimpleYaml(rawFm)
      contentStartIndex = endIdx + 2
    }
  }

  // 2. Identify Title
  let title = fileId.split('/').pop()?.replace(/\.md$/, '') || fileId
  for (let i = contentStartIndex; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+)$/)
    if (m) {
      title = m[1].trim()
      break
    }
  }

  // 3. Process MCP Ignore & Gutter zones
  const cleanLines: string[] = []
  let isIgnoring = false
  let underIgnoredHeading = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.includes('<!-- mcp:ignore -->')) {
      isIgnoring = true
      continue
    }
    if (line.includes('<!-- /mcp:ignore -->') || line.includes('-->')) {
      if (isIgnoring) {
        isIgnoring = false
        continue
      }
    }

    if (/^##\s+(Scratchpad|Brainstorm|Rough Notes)/i.test(line)) {
      underIgnoredHeading = true
    } else if (/^##?\s+/.test(line) && underIgnoredHeading) {
      underIgnoredHeading = false
    }

    if (!isIgnoring && !underIgnoredHeading) {
      cleanLines.push(line)
    }
  }

  const cleanMarkdown = cleanLines.join('\n')
  const tokenCount = Math.ceil(cleanMarkdown.length / 4)

  // 4. Extract Blocks (^block-id and # Headings)
  const blocks: BlockItem[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const blockMatch = line.match(/\^([a-zA-Z0-9_-]+)\s*$/)
    if (blockMatch) {
      const blockId = blockMatch[1]
      const raw = line.replace(/\^([a-zA-Z0-9_-]+)\s*$/, '').trim()
      blocks.push({
        blockKey: `${fileId}#^${blockId}`,
        fileId,
        blockType: 'block_id',
        rawMarkdown: raw,
        startLine: i + 1,
        endLine: i + 1,
        tokenCount: Math.ceil(raw.length / 4)
      })
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const headingText = headingMatch[2].trim()
      let contentBlock: string[] = [line]
      let endLine = i + 1
      const currentLevel = headingMatch[1].length

      for (let j = i + 1; j < lines.length; j++) {
        const nextH = lines[j].match(/^(#{1,6})\s+/)
        if (nextH && nextH[1].length <= currentLevel) {
          break
        }
        contentBlock.push(lines[j])
        endLine = j + 1
      }

      const raw = contentBlock.join('\n')
      blocks.push({
        blockKey: `${fileId}#${headingText}`,
        fileId,
        blockType: 'heading',
        rawMarkdown: raw,
        startLine: i + 1,
        endLine,
        tokenCount: Math.ceil(raw.length / 4)
      })
    }
  }

  // 5. Extract Categorized Links with Edge Semantics
  // Supports: [[front:api-contracts]], [[<->:api-contracts]], [[loop:webhook]], [[spider:cluster]],
  // [[to:apple-pay]], [[shift:legacy]], [[db-schema]] (default back link), and ![[...]] embeds
  const links: LinkEdge[] = []
  const linkRegex = /(!)?\[\[([^\]]+)\]\]/g
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(content)) !== null) {
    const isEmbed = Boolean(match[1])
    let rawInner = match[2].trim()

    let alias: string | undefined = undefined
    if (rawInner.includes('|')) {
      const parts = rawInner.split('|')
      rawInner = parts[0].trim()
      alias = parts.slice(1).join('|').trim()
    }

    let edgeType: EdgeSemantics = 'back' // default back link

    // Check for inline prefixes
    const prefixMatch = rawInner.match(/^(front|<->|peer|loop|cycle|spider|mesh|to|opt|shift|deprecated):/i)
    if (prefixMatch) {
      const prefix = prefixMatch[1].toLowerCase()
      if (['front', '<->', 'peer'].includes(prefix)) edgeType = 'front'
      else if (['loop', 'cycle'].includes(prefix)) edgeType = 'loop'
      else if (['spider', 'mesh'].includes(prefix)) edgeType = 'spider'
      else if (['to', 'opt'].includes(prefix)) edgeType = 'to'
      else if (['shift', 'deprecated'].includes(prefix)) edgeType = 'shift'

      rawInner = rawInner.slice(prefixMatch[0].length).trim()
    }

    let targetFile = rawInner
    let targetSubpath: string | undefined = undefined

    if (rawInner.includes('#')) {
      const parts = rawInner.split('#')
      targetFile = parts[0]
      targetSubpath = '#' + parts.slice(1).join('#')
    }

    if (!targetFile.endsWith('.md') && !targetFile.endsWith('.canvas') && targetFile.length > 0) {
      targetFile = targetFile + '.md'
    }

    links.push({
      sourceFileId: fileId,
      targetFileId: targetFile,
      targetSubpath,
      isEmbed,
      edgeType,
      alias
    })
  }

  // Also parse frontmatter connections if present (Option B topology)
  if (frontmatter.connections && typeof frontmatter.connections === 'object') {
    const conn = frontmatter.connections
    const mapType = (arr: any, type: EdgeSemantics) => {
      if (Array.isArray(arr)) {
        for (let item of arr) {
          if (typeof item === 'string') {
            let targetFile = item.trim()
            if (!targetFile.endsWith('.md')) targetFile += '.md'
            links.push({
              sourceFileId: fileId,
              targetFileId: targetFile,
              isEmbed: false,
              edgeType: type
            })
          }
        }
      }
    }
    mapType(conn.peer, 'front')
    mapType(conn.depends_on, 'back')
    mapType(conn.cycles_with, 'loop')
    mapType(conn.mesh_group, 'spider')
    mapType(conn.plugs, 'to')
    mapType(conn.deprecated, 'shift')
  }

  // 6. Extract Acceptance Criteria
  const criteria: CriterionItem[] = []
  let underCriteriaSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^##\s+Acceptance Criteria/i.test(line)) {
      underCriteriaSection = true
      continue
    } else if (/^##?\s+/.test(line) && underCriteriaSection) {
      underCriteriaSection = false
    }

    const checkMatch = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.*)$/)
    if (checkMatch) {
      const checked = checkMatch[2].toLowerCase() === 'x'
      const rest = checkMatch[3].trim()

      let verifyCmd: string | undefined = undefined
      let description = rest

      const cmdMatch = rest.match(/^\[cmd:\s*([^\]]+)\]\s*(.*)$/)
      if (cmdMatch) {
        verifyCmd = cmdMatch[1].trim()
        description = cmdMatch[2].trim() || verifyCmd
      }

      const hash = crypto
        .createHash('sha256')
        .update(`${fileId}:${description.toLowerCase()}`)
        .digest('hex')
        .slice(0, 8)

      criteria.push({
        id: `crit_${hash}`,
        fileId,
        lineNumber: i + 1,
        description,
        verifyCmd,
        checked
      })
    }
  }

  return {
    title,
    cleanMarkdown,
    frontmatter,
    contentHash,
    tokenCount,
    blocks,
    links,
    criteria
  }
}

function parseSimpleYaml(raw: string): Record<string, any> {
  const result: Record<string, any> = {}
  for (const line of raw.split('\n')) {
    const parts = line.split(':')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const val = parts.slice(1).join(':').trim()
      result[key] = val
    }
  }
  return result
}
