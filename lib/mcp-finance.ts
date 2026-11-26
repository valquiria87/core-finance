import { Client } from '@modelcontextprotocol/sdk/client'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getPlaidSnapshot } from './plaid'
import type { SandboxSnapshot } from './types'

type SnapshotLoader = () => Promise<SandboxSnapshot>

function parseSnapshotResult(result: Awaited<ReturnType<Client['callTool']>>): SandboxSnapshot {
  if (result.isError) {
    throw new Error('MCP finance tool returned an error')
  }

  const content: unknown[] = Array.isArray(result.content) ? result.content : []
  const textContent = content.find(
    (item): item is { type: 'text'; text: string } =>
      Boolean(
        item &&
        typeof item === 'object' &&
        'type' in item &&
        item.type === 'text' &&
        'text' in item &&
        typeof item.text === 'string',
      ),
  )
  if (!textContent) {
    throw new Error('MCP finance tool returned no text content')
  }

  const value: unknown = JSON.parse(textContent.text)
  if (
    !value ||
    typeof value !== 'object' ||
    !('mode' in value) ||
    !('asOf' in value) ||
    !('accounts' in value) ||
    !Array.isArray(value.accounts) ||
    !('transactions' in value) ||
    !Array.isArray(value.transactions) ||
    !('balanceHistory' in value) ||
    !Array.isArray(value.balanceHistory)
  ) {
    throw new Error('MCP finance tool returned an invalid snapshot')
  }

  return value as SandboxSnapshot
}

/**
 * Runs the finance read tool through an MCP client/server protocol connection.
 * The in-memory transport keeps the internal tool boundary inside the Next.js
 * server process; Plaid credentials and provider calls remain server-side.
 */
export async function getFinanceSnapshotViaMcp(
  loadSnapshot: SnapshotLoader = getPlaidSnapshot,
): Promise<SandboxSnapshot> {
  const server = new McpServer({ name: 'core-finance', version: '1.0.0' })
  server.registerTool(
    'get_finance_snapshot',
    {
      title: 'Get finance snapshot',
      description: 'Read the current Plaid Sandbox accounts and transactions. Read-only.',
      inputSchema: {},
    },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(await loadSnapshot()) }],
    }),
  )

  const client = new Client({ name: 'core-finance-chat', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  try {
    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const result = await client.callTool({
      name: 'get_finance_snapshot',
      arguments: {},
    })

    return parseSnapshotResult(result)
  } finally {
    await client.close().catch(() => undefined)
    await server.close().catch(() => undefined)
  }
}
