import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'

export interface EdgeTypeDefinition {
  prefix: string
  label: string
  symbol: string
  detail: string
  color: string
}

export const EDGE_TYPES: EdgeTypeDefinition[] = [
  {
    prefix: 'front:@',
    label: '↔ front: (Bidirectional Peer)',
    symbol: '↔',
    detail: 'Co-mounted context; reciprocal link established in target note',
    color: '#10B981'
  },
  {
    prefix: 'back:@',
    label: '→ back: (Unidirectional Dependency)',
    symbol: '→',
    detail: 'Read-only schema / utility ingestion',
    color: '#64748B'
  },
  {
    prefix: 'loop:@',
    label: '↺ loop: (Cyclic Flow / Webhook)',
    symbol: '↺',
    detail: 'Deadlock guard; requires terminating exit condition',
    color: '#F59E0B'
  },
  {
    prefix: 'spider:@',
    label: '🕸 spider: (Mesh Cluster)',
    symbol: '🕸',
    detail: 'Blast-radius alert; cluster integration tests required',
    color: '#8B5CF6'
  },
  {
    prefix: 'to:@',
    label: '⇥ to: (Optional / Future Hook)',
    symbol: '⇥',
    detail: 'Zero context bloat; stub interface/plug only',
    color: '#06B6D4'
  },
  {
    prefix: 'shift:@',
    label: '⤹ shift: (Tombstoned / Deprecated)',
    symbol: '⤹',
    detail: 'Anti-pattern guard; forbids LLM from hallucinating',
    color: '#EF4444'
  }
]

export interface NoteItemSuggestion {
  id: string
  title: string
}

/**
 * Strict 2-Step Cognitive Connection Flow:
 *
 * Step 1: User types [[ or [[@
 *         -> ONLY the Edge Connection Types are displayed (Front, Back, Loop, Spider, To, Shift).
 *         -> NO notes are shown yet, enforcing that connection semantics are chosen first.
 *         -> Selecting a type inserts e.g. [[front:@
 *
 * Step 2: Once :@ is typed (e.g. [[front:@, [[loop:@, [[spider:@, [[to:@, [[shift:@, [[back:@)
 *         -> The dropdown now displays all connectable vault files to establish that connection!
 */
export function createWikilinkSuggestExtension(
  availableNotes: Array<NoteItemSuggestion>,
  currentFileId?: string,
  onLinkEstablished?: (edgeType: string, targetFileId: string, sourceFileId: string) => void
) {
  return autocompletion({
    activateOnTyping: true,
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const line = context.state.doc.lineAt(context.pos)
        const lineTextBefore = line.text.slice(0, context.pos - line.from)

        const openIdx = lineTextBefore.lastIndexOf('[[')
        if (openIdx === -1) return null

        const closeIdx = lineTextBefore.indexOf(']]', openIdx)
        if (closeIdx !== -1) return null

        const raw = lineTextBefore.slice(openIdx + 2) // Content inside [[
        const replaceFrom = line.from + openIdx // start of [[

        // STEP 2: Only trigger file list if user has typed :@ (e.g. front:@, loop:@, spider:@, etc.)
        if (raw.includes(':@')) {
          const parts = raw.split(':@')
          let edgeType = parts[0].replace(/^@/, '').toLowerCase().trim()
          const noteQuery = (parts[1] || '').toLowerCase().trim()

          const candidates = availableNotes
            .filter((n) => n.id !== currentFileId)
            .filter((n) => {
              if (!noteQuery) return true
              return n.id.toLowerCase().includes(noteQuery) || n.title.toLowerCase().includes(noteQuery)
            })

          return {
            from: context.pos,
            filter: false,
            options: candidates.map((note) => ({
              label: note.id.replace(/\.md$/, ''),
              detail: `Establish [${edgeType.toUpperCase()}] connection -> ${note.title}.md`,
              type: 'variable',
              apply: (view, _completion) => {
                const canonicalPrefix = edgeType === 'back' ? '' : `${edgeType}:`
                const replacement = `[[${canonicalPrefix}${note.id.replace(/\.md$/, '')}]]`
                view.dispatch({
                  changes: { from: replaceFrom, to: context.pos, insert: replacement }
                })
                if (onLinkEstablished && currentFileId) {
                  onLinkEstablished(edgeType, note.id, currentFileId)
                }
              }
            }))
          }
        }

        // STEP 1: User typed [[ or [[@ or [[front (before :@)
        // -> Show ONLY the Connection Types so user establishes the link type FIRST!
        const cleanTypeQuery = raw.replace(/^@/, '').toLowerCase().trim()

        return {
          from: line.from + openIdx + 2,
          filter: false,
          options: EDGE_TYPES.filter(
            (t) => !cleanTypeQuery || t.prefix.toLowerCase().includes(cleanTypeQuery) || t.label.toLowerCase().includes(cleanTypeQuery)
          ).map((t) => ({
            label: t.label,
            detail: t.detail,
            type: 'keyword',
            apply: (view, _completion) => {
              const insertText = `[[${t.prefix}`
              view.dispatch({
                changes: { from: replaceFrom, to: context.pos, insert: insertText }
              })
            }
          }))
        }
      }
    ]
  })
}
