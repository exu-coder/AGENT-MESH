# AGENT MESH

Local-first multi-agent coordination runtime with an MCP server and web dashboard.

> Starter scaffold — not a production-ready security boundary. Review `docs/SECURITY.md` before exposing any service or enabling execution adapters.

## Requirements
- Node.js 20+
- pnpm 9+

## Quick start
```bash
pnpm install
pnpm dev
```

The MCP server uses stdio. Keep stdout reserved for MCP protocol traffic; diagnostics go to stderr.
The dashboard is a separate starter UI and is not yet connected to the runtime API.

## Workspace
- `apps/server`: local runtime entry point
- `apps/dashboard`: React + Vite dashboard shell
- `packages/core`: agent registry and task runtime
- `packages/mcp-server`: MCP tool registration
- `packages/shared`: shared schemas and types
- `docs`: architecture and security notes

## SubAgent capacity

- Default configured limit: **40 SubAgents**.
- Hard maximum: **100 SubAgents**.
- Runtime configuration accepts `subAgentLimit` from 1 through 100.
- MCP tool `mesh_get_subagent_capacity` reports current usage, configured limit, and hard maximum.

## Initial MCP tools
- `mesh_list_agents`
- `mesh_discover_agents`
- `mesh_delegate_task`
- `mesh_get_task_status`
- `mesh_get_result`

## Development status
This ZIP contains a runnable foundation and illustrative interfaces. Persistence, authentication, approvals, workflow orchestration, worker isolation, and production hardening are planned work—not implemented guarantees.
