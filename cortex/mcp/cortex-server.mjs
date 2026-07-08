#!/usr/bin/env node
// Cortex MCP server — exposes the shared brain as tools over stdio.
// Zero dependencies: implements MCP's JSON-RPC 2.0 over newline-delimited stdio
// directly, so Claude Code, Grok's runner, and a local Hermes harness can all
// launch it — one tool surface, three agents, no hosting.
//
// Register (Claude Code example, .mcp.json):
//   { "mcpServers": { "cortex": { "command": "node",
//       "args": ["cortex/mcp/cortex-server.mjs"] } } }
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { loadState as loadStateFile, validateState } from '../tools/state-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cortexRoot = join(here, '..');
const PROTOCOL = '2024-11-05';

function loadState() { return loadStateFile(join(cortexRoot, 'state.js')); }
function readDoc(rel) {
  const p = join(cortexRoot, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : `(missing: ${rel})`;
}

const TOOLS = [
  { name: 'cortex_status', description: 'One-glance Cortex status: counts and the items blocked on the owner.',
    inputSchema: { type: 'object', properties: {} },
    run() {
      const S = loadState();
      const need = S.missions.filter(m => m.blockedOn === 'owner');
      const running = S.now.filter(n => n.kind === 'running').length;
      return {
        updated: S.meta.generatedAt, running,
        needYou: need.map(m => ({ id: m.id, title: m.title, action: m.action || m.next })),
        missionCounts: countBy(S.missions, 'status')
      };
    } },
  { name: 'cortex_missions', description: 'List missions, optionally filtered by status or project.',
    inputSchema: { type: 'object', properties: {
      status: { type: 'string', enum: ['done', 'running', 'waiting-owner', 'open'] },
      project: { type: 'string' } } },
    run(args = {}) {
      let m = loadState().missions;
      if (args.status) m = m.filter(x => x.status === args.status);
      if (args.project) m = m.filter(x => x.project === args.project);
      return m.map(x => ({ id: x.id, title: x.title, status: x.status, owner: x.owner, next: x.action || x.next }));
    } },
  { name: 'cortex_shared_learnings', description: 'The distilled cross-agent knowledge every agent should read first.',
    inputSchema: { type: 'object', properties: {} },
    run() { return { markdown: readDoc('memory/shared-learnings.md') }; } },
  { name: 'cortex_validate', description: 'Validate state.js integrity (same checks as CI); returns pass/fail and any problems.',
    inputSchema: { type: 'object', properties: {} },
    run() {
      try {
        const problems = validateState(loadState()); // shared with CI — cannot drift
        return { pass: problems.length === 0, problems };
      } catch (e) { return { pass: false, problems: [e.message] }; }
    } }
];

function countBy(arr, key) {
  return arr.reduce((a, x) => { a[x[key]] = (a[x[key]] || 0) + 1; return a; }, {});
}

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
function result(id, r) { send({ jsonrpc: '2.0', id, result: r }); }
function error(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize')
    return result(id, { protocolVersion: PROTOCOL, capabilities: { tools: {} },
      serverInfo: { name: 'cortex', version: '1.0.0' } });
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return; // no reply
  if (method === 'ping') return result(id, {});
  if (method === 'tools/list')
    return result(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  if (method === 'tools/call') {
    const tool = TOOLS.find(t => t.name === params?.name);
    if (!tool) return error(id, -32602, `unknown tool: ${params?.name}`);
    try {
      const out = tool.run(params.arguments || {});
      return result(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
    } catch (e) { return error(id, -32603, e.message); }
  }
  if (id !== undefined) error(id, -32601, `method not found: ${method}`);
}

const rl = createInterface({ input: process.stdin });
rl.on('line', line => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  try { handle(msg); } catch (e) { if (msg?.id !== undefined) error(msg.id, -32603, e.message); }
});
