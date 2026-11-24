# Architecture

AGENT MESH is a local-first modular monolith.

- MCP clients connect to the MCP server over stdio.
- The runtime owns agent registration, task state, scheduling, and events.
- The dashboard is a separate browser client and should use an authenticated local management API.
- Workers are plugins with explicit capability declarations and permission scopes.

Keep MCP transport code separate from core business logic. Keep dashboard code separate from the runtime.
