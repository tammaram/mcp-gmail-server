import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 1. Create the MCP Server instance
const server = new McpServer({
  name: "gmail-manager",
  version: "1.0.0",
});

// 2. Add a simple "Hello" tool to test connection
server.tool(
  "hello_world",
  { name: z.string() },
  async ({ name }) => {
    return {
      content: [{ type: "text", text: `Hello ${name}! Your MCP server is running.` }]
    };
  }
);

// 3. Start the server using Stdio transport (required for Claude Desktop)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gmail MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});