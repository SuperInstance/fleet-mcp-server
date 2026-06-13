# Fleet MCP Server

MCP server exposing [SuperInstance fleet-vector-api](https://fleet-vector-api.casey-digennaro.workers.dev) as tools for forgecode and other MCP-compatible agents.

## Tools

| Tool | Description |
|------|-------------|
| `fleet_search` | Semantic search across SuperInstance crates |
| `fleet_recommend` | Get crate recommendations based on a known crate |
| `fleet_similar` | Find crates similar to a given crate by name |
| `fleet_stats` | Get index statistics (vector count, dimensions, last updated) |

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (stdio transport — used by MCP clients)
node dist/index.js
```

## Configure in forgecode

Add to your `forge.yaml`:

### Via npx (published package)

```yaml
mcp_servers:
  fleet:
    command: npx
    args: ["-y", "@superinstance/fleet-mcp-server"]
```

### Local development

```yaml
mcp_servers:
  fleet:
    command: node
    args: ["/home/phoenix/repos/fleet-mcp-server/dist/index.js"]
```

### With custom timeout

```yaml
mcp_servers:
  fleet:
    command: npx
    args: ["-y", "@superinstance/fleet-mcp-server"]
    timeout: 60
```

## API Endpoints

The server proxies to `https://fleet-vector-api.casey-digennaro.workers.dev`:

- `POST /search` — `{ query, topK? }` → semantic search results
- `POST /recommend` — `{ crate_name, topK? }` → crate recommendations
- `GET /similar?name=X` → similar crates
- `GET /stats` → index statistics

## License

MIT
