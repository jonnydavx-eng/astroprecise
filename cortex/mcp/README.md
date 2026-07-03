---
description: Dependency-free stdio MCP server exposing the Cortex brain as tools for any agent, online or offline.
tags: mcp, tools, offline, orchestration
---

# Cortex MCP server

`cortex-server.mjs` exposes the shared brain as MCP tools over stdio, with **zero
dependencies** (implements JSON-RPC 2.0 over newline-delimited stdio directly). Any
agent that speaks MCP — Claude Code, Grok's runner, a local Hermes harness — launches
the same server and gets the same tools. No hosting, works offline.

## Tools

| Tool | Returns |
|---|---|
| `cortex_status` | One-glance status: counts + items blocked on the owner |
| `cortex_missions` | Missions, filterable by `status` / `project` |
| `cortex_shared_learnings` | The distilled cross-agent knowledge (markdown) |
| `cortex_validate` | Structural validation of state.js (pass/fail + problems) |

## Register in Claude Code (`.mcp.json` at repo root)

```json
{ "mcpServers": { "cortex": { "command": "node", "args": ["cortex/mcp/cortex-server.mjs"] } } }
```

## Smoke-test without a client

```
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
 '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"cortex_status"}}' \
 | node cortex/mcp/cortex-server.mjs
```

Requires Node 18+. Read-only — the server never writes; agents still edit state.js
and memory through normal file edits + commits.
