import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getGmailClient } from "./auth.ts";

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

// Tool: Get Unread Emails
server.tool(
  "get_unread_emails",
  { 
    max_results: z.number().optional().default(5) 
  },
  async ({ max_results }) => {
    try {
      const gmail = await getGmailClient();
      
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: max_results,
      });

      const messages = res.data.messages || [];
      if (messages.length === 0) {
        return { content: [{ type: "text", text: "No unread emails found." }] };
      }

      const details = await Promise.all(
        messages.map(async (msg) => {
          const m = await gmail.users.messages.get({ 
            userId: 'me', 
            id: msg.id! 
          });
          
          const headers = m.data.payload?.headers;
          return {
            email_id: m.data.id,       // The ID for this specific email
            thread_id: m.data.threadId, // The ID for the whole conversation
            from: headers?.find(h => h.name === 'From')?.value,
            subject: headers?.find(h => h.name === 'Subject')?.value,
            snippet: m.data.snippet    // This is the preview/body snippet
          };
        })
      );

      return {
        content: [{ 
          type: "text", 
          text: `Found ${details.length} unread emails:\n\n${JSON.stringify(details, null, 2)}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }]
      };
    }
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