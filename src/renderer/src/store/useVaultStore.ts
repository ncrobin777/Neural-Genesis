import { create } from 'zustand'
import { CANONICAL_DOCS_CONTENT } from '../constants/docs'

export const DOCS_FILE_ID = 'docs/guide.md'

export const DOCS_FILE: VaultFile = {
  id: DOCS_FILE_ID,
  title: 'Docs (Guide & Manual)',
  isLocked: true,
  isMounted: false,
  isAutoLinked: false,
  isDocs: true,
  tokenCount: 450,
  content: CANONICAL_DOCS_CONTENT
}

export interface VaultFile {
  id: string
  title: string
  content: string
  isLocked: boolean
  isMounted: boolean
  isAutoLinked: boolean
  isDocs?: boolean
  tokenCount: number
  mtime?: number
  birthtime?: number
}

// Built-in starter note if files are loading or empty so user has immediate plain-text editing
const DEFAULT_INITIAL_FILE: VaultFile = {
  id: '02-specs/checkout-screen.md',
  title: 'checkout-screen',
  isLocked: false,
  isMounted: true,
  isAutoLinked: true,
  tokenCount: 160,
  content: `---
status: ready
target: src/pages/Checkout.tsx
mounted: true
---

<!-- mcp:ignore -->
## Rough Notes & Brainstorming
- Consider adding Apple Pay or 1-click checkout in v2.
- Let's make sure the loading spinner looks silky smooth.
<!-- /mcp:ignore -->

# Feature Spec: Checkout Screen & Payment Pipeline

## Screen Requirements
Render the active customer order summary using the database order table schema:
![[01-architecture/db-schema#^orders-table]]

Integrate payment event processing using the official contract:
![[01-architecture/api-contracts#^stripe-webhook]]

## Acceptance Criteria
- [x] [cmd: node -v] Verify Node.js runtime environment is active
- [ ] [cmd: npm --version] Verify package manager is accessible
- [ ] [cmd: git status] Verify working repository is clean
- [ ] Implement secure order summary card component
`
}

const DEFAULT_CONSTITUTION_FILE: VaultFile = {
  id: '00-constitution/instructions.md',
  title: 'instructions',
  isLocked: true,
  isMounted: true,
  isAutoLinked: false,
  tokenCount: 120,
  content: `---
locked: true
scope: global
version: 1.0.0
---

# Global Engineering Constitution

## 1. Clean Code & Zero-Bloat Mandate
- Implement strict TypeScript with zero \`any\` types.
- Favor pure functions, deterministic logic, and clear single-responsibility architecture.
- Preserve all existing comments and documentation.

## 2. Testing & Verification Standard
- Every feature or bugfix must be verified through automated command checks (\`[cmd: ...]\`).
- No pull request or completion tick is valid until the verification exit code is 0.
`
}

const DEFAULT_ARCH_FILE: VaultFile = {
  id: '01-architecture/db-schema.md',
  title: 'db-schema',
  isLocked: false,
  isMounted: false,
  isAutoLinked: true,
  tokenCount: 85,
  content: `---
type: architecture
module: storage
---

# Database Schema & Data Contracts

## Orders Table Contract
\`\`\`sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK(status IN ('pending', 'completed', 'cancelled'))
);
\`\`\`
^orders-table
`
}

interface VaultStore {
  files: VaultFile[]
  activeFileId: string | null
  openTabs: string[]
  searchQuery: string
  targetRepo: string
  isLoading: boolean
  setFiles: (files: VaultFile[]) => void
  setActiveFileId: (id: string | null) => void
  openFile: (id: string) => void
  closeTab: (id: string) => void
  openDocs: () => void
  createNewFile: (category?: 'specs' | 'constitution' | 'architecture' | 'scratchpad', customName?: string) => void
  setSearchQuery: (query: string) => void
  setTargetRepo: (path: string) => void
  refreshFiles: () => Promise<void>
  toggleLock: (fileId: string) => Promise<void>
  toggleMount: (fileId: string) => Promise<void>
  updateFileContent: (fileId: string, newContent: string) => Promise<void>
  renameFile: (oldFileId: string, newTitle: string) => Promise<void>
  deleteFile: (fileId: string) => Promise<void>
}

