import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.compose'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Authorizes the application using OAuth2 and stores the access token.
 * Prompts the user to visit an authorization URL and enter the provided code.
 */
async function authorize() {
  const content = await fs.readFile(CREDENTIALS_PATH, 'utf8');
  const keys = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = keys.installed || keys.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('1. Open this URL in your browser:', authUrl);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('2. Enter the code from the broken localhost URL here: ', async (code) => {
    rl.close();
    const { tokens } = await oAuth2Client.getToken(code);
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token stored to token.json');
  });
}

authorize().catch(console.error);