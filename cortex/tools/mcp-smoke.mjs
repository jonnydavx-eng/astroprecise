#!/usr/bin/env node
// Robust MCP smoke test — spawns the stdio server, exercises the JSON-RPC surface,
// PARSES the responses (never greps escaped JSON), asserts, exits 0/1. Used by CI.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const server = join(here, '..', 'mcp', 'cortex-server.mjs');

const requests = [
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
  { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'cortex_validate' } },
  { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'cortex_status' } }
];

const proc = spawn('node', [server], { stdio: ['pipe', 'pipe', 'inherit'] });
let buf = '';
proc.stdout.on('data', d => { buf += d; });
proc.on('error', e => { console.error('✗ could not spawn MCP server:', e.message); process.exit(1); });
proc.stdin.write(requests.map(r => JSON.stringify(r)).join('\n') + '\n');
proc.stdin.end();

proc.on('close', () => {
  const problems = [];
  let byId = {};
  try {
    byId = Object.fromEntries(
      buf.split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(m => m.id != null).map(m => [m.id, m])
    );
  } catch (e) { console.error('✗ unparseable MCP output:', e.message); process.exit(1); }

  if (byId[1]?.result?.serverInfo?.name !== 'cortex') problems.push('initialize did not return serverInfo.name=cortex');
  if (!(byId[2]?.result?.tools?.length >= 4)) problems.push('tools/list returned < 4 tools');
  try {
    const val = JSON.parse(byId[3].result.content[0].text);
    if (val.pass !== true) problems.push('cortex_validate did not return pass:true — ' + JSON.stringify(val.problems));
  } catch { problems.push('cortex_validate response not parseable'); }
  try {
    const status = JSON.parse(byId[4].result.content[0].text);
    if (!(status.needYou?.length >= 1)) problems.push('cortex_status returned no needYou items');
  } catch { problems.push('cortex_status response not parseable'); }

  if (problems.length) {
    console.error('✗ MCP smoke test failed:');
    problems.forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  console.log('✓ MCP smoke test passed — initialize, tools/list, cortex_validate(pass), cortex_status');
});
