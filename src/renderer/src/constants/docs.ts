export const CANONICAL_DOCS_CONTENT = `# 📖 Neural Genesis — User Guide & Architecture Manual

> **Note:** This documentation is built-in and protected. If you edit this note, any changes will automatically revert back to ensure the canonical instructions remain intact.

---

## ⚡ What is Neural Genesis?
**Neural Genesis** is a specialized, local-first Markdown Workbench and real-time **Model Context Protocol (MCP)** bridge designed for engineering teams and autonomous AI coding agents. 

Unlike standard text editors, Neural Genesis treats your markdown notes as an **executable neural specification graph** that directly controls AI agents (e.g., Claude, Cursor, Copilot) via a local MCP server running on port \`43110\`.

---

## 🗺️ 5-Zone Workbench Layout
1. **Activity Bar (Far Left):** 
   - **Folder**: Vault Explorer (organize specs, constitution, architecture, workpad).
   - **Search**: Vault-wide full-text search.
   - **Network**: Interactive 2D Visual Dependency Graph (\`Cmd+G\` / \`Ctrl+G\`).
   - **Book (Docs)**: This live canonical guide and cheat sheet.
   - **CPU**: Toggle MCP Payload Dock (inspect real-time compiled context).
   - **Terminal**: Embedded interactive shell drawer.
   - **Gear**: Vault and repository settings.
2. **Vault Explorer (Left Sidebar):**
   - Click **\`+\`** to create notes categorized into **Specs**, **Constitution**, **Workpad/Scratchpad**, or **Architecture**.
   - Hover over notes to **Rename** (automatically updates all linked wikilinks across the vault) or **Delete** with confirmation.
3. **Editor Workbench (Center):**
   - Pure Markdown CodeMirror 6 editor with line numbers and active line highlighting.
   - Save directly to SQLite using **\`Ctrl+S\`** without triggering browser download popups.
   - Click **Promote to Spec** to wrap freeform brainstorm notes in \`<!-- mcp:ignore -->\` and append executable acceptance criteria.
4. **MCP Payload Dock (Right Drawer):**
   - Inspect the compiled mission context, active constitution rules, mounted specs, and 1-hop transcluded blocks sent to connected AI agents.
5. **Terminal Drawer (Bottom Drawer):**
   - Full xterm.js terminal connected to your local shell for running tests, dev servers, or git commands.

---

## 🔗 The 6 Connection Edge Semantics
When writing notes, you can create typed links with distinct architectural semantics.

### How to insert typed links:
1. Type \`[[\` or \`[[@\` — an edge type popup appears:
   - \`front:\` (Bidirectional Peer Connection ↔)
   - \`back:\` (Standard Reference →)
   - \`loop:\` (Cyclic Feedback / Review Loop ↺)
   - \`spider:\` (Mesh Cluster / Distributed Hook 🕸)
   - \`to:\` (Prerequisite / Directed Step ⇥)
   - \`shift:\` (Alternative / Anti-pattern ⤹)
2. Type \`:@\` (e.g. \`[[front:@\`) to select from existing notes in your vault.
3. Select any text or existing link and press **\`Ctrl+Shift+L\`** to switch or convert edge types at any time!

| Edge Prefix | Visual Cue in Graph | Semantic Meaning | MCP Compiler Behavior |
| :--- | :--- | :--- | :--- |
| \`[[front:note]]\` | Emerald Solid (↔) | Bidirectional Peer | Auto-creates a reciprocal link in target note; co-mounts peer in active context. |
| \`[[back:note]]\` | Slate Solid (→) | Unidirectional Reference | Standard dependency link. |
| \`[[loop:note]]\` | Curved Amber (↺) | Cyclic Feedback Loop | Appended as iterative refinement cycles for AI agents. |
| \`[[spider:note]]\`| Purple Cluster (🕸) | Mesh Hook / Cluster | Bundles connected micro-specs into an associative cluster. |
| \`[[to:note]]\` | Cyan Dotted (⇥) | Prerequisite Flow | Ordered prerequisite sequence. |
| \`[[shift:note]]\` | Crimson Red Dashed (⤹) | Architectural Shift | Flagged as anti-pattern or replacement branch. |

---

## 🤖 Real-Time MCP Agent Integration
Neural Genesis serves an MCP HTTP endpoint at:
\`http://localhost:43110/mcp\`

When AI agents query your project, they can use:
- **\`get_active_mission\`**: Retrieves all mounted specs, locked constitution rules, and inlined blocks.
- **\`resolve_linked_block\`**: Resolves deep block transclusions like \`![[file#^block-id]]\`.
- **\`verify_and_complete_criterion\`**: Executes command-verified criteria (e.g. \`- [ ] [cmd: pnpm test]\`) in your local shell and atomically checks the box upon exit code 0!
- **\`raise_spec_question\`**: Allows agents to ask clarification questions directly to your workbench.

---

## ⌨️ Essential Keyboard Shortcuts
- **\`Ctrl + S\` / \`Cmd + S\`**: Instantly save current document to SQLite.
- **\`Ctrl + G\` / \`Cmd + G\`**: Toggle 2D Visual Dependency Graph.
- **\`Ctrl + Shift + L\` / \`Cmd + Shift + L\`**: Open Link Type Switcher / Convert selection to typed link.
- **\`[[\` or \`[[@\`**: Trigger edge semantic picker.
- **\`:@\`**: Trigger note target autocompletion.
`
