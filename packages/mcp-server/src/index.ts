import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { MeshRuntime } from "@agent-mesh/core";

export function createMcpServer(runtime: MeshRuntime) {
  const server = new McpServer({ name: "agent-mesh", version: "0.1.0" });

  server.tool("mesh_list_agents", "List agents registered in this local mesh", {}, async () => ({
    content: [{ type: "text", text: JSON.stringify(runtime.listAgents(), null, 2) }]
  }));

  server.tool("mesh_discover_agents", "Find agents by declared capability", {
    capability: z.string().optional()
  }, async ({ capability }) => ({
    content: [{ type: "text", text: JSON.stringify(runtime.discoverAgents(capability), null, 2) }]
  }));

  server.tool("mesh_delegate_task", "Queue a task for a registered agent. This starter does not execute worker code.", {
    agent_id: z.string().min(1).max(100),
    task: z.string().min(1).max(10000)
  }, async ({ agent_id, task }) => {
    try {
      const result = await runtime.delegateTask(agent_id, task);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Task rejected" }] };
    }
  });

  server.tool("mesh_get_task_status", "Get the status of a task", {
    task_id: z.string().min(1)
  }, async ({ task_id }) => {
    const task = runtime.getTask(task_id);
    return task
      ? { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] }
      : { isError: true, content: [{ type: "text", text: "Task not found" }] };
  });

  return {
    async startStdio() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    }
  };
}
