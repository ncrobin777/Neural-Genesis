import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { useVaultStore } from '../store/useVaultStore'

function normalizeEdgeType(type: string): string {
  const t = (type || '').toLowerCase().trim()
  if (t === '<->' || t === 'peer') return 'front'
  if (t === 'cycle') return 'loop'
  if (t === 'mesh') return 'spider'
  if (t === 'opt') return 'to'
  if (t === 'deprecated') return 'shift'
  return t || 'back'
}

function getEdgeSymbol(type: string): string {
  const t = normalizeEdgeType(type)
  switch (t) {
    case 'front':
      return '↔'
    case 'loop':
      return '↺'
    case 'spider':
      return '🕸'
    case 'to':
      return '⇥'
    case 'shift':
      return '⤹'
    case 'back':
    default:
      return '→'
  }
}

/**
 * Visual pill widget for typed wikilinks like [[loop:order-webhook]] or [[front:checkout-screen|Checkout]]
 */
class WikilinkPillWidget extends WidgetType {
  constructor(
    readonly edgeType: string,
    readonly targetNote: string,
    readonly alias?: string
  ) {
    super()
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof WikilinkPillWidget &&
      other.edgeType === this.edgeType &&
      other.targetNote === this.targetNote &&
      other.alias === this.alias
    )
  }

  toDOM(): HTMLElement {
    const edge = normalizeEdgeType(this.edgeType)
    const symbol = getEdgeSymbol(this.edgeType)
    const displayText = this.alias || this.targetNote

    const pill = document.createElement('span')
    pill.className = `cm-link-pill cm-link-pill-${edge}`
    pill.title = `${this.edgeType ? this.edgeType.toUpperCase() : 'LINK'}: ${this.targetNote} (Ctrl+Click to open)`

    const symbolSpan = document.createElement('span')
    symbolSpan.className = 'cm-link-pill-symbol'
    symbolSpan.textContent = symbol

    const textSpan = document.createElement('span')
    textSpan.className = 'cm-link-pill-text'
    textSpan.textContent = displayText

    pill.appendChild(symbolSpan)
    pill.appendChild(textSpan)

    pill.addEventListener('click', (e: MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        const store = useVaultStore.getState()
        const target = store.files.find(
          (f) =>
            f.id === this.targetNote ||
            f.id === `${this.targetNote}.md` ||
            f.id.endsWith(`/${this.targetNote}`) ||
            f.id.endsWith(`/${this.targetNote}.md`) ||
            f.title.toLowerCase() === this.targetNote.toLowerCase()
        )
        if (target) {
          store.openFile(target.id)
        }
      }
    })

    return pill
  }

  ignoreEvent(event: Event): boolean {
    if (event.type === 'click' && ((event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey)) {
      return true
    }
    return false
  }
}

/**
 * Live Preview Extension:
 * Safely renders:
 * - Blue Code Blocks (```lang) with soft blue styling and header badge
 * - Pink Note Blocks (> [!note]) with pink accent bar and lightbulb header
 * - [[wikilinks]] as interactive inline pill widgets
 *
 * Uses line-based decorations so CodeMirror never throws RangeError on cursor movement or multi-line replace.
 */
const pinkCalloutLineDeco = Decoration.line({
  attributes: { class: 'cm-callout-pink-line' }
})

const blueCodeLineDeco = Decoration.line({
  attributes: { class: 'cm-code-blue-line' }
})

export const livePreviewExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.computeDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = this.computeDecorations(update.view)
      }
    }

    computeDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const selection = view.state.selection.main
      const doc = view.state.doc
      const selStartLine = doc.lineAt(selection.from).number
      const selEndLine = doc.lineAt(selection.to).number

      let inCodeBlock = false

      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i)
        const text = line.text
        const isCursorLine = i >= selStartLine && i <= selEndLine

        // Code block toggle
        if (text.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock
          builder.add(line.from, line.from, blueCodeLineDeco)
        } else if (inCodeBlock) {
          builder.add(line.from, line.from, blueCodeLineDeco)
        }

        // Callout blocks
        if (text.startsWith('>') || text.startsWith('> [!')) {
          builder.add(line.from, line.from, pinkCalloutLineDeco)
        }

        // Wikilinks (only collapsed if cursor is not on this line and not in code block)
        if (!isCursorLine && !inCodeBlock) {
          const linkRegex = /\[\[(?:(front|<->|peer|back|loop|cycle|spider|mesh|to|opt|shift|deprecated):)?([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g
          let match: RegExpExecArray | null
          while ((match = linkRegex.exec(text)) !== null) {
            const start = line.from + match.index
            const end = start + match[0].length
            const edgeType = match[1] || 'back'
            const targetNote = match[2].trim()
            const alias = match[3]?.trim()

            builder.add(
              start,
              end,
              Decoration.replace({
                widget: new WikilinkPillWidget(edgeType, targetNote, alias)
              })
            )
          }
        }
      }

      return builder.finish()
    }
  },
  {
    decorations: (v) => v.decorations
  }
)
