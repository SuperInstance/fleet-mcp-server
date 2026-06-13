# Fleet MCP Server

A **Model Context Protocol (MCP) server** that exposes the SuperInstance fleet-vector-api as structured tools, enabling any MCP-compatible AI agent (Claude, ForgeCode, Cursor) to perform semantic crate search, recommendation, and index inspection over the SuperInstance crate registry.

## Why It Matters

The SuperInstance fleet contains hundreds of Rust crates, and finding the right one by keyword search is unreliable — crate names rarely describe what an algorithm *does*. By bridging the fleet-vector-api (384-dimensional BGE embeddings) into the MCP tool protocol, this server lets AI agents query crates the same way a developer asks a colleague: "I need a shortest-path algorithm that handles negative weights." The agent receives ranked results with similarity scores and can chain multiple queries to build dependency graphs. Without this bridge, agents would need custom HTTP integration; with it, any MCP client gains fleet awareness in zero lines of integration code.

## How It Works

The MCP protocol defines a standard for exposing tools to LLM agents via JSON-RPC over stdio. This server registers four tools with the `@modelcontextprotocol/sdk`:

```
Client (Claude/ForgeCode)
    ↕  JSON-RPC 2.0 over stdio
fleet-mcp-server (this repo)
    ↕  HTTPS POST/GET
fleet-vector-api (Cloudflare Worker)
    ↕  Vectorize index: fleet-crates (384-dim BGE-small-en-v1.5)
```

**Tool registration** uses Zod schemas for parameter validation. Each tool handler receives typed arguments, constructs an HTTP request to the fleet-vector-api, and returns the JSON response wrapped in MCP's `content` format ( `{ type: "text", text: JSON.stringify(data) }`).

**Semantic search** (`fleet_search`): The query string is sent to the vector API, which embeds it using `@cf/baai/bge-small-en-v1.5` and performs cosine similarity against the 384-dimensional index. Results are ranked by similarity score in O(N · D) where N is the number of vectors and D = 384.

**Recommendation** (`fleet_recommend`): Given a known crate name, the API retrieves that crate's embedding and finds nearest neighbors — crates whose descriptions are semantically close. This is k-nearest-neighbor search in embedding space, O(N · D) per query.

## Quick Start

```bash
# Install and build
npm install
npm run build

# Run as a stdio MCP server (for integration with Claude Desktop, etc.)
node dist/index.js

# Configure in Claude Desktop's claude_desktop_config.json:
# {
#   "mcpServers": {
#     "fleet": {
#       "command": "node",
#       "args": ["/path/to/fleet-mcp-server/dist/index.js"]
#     }
#   }
# }
```

## API

| Tool | Description | Parameters |
|------|-------------|------------|
| `fleet_search` | Semantic search across all crates | `query: string`, `topK?: number` |
| `fleet_recommend` | Recommend crates related to a known one | `crate_name: string`, `topK?: number` |
| `fleet_similar` | Find similar crates by exact name | `name: string` |
| `fleet_stats` | Index statistics (vector count, dimensions) | none |

## Architecture Notes

This server is a stateless adapter in the SuperInstance fleet stack. It sits between MCP-compatible AI agents and the fleet-vector-api Cloudflare Worker. It contributes to the **γ + η = C** conservation law by reducing coordination overhead (γ): agents don't need custom API integration code, shrinking the glue layer. The fleet-vector-api itself uses Cloudflare Vectorize for ANN search. See the [Architecture document](https://github.com/SuperInstance/SuperInstance/blob/main/ARCHITECTURE.md) for fleet topology.

**Transport**: The server uses `StdioServerTransport`, reading JSON-RPC messages from stdin and writing responses to stdout. This is the standard MCP transport for local integrations — no network socket needed, no port conflicts. The server process is spawned by the client (e.g., Claude Desktop) and communicates via pipes.

## References

- Model Context Protocol Specification, Anthropic (2024). https://modelcontextprotocol.io/specification
- BGE-small-en-v1.5 embedding model: Xiao et al., "C-Pack: Packaged Resources To Advance General Chinese Embedding," SIGIR 2024.
- Cloudflare Vectorize Documentation. https://developers.cloudflare.com/vectorize/
- Zod Schema Validation: https://zod.dev

## License

MIT
