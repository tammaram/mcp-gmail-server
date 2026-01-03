import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerEmailTools } from "./email.ts";

const server = new McpServer({
  name: "gmail-manager",
  version: "1.0.0",
});

registerEmailTools(server);

/**
 * Initializes and starts the Gmail MCP server.
 * Connects to Claude Desktop via stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gmail MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});