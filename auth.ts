import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose'
];

/**
 * Initializes and returns an authenticated Gmail API client.
 * Requires token.json to exist. Run 'npx ts-node login.ts' to generate it.
 * @returns Authenticated Gmail API client instance
 * @throws Error if token.json is not found
 */
export async function getGmailClient() {
  const content = await fs.readFile(CREDENTIALS_PATH, 'utf8');
  const keys = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = keys.installed || keys.web;
  
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    const token = await fs.readFile(TOKEN_PATH, 'utf8');
    oAuth2Client.setCredentials(JSON.parse(token));
  } catch (err) {
    throw new Error("No token.json found. Please run 'npx ts-node login.ts' first.");
  }

  return google.gmail({ version: 'v1', auth: oAuth2Client });
}