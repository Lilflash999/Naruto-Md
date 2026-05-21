// Load libraries - FIXED IMPORT SYNTAX
import makeWASocket from '@whiskeysockets/baileys';
const config = require('./config.js');
const fs = require('fs');
const chalk = require('chalk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Main connection function
async function startNarutoMd() {
  console.log(chalk.cyan('🚀 Connecting to WhatsApp...\n'));

  const sock = makeWASocket({
    version: [2, 3000, 1],
    auth: state,
    printQRInTerminal: false,
    browser: ['Naruto-MD', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false
  });
  
  sock.ev.on('creds.update', saveCreds);
  
  // Create a promise that resolves when connection is established
  return new Promise((resolve, reject) => {
    let isResolved = false;
    
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'open') {
        console.log(chalk.green('✅ Connected successfully!'));
        if (!isResolved) {
          isResolved = true;
          resolve(sock);
        }
      }
      
      if (connection === 'close') {
        console.log(chalk.red('❌ Connection closed'));
        // Optionally handle reconnection
      }
    });
    
    // Handle pairing code request
    setTimeout(async () => {
      const hasSession = fs.existsSync(sessionDir) && fs.readdirSync(sessionDir).length > 0;
      
      if (!hasSession || !state.creds?.registered) {
        console.log(chalk.cyan('\n📱 8-DIGIT VERIFICATION REQUIRED\n'));
        let phoneNumber = config.ownerNumber || process.env.OWNER_NUMBER;
        
        if (!phoneNumber) {
          console.log(chalk.red('❌ No phone number configured!'));
          if (!isResolved) {
            isResolved = true;
            reject(new Error('No phone number configured'));
          }
          return;
        }
        
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(chalk.yellow(`\n🔐 Your code: ${code}\n`));
        console.log(chalk.cyan('Waiting for you to enter the code in WhatsApp...\n'));
        // Don't resolve here - wait for connection.open event
      }
    }, 100);
  });
}

exports = { startNarutoMd };