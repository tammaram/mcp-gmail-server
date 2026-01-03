import { z } from "zod";
import { getGmailClient } from "./auth.ts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Registers email management tools with the MCP server.
 * @param server - The MCP server instance to register tools with
 */
export function registerEmailTools(server: McpServer) {
  /**
   * Retrieves unread emails from the user's inbox.
   * Returns email ID, thread ID, sender, subject, and preview snippet.
   */
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
              email_id: m.data.id,
              thread_id: m.data.threadId,
              from: headers?.find(h => h.name === 'From')?.value,
              subject: headers?.find(h => h.name === 'Subject')?.value,
              snippet: m.data.snippet
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

  /**
   * Creates a draft reply email in response to an existing message.
   * Maintains email threading using In-Reply-To and References headers.
   */
  server.tool(
    "create_draft_reply",
    {
      thread_id: z.string().describe("The thread ID of the email you are replying to"),
      reply_body: z.string().describe("The text content of your reply")
    },
    async ({ thread_id, reply_body }) => {
      try {
        const gmail = await getGmailClient();

        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: thread_id,
        });

        const firstMsg = thread.data.messages?.[0];
        const headers = firstMsg?.payload?.headers;
        
        const subject = headers?.find(h => h.name === 'Subject')?.value || "";
        const to = headers?.find(h => h.name === 'From')?.value || "";
        const messageId = headers?.find(h => h.name === 'Message-ID')?.value || "";

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

        const encodedEmail = Buffer.from(email)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

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
}