export const useVaultStore = create<VaultStore>((set, get) => ({
  files: [DEFAULT_INITIAL_FILE, DEFAULT_CONSTITUTION_FILE, DEFAULT_ARCH_FILE],
  activeFileId: DEFAULT_INITIAL_FILE.id,
  openTabs: [DEFAULT_INITIAL_FILE.id],
  searchQuery: '',
  targetRepo: '~/code/saas-web',
  isLoading: false,

  setFiles: (files) => set({ files }),
  setActiveFileId: (id) => set({ activeFileId: id }),

  openFile: (id) => {
    const { openTabs, files } = get()
    // When clicking back on regular files, automatically remove Docs from the tab bar and files list
    if (id !== DOCS_FILE_ID) {
      const filteredTabs = openTabs.filter((t) => t !== DOCS_FILE_ID)
      const filteredFiles = files.filter((f) => f.id !== DOCS_FILE_ID && !f.isDocs)
      if (!filteredTabs.includes(id)) {
        set({
          files: filteredFiles,
          openTabs: [...filteredTabs, id],
          activeFileId: id
        })
      } else {
        set({
          files: filteredFiles,
          openTabs: filteredTabs,
          activeFileId: id
        })
      }
    } else {
      if (!openTabs.includes(id)) {
        set({ openTabs: [...openTabs, id], activeFileId: id })
      } else {
        set({ activeFileId: id })
      }
    }
  },

  closeTab: (id) => {
    const { openTabs, activeFileId, files } = get()
    const nextTabs = openTabs.filter((t) => t !== id)
    let nextActive = activeFileId
    if (activeFileId === id) {
      nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : files[0]?.id || null
    }
    set({ openTabs: nextTabs, activeFileId: nextActive })
  },

  createNewFile: (category = 'specs', customName?: string) => {
    const { files, openTabs } = get()
    const stamp = Date.now().toString().slice(-4)
    const baseName = customName || `untitled-${stamp}`

    let folder = '02-specs'
    let isLocked = false
    let isMounted = false
    let defaultTemplate = `# Untitled Spec\n\n## Requirements\n- Detail specifications here.\n\n## Acceptance Criteria\n- [ ] [cmd: pnpm test] Verify tests pass\n`

    if (category === 'constitution') {
      folder = '00-constitution'
      isLocked = true
      isMounted = true
      defaultTemplate = `---\nlocked: true\nscope: global\n---\n\n# Engineering Constitution Rules\n\n- Zero bloat, strict TypeScript, deterministic architecture.\n`
    } else if (category === 'scratchpad') {
      folder = '03-scratchpad'
      isLocked = false
      isMounted = false
      defaultTemplate = `<!-- mcp:ignore -->\n# Scratchpad & Freeform Workpad\n\nFreeform ideas, rough notes, and unorganized thoughts.\n<!-- /mcp:ignore -->\n`
    } else if (category === 'architecture') {
      folder = '01-architecture'
      isLocked = false
      isMounted = false
      defaultTemplate = `# Architecture & Contract\n\nDefine schemas or API contracts here. Reference via standard [[wikilinks]] or block embeds when needed.\n`
    }

    const newId = `${folder}/${baseName}.md`
    const newFile: VaultFile = {
      id: newId,
      title: baseName,
      content: defaultTemplate,
      isLocked,
      isMounted,
      isAutoLinked: false,
      tokenCount: 20
    }
    set({
      files: [newFile, ...files],
      openTabs: [...openTabs, newId],
      activeFileId: newId
    })
    if (window.genesis) {
      window.genesis.writeFile(newId, newFile.content)
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setTargetRepo: (path) => set({ targetRepo: path }),

  openDocs: () => {
    const { files, openTabs } = get()
    const nextFiles = files.some((f) => f.id === DOCS_FILE_ID) ? files : [...files, DOCS_FILE]
    // Include DOCS_FILE_ID in openTabs while Docs is open
    const nextTabs = openTabs.includes(DOCS_FILE_ID) ? openTabs : [...openTabs, DOCS_FILE_ID]
    set({
      files: nextFiles,
      openTabs: nextTabs,
      activeFileId: DOCS_FILE_ID
    })
  },

  refreshFiles: async () => {
    if (!window.genesis) return
    try {
      set({ isLoading: true })
      const remoteFiles = await window.genesis.getFiles()
      if (Array.isArray(remoteFiles) && remoteFiles.length > 0) {
        // Ensure Docs file is preserved in files list if open
        const hasDocs = get().files.some((f) => f.id === DOCS_FILE_ID)
        const combined = hasDocs ? [...remoteFiles, DOCS_FILE] : remoteFiles
        set({ files: combined, isLoading: false })
        if (!get().activeFileId) {
          get().openFile(remoteFiles[0].id)
        }
      } else {
        set({ isLoading: false })
      }
    } catch (e) {
      console.error(e)
      set({ isLoading: false })
    }
  },

  toggleLock: async (fileId) => {
    if (fileId === DOCS_FILE_ID) return
    if (!window.genesis) return
    await window.genesis.toggleLock(fileId)
    await get().refreshFiles()
  },

  toggleMount: async (fileId) => {
    if (fileId === DOCS_FILE_ID) return
    if (!window.genesis) return
    await window.genesis.toggleMount(fileId)
    await get().refreshFiles()
  },

  updateFileContent: async (fileId, newContent) => {
    // If user tries to edit the canonical docs, immediately revert back to CANONICAL_DOCS_CONTENT!
    if (fileId === DOCS_FILE_ID) {
      set((state) => ({
        files: state.files.map((f) =>
          f.id === DOCS_FILE_ID ? { ...f, content: CANONICAL_DOCS_CONTENT } : f
        )
      }))
      return
    }

    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, content: newContent } : f))
    }))
    if (window.genesis) {
      await window.genesis.writeFile(fileId, newContent)
    }
  },

  renameFile: async (oldFileId, newTitle) => {
    if (oldFileId === DOCS_FILE_ID) return

    const cleanTitle = newTitle.trim().replace(/\.md$/, '')
    const dir = oldFileId.includes('/') ? oldFileId.slice(0, oldFileId.lastIndexOf('/')) : ''
    const newFileId = dir ? `${dir}/${cleanTitle}.md` : `${cleanTitle}.md`

    const oldBase = oldFileId.split('/').pop()?.replace(/\.md$/, '') || oldFileId
    const newBase = cleanTitle

    // 1. Optimistically update local files & refactor any wikilinks in content
    set((state) => {
      const updatedFiles = state.files.map((f) => {
        let content = f.content
        if (f.id === oldFileId) {
          return {
            ...f,
            id: newFileId,
            title: newBase,
            content
          }
        }
        // Refactor links targeting oldBase across other files
        const refactorRegex = new RegExp(`\\[\\[([^\\]]*[:/])?${oldBase}([#\\|\\]])`, 'g')
        if (refactorRegex.test(content)) {
          content = content.replace(refactorRegex, `[[$1${newBase}$2`)
        }
        return { ...f, content }
      })

      const updatedTabs = state.openTabs.map((t) => (t === oldFileId ? newFileId : t))
      const updatedActive = state.activeFileId === oldFileId ? newFileId : state.activeFileId

      return {
        files: updatedFiles,
        openTabs: updatedTabs,
        activeFileId: updatedActive
      }
    })

    // 2. Call backend disk rename & index refactor
    if (window.genesis) {
      await window.genesis.renameFile(oldFileId, newFileId)
      await get().refreshFiles()
    }
  },

  deleteFile: async (fileId) => {
    if (fileId === DOCS_FILE_ID) return
    const { files, openTabs, activeFileId } = get()
    const nextFiles = files.filter((f) => f.id !== fileId)
    const nextTabs = openTabs.filter((t) => t !== fileId)
    let nextActive = activeFileId
    if (activeFileId === fileId) {
      nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : nextFiles[0]?.id || null
    }

    set({
      files: nextFiles,
      openTabs: nextTabs,
      activeFileId: nextActive
    })

    if (window.genesis) {
      await window.genesis.deleteFile(fileId)
      await get().refreshFiles()
    }
  }
}))
