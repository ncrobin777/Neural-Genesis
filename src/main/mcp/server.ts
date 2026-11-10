import http from 'http'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { ContextCompiler } from '../indexer/context-compiler'
import { SpecVerifier } from './verifier'
import { SpecMutator } from './mutator'
import { McpStateManager } from '../mcp-state-manager'
import { BrowserWindow } from 'electron'

export class LocalMcpServer {
  private server: Server
  private httpServer: http.Server | null = null
  private port: number
  private compiler: ContextCompiler
  private mutator: SpecMutator
  private stateManager: McpStateManager
  private getMainWindow: () => BrowserWindow | null

  constructor(
    port: number,
    compiler: ContextCompiler,
    mutator: SpecMutator,
    stateManager: McpStateManager,
    getMainWindow: () => BrowserWindow | null
  ) {
    this.port = port
    this.compiler = compiler
    this.mutator = mutator
    this.stateManager = stateManager
    this.getMainWindow = getMainWindow

    this.server = new Server(
      {
        name: 'neural-genesis-mcp',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    this.registerTools()
  }

  private registerTools(): void {
    // 1. List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_active_mission',
            description:
              'Returns the compiled context bundle including Locked Constitution, Mounted Specs with auto-inlined transcluded blocks, 1-hop connected graph with backlink blast-radius warnings, and pending acceptance criteria.',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'resolve_linked_block',
            description:
              'Allows the AI agent to fetch a specific section or block from an authorized 1-hop linked note on demand. Prevents context bloating.',
            inputSchema: {
              type: 'object',
              properties: {
                blockKey: {
                  type: 'string',
                  description: 'The block key to resolve (e.g. "01-architecture/db-schema.md#^orders-table")'
                }
              },
              required: ['blockKey']
            }
          },
          {
            name: 'verify_and_complete_criterion',
            description:
              'Executes the verification command [cmd: ...] associated with an acceptance criterion in the target code repository. If it succeeds (exit 0), marks it complete [x] in the spec. Returns stderr on failure.',
            inputSchema: {
              type: 'object',
              properties: {
                criterionId: {
                  type: 'string',
                  description: 'Deterministic ID of the criterion (e.g. "crit_8f3a91c2")'
                },
                summary: {
                  type: 'string',
                  description: 'Brief summary of what changes were implemented'
                }
              },
              required: ['criterionId']
            }
          },
          {
            name: 'raise_spec_question',
            description:
              'Injects a question block (> [!question]) directly into the active spec when an ambiguity or architectural block is reached, and pauses the agent loop.',
            inputSchema: {
              type: 'object',
              properties: {
                specFilePath: {
                  type: 'string',
                  description: 'Relative path to the spec file'
                },
                question: {
                  type: 'string',
                  description: 'The clarifying question for the developer'
                }
              },
              required: ['specFilePath', 'question']
            }
          }
        ]
      }
    })

    // 2. Handle Tool Invocations
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      // Log invocation to UI
      const win = this.getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal:mcp-event', {
          event: `> MCP tool ${name} called with arguments: ${JSON.stringify(args || {})}`
        })
      }

      switch (name) {
        case 'get_active_mission': {
          const bundle = this.compiler.compileMissionBundle()
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(bundle, null, 2)
              }
            ]
          }
        }

        case 'resolve_linked_block': {
          const blockKey = (args as any)?.blockKey as string
          // Validate 1-hop authorization
          const autoLinked = this.compiler.getAutoLinkedFiles()
          const fileId = blockKey.split('#')[0]
          const isAllowed = autoLinked.includes(fileId) || autoLinked.includes(fileId + '.md')

          if (!isAllowed) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Access denied to "${blockKey}". This note is not linked to any currently mounted spec. Re-check the mission bundle.`
                }
              ]
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `Resolved block "${blockKey}" successfully for 1-hop dependency context.`
              }
            ]
          }
        }

        case 'verify_and_complete_criterion': {
          const criterionId = (args as any)?.criterionId as string
          const bundle = this.compiler.compileMissionBundle()
          const crit = bundle.acceptanceCriteria.find((c) => c.criterionId === criterionId)

          if (!crit) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Criterion "${criterionId}" not found in active mission.` }]
            }
          }

          if (!crit.verifyCmd) {
            // Manual checkbox tick
            this.mutator.mutateCriterion(criterionId, true, this.getMainWindow())
            return {
              content: [
                {
                  type: 'text',
                  text: `Criterion ${criterionId} has no automated command directive. Ticked as completed manually.`
                }
              ]
            }
          }

          // Execute verification command in target repo
          const state = this.stateManager.getState()
          const targetRepo = state.targetRepoPath
          if (win && !win.isDestroyed()) {
            win.webContents.send('terminal:mcp-event', {
              event: `> Executing verification in ${targetRepo}: ${crit.verifyCmd}`
            })
          }

          const result = await SpecVerifier.executeCommand(crit.verifyCmd, targetRepo)

          if (result.success) {
            this.mutator.mutateCriterion(criterionId, true, this.getMainWindow())
            if (win && !win.isDestroyed()) {
              win.webContents.send('terminal:mcp-event', {
                event: `-> PASS: Verification passed. Criterion ${criterionId} ticked [x].`
              })
            }
            return {
              content: [
                {
                  type: 'text',
                  text: `Verification PASSED for "${crit.description}". Exit code: 0.\nOutput:\n${result.stdout}\nCriterion has been marked complete [x] in the spec.`
                }
              ]
            }
          } else {
            const safeguard = this.mutator.recordFailure(criterionId, result.stderr || result.stdout)
            if (win && !win.isDestroyed()) {
              win.webContents.send('terminal:mcp-event', {
                event: `-> FAIL: Verification failed (Exit code ${result.exitCode}). Attempt ${safeguard.retryCount}/3.`
              })
            }
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Verification FAILED for "${crit.description}". Exit code: ${result.exitCode}.\nSafeguard Status: Failure ${safeguard.retryCount} of 3.\nStderr:\n${result.stderr}\nStdout:\n${result.stdout}\nPlease self-correct and re-run verify_and_complete_criterion.`
                }
              ]
            }
          }
        }

        case 'raise_spec_question': {
          const specFilePath = (args as any)?.specFilePath as string
          const question = (args as any)?.question as string
          this.mutator.injectQuestion(specFilePath, question)
          return {
            content: [
              {
                type: 'text',
                text: `Question recorded and injected into ${specFilePath} as a > [!question] callout. Execution loop paused for developer attention.`
              }
            ]
          }
        }

        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    })
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(async (req, res) => {
        // Handle CORS
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }

        // Endpoint: /mcp (JSON-RPC)
        if (req.url === '/mcp') {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const jsonRpcRequest = JSON.parse(body)
                // Direct tool dispatch via JSON-RPC
                if (jsonRpcRequest.method === 'tools/list') {
                  const result = await this.server['requestHandlers'].get('tools/list')!({
                    method: 'tools/list',
                    params: {}
                  } as any)
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ jsonrpc: '2.0', id: jsonRpcRequest.id, result }))
                  return
                }

                if (jsonRpcRequest.method === 'tools/call') {
                  const result = await this.server['requestHandlers'].get('tools/call')!(
                    jsonRpcRequest as any
                  )
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ jsonrpc: '2.0', id: jsonRpcRequest.id, result }))
                  return
                }

                // Default echo response
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: jsonRpcRequest.id,
                    result: { status: 'Neural Genesis MCP Server Active' }
                  })
                )
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ jsonrpc: '2.0', error: { message: err.message } }))
              }
            })
            return
          }

          // GET /mcp for health/metadata
          const mission = this.compiler.compileMissionBundle()
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify(
              {
                server: 'Neural Genesis Local Streamable MCP',
                status: 'LIVE',
                port: this.port,
                activeSpecs: mission.mountedSpecs.map((s) => s.id),
                acceptanceCriteriaCount: mission.acceptanceCriteria.length
              },
              null,
              2
            )
          )
          return
        }

        // Fallback
        res.writeHead(404)
        res.end('Endpoint not found. Use /mcp')
      })

      this.httpServer.listen(this.port, () => {
        console.log(`[Neural Genesis] MCP Streamable Server listening on http://localhost:${this.port}/mcp`)
        resolve()
      })

      this.httpServer.on('error', (err) => {
        reject(err)
      })
    })
  }

  public stop(): void {
    if (this.httpServer) {
      this.httpServer.close()
    }
  }
}
