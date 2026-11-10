import { ViewPlugin, Decoration, DecorationSet, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

/**
 * Custom CodeMirror 6 extension that inspects document lines and renders:
 * - Emerald Green 3px border for active specification lines
 * - Slate Gray 3px border for ignored zones (<!-- mcp:ignore --> or ## Scratchpad)
 */
export const mcpSemanticGutterPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: any) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: any): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const doc = view.state.doc
      let isIgnoring = false
      let underIgnoredHeading = false

      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i)
        const text = line.text

        if (text.includes('<!-- mcp:ignore -->')) {
          isIgnoring = true
        } else if (text.includes('<!-- /mcp:ignore -->') || (isIgnoring && text.includes('-->'))) {
          isIgnoring = false
        }

        if (/^##\s+(Scratchpad|Brainstorm|Rough Notes)/i.test(text)) {
          underIgnoredHeading = true
        } else if (/^##?\s+/.test(text) && underIgnoredHeading) {
          underIgnoredHeading = false
        }

        const isLineIgnored = isIgnoring || underIgnoredHeading
        const className = isLineIgnored ? 'mcp-gutter-gray' : 'mcp-gutter-emerald'

        builder.add(
          line.from,
          line.from,
          Decoration.line({
            attributes: { class: className }
          })
        )
      }

      return builder.finish()
    }
  },
  {
    decorations: (v) => v.decorations
  }
)
