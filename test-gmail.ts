import { getGmailClient } from "./auth.ts";

async function testConnection() {
  try {
    console.log("Checking Gmail connection...");
    const gmail = await getGmailClient();
    
    // Attempt to get your profile info
    const res = await gmail.users.getProfile({
      userId: 'me',
    });

    console.log("✅ Success! Connected to account:", res.data.emailAddress);
    console.log("Total messages in inbox:", res.data.messagesTotal);
  } catch (error: any) {
    console.error("❌ Connection failed!");
    console.error("Error details:", error.message);
  }
}

testConnection();