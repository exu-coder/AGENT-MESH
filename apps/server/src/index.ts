import { createMcpServer } from "@agent-mesh/mcp-server";
import { createRuntime } from "@agent-mesh/core";

async function main() {
  const runtime = createRuntime();
  const server = createMcpServer(runtime);
  process.stderr.write("AGENT MESH MCP server starting\\n");
  await server.startStdio();

  const shutdown = async () => {
    await runtime.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error instanceof Error ? error.message : String(error)}\\n`);
  process.exit(1);
});
