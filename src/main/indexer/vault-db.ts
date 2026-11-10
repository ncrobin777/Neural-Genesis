import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { BlockItem, LinkEdge, CriterionItem, EdgeSemantics } from '../types'

export class VaultDatabase {
  private db: Database.Database

  constructor(vaultPath: string) {
    const genesisDir = path.join(vaultPath, '.genesis')
    if (!fs.existsSync(genesisDir)) {
      fs.mkdirSync(genesisDir, { recursive: true })
    }

    const dbPath = path.join(genesisDir, 'index.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.initSchema()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        frontmatter_json TEXT,
        clean_markdown TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        token_count INTEGER DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS blocks (
        block_key TEXT PRIMARY KEY,
        file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        block_type TEXT NOT NULL,
        raw_markdown TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        token_count INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS links (
        source_file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        target_file_id TEXT NOT NULL,
        target_subpath TEXT,
        is_embed INTEGER DEFAULT 0,
        edge_type TEXT DEFAULT 'back',
        alias TEXT,
        PRIMARY KEY (source_file_id, target_file_id, target_subpath, edge_type)
      );

      CREATE TABLE IF NOT EXISTS criteria (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        checked INTEGER DEFAULT 0,
        verify_cmd TEXT,
        description TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_blocks_file ON blocks(file_id);
      CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_file_id);
      CREATE INDEX IF NOT EXISTS idx_criteria_file ON criteria(file_id);
    `)

    // Migration: ensure edge_type and alias exist if database was created with earlier schema
    try {
      const columns = this.db.pragma('table_info(links)') as Array<{ name: string }>
      const hasEdgeType = columns.some((c) => c.name === 'edge_type')
      if (!hasEdgeType) {
        this.db.exec(`ALTER TABLE links ADD COLUMN edge_type TEXT DEFAULT 'back'`)
      }
      const hasAlias = columns.some((c) => c.name === 'alias')
      if (!hasAlias) {
        this.db.exec(`ALTER TABLE links ADD COLUMN alias TEXT`)
      }
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_links_edge_type ON links(edge_type)`)
    } catch {
      // Ignored if already altered
    }
  }

