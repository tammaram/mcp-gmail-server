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

// Tool: Create Draft Reply
server.tool(
  "create_draft_reply",
  {
    thread_id: z.string().describe("The thread ID of the email you are replying to"),
    reply_body: z.string().describe("The text content of your reply")
  },
  async ({ thread_id, reply_body }) => {
    try {
      const gmail = await getGmailClient();

      // 1. We first fetch the original thread to get the Subject and Sender
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: thread_id,
      });

      const firstMsg = thread.data.messages?.[0];
      const headers = firstMsg?.payload?.headers;
      
      const subject = headers?.find(h => h.name === 'Subject')?.value || "";
      const to = headers?.find(h => h.name === 'From')?.value || "";
      const messageId = headers?.find(h => h.name === 'Message-ID')?.value || "";

      // 2. Construct the email with correct headers for threading
      // 'In-Reply-To' and 'References' are what keep the thread together
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const emailLines = [
        `To: ${to}`,
        `Subject: Re: ${utf8Subject}`,
        `In-Reply-To: ${messageId}`,
        `References: ${messageId}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        reply_body,
      ];
      const email = emailLines.join('\r\n');

      // 3. Encode the email in base64url format
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 4. Create the draft
      const res = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            threadId: thread_id,
            raw: encodedEmail,
          },
        },
      });

      return {
        content: [{ 
          type: "text", 
          text: `Draft created successfully! Draft ID: ${res.data.id}` 
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error creating draft: ${error.message}` }]
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