  public upsertFile(file: {
    id: string
    title: string
    frontmatterJson: string
    cleanMarkdown: string
    contentHash: string
    tokenCount: number
    updatedAt: number
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO files (id, title, frontmatter_json, clean_markdown, content_hash, token_count, updated_at)
      VALUES (@id, @title, @frontmatterJson, @cleanMarkdown, @contentHash, @tokenCount, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        frontmatter_json = excluded.frontmatter_json,
        clean_markdown = excluded.clean_markdown,
        content_hash = excluded.content_hash,
        token_count = excluded.token_count,
        updated_at = excluded.updated_at
    `)
    stmt.run(file)
  }

  public clearFileData(fileId: string): void {
    this.db.prepare(`DELETE FROM blocks WHERE file_id = ?`).run(fileId)
    this.db.prepare(`DELETE FROM links WHERE source_file_id = ?`).run(fileId)
    this.db.prepare(`DELETE FROM criteria WHERE file_id = ?`).run(fileId)
  }

  public deleteFile(fileId: string): void {
    this.clearFileData(fileId)
    this.db.prepare(`DELETE FROM files WHERE id = ?`).run(fileId)
  }

  public insertBlocks(blocks: BlockItem[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO blocks (block_key, file_id, block_type, raw_markdown, start_line, end_line, token_count)
      VALUES (@blockKey, @fileId, @blockType, @rawMarkdown, @startLine, @endLine, @tokenCount)
    `)
    const insertMany = this.db.transaction((items: BlockItem[]) => {
      for (const item of items) stmt.run(item)
    })
    insertMany(blocks)
  }

  public insertLinks(links: LinkEdge[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO links (source_file_id, target_file_id, target_subpath, is_embed, edge_type, alias)
      VALUES (@sourceFileId, @targetFileId, @targetSubpath, @isEmbed, @edgeType, @alias)
    `)
    const insertMany = this.db.transaction((items: LinkEdge[]) => {
      for (const item of items) {
        stmt.run({
          sourceFileId: item.sourceFileId,
          targetFileId: item.targetFileId,
          targetSubpath: item.targetSubpath || null,
          isEmbed: item.isEmbed ? 1 : 0,
          edgeType: item.edgeType || 'back',
          alias: item.alias || null
        })
      }
    })
    insertMany(links)
  }

  public insertCriteria(criteria: CriterionItem[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO criteria (id, file_id, line_number, checked, verify_cmd, description)
      VALUES (@id, @fileId, @lineNumber, @checked, @verifyCmd, @description)
    `)
    const insertMany = this.db.transaction((items: CriterionItem[]) => {
      for (const item of items) {
        stmt.run({
          id: item.id,
          fileId: item.fileId,
          lineNumber: item.lineNumber,
          checked: item.checked ? 1 : 0,
          verifyCmd: item.verifyCmd || null,
          description: item.description
        })
      }
    })
    insertMany(criteria)
  }

  public getBlock(blockKey: string): BlockItem | undefined {
    const row = this.db.prepare(`SELECT * FROM blocks WHERE block_key = ?`).get(blockKey) as any
    if (!row) return undefined
    return {
      blockKey: row.block_key,
      fileId: row.file_id,
      blockType: row.block_type,
      rawMarkdown: row.raw_markdown || '',
      startLine: row.start_line,
      endLine: row.end_line,
      tokenCount: row.token_count
    }
  }

  public getFileOutgoingLinks(fileId: string): LinkEdge[] {
    const rows = this.db.prepare(`SELECT * FROM links WHERE source_file_id = ?`).all(fileId) as any[]
    return rows.map((r) => ({
      sourceFileId: r.source_file_id,
      targetFileId: r.target_file_id,
      targetSubpath: r.target_subpath,
      isEmbed: Boolean(r.is_embed),
      edgeType: (r.edge_type as EdgeSemantics) || 'back',
      alias: r.alias
    }))
  }

  public getFileEmbeds(fileId: string): LinkEdge[] {
    const rows = this.db.prepare(`SELECT * FROM links WHERE source_file_id = ? AND is_embed = 1`).all(fileId) as any[]
    return rows.map((r) => ({
      sourceFileId: r.source_file_id,
      targetFileId: r.target_file_id,
      targetSubpath: r.target_subpath,
      isEmbed: Boolean(r.is_embed),
      edgeType: (r.edge_type as EdgeSemantics) || 'back',
      alias: r.alias
    }))
  }

  public getFileBacklinks(fileId: string): LinkEdge[] {
    const rows = this.db.prepare(`SELECT * FROM links WHERE target_file_id = ?`).all(fileId) as any[]
    return rows.map((r) => ({
      sourceFileId: r.source_file_id,
      targetFileId: r.target_file_id,
      targetSubpath: r.target_subpath,
      isEmbed: Boolean(r.is_embed),
      edgeType: (r.edge_type as EdgeSemantics) || 'back',
      alias: r.alias
    }))
  }

  public getAllLinks(): LinkEdge[] {
    const rows = this.db.prepare(`SELECT * FROM links`).all() as any[]
    return rows.map((r) => ({
      sourceFileId: r.source_file_id,
      targetFileId: r.target_file_id,
      targetSubpath: r.target_subpath,
      isEmbed: Boolean(r.is_embed),
      edgeType: (r.edge_type as EdgeSemantics) || 'back',
      alias: r.alias
    }))
  }

  public getAllCriteria(): CriterionItem[] {
    const rows = this.db.prepare(`SELECT * FROM criteria ORDER BY file_id, line_number ASC`).all() as any[]
    return rows.map((r) => ({
      id: r.id,
      fileId: r.file_id,
      lineNumber: r.line_number,
      description: r.description,
      verifyCmd: r.verify_cmd,
      checked: Boolean(r.checked)
    }))
  }

  public updateCriterionStatus(criterionId: string, checked: boolean): void {
    this.db.prepare(`UPDATE criteria SET checked = ? WHERE id = ?`).run(checked ? 1 : 0, criterionId)
  }

  public close(): void {
    this.db.close()
  }
}
