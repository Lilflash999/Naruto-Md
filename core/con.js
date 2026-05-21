const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('baileys');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

require('dotenv').config({ path: path.join(__dirname, '../config.env') });
const config = require('../config.js');

async function startNarutoMd() {
  console.log(chalk.cyan('\n🔗 Starting WhatsApp Bot Connection...\n'));
  
  const sessionDir = path.join(__dirname, '../session');
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version: [version[0], version[1], version[2]],
      auth: state,
      printQRInTerminal: false,
      browser: ['Naruto-MD', 'Chrome', '1.0.0'],
      connectTimeoutMs: 120000,
      keepAliveIntervalMs: 30000,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      // Force port and socket options
      port: 3000,
      socket: {
        port: 3000,
        host: 'localhost'
      }
    });
    
    const hasSession = fs.existsSync(sessionDir) && fs.readdirSync(sessionDir).length > 0;
    
    if (!hasSession) {
      console.log(chalk.cyan('\n📱 PHONE NUMBER PAIRING\n'));
      
      let phoneNumber = config.ownerNumber;
      if (phoneNumber) {
        phoneNumber = phoneNumber.toString().replace(/[^0-9]/g, '');
      }
      
      if (!phoneNumber || phoneNumber.length < 10) {
        console.log(chalk.red('\n❌ Invalid phone number!'));
        process.exit(1);
      }
      
      console.log(chalk.green(`✅ Phone: +${phoneNumber}`));
      console.log(chalk.blue('⏳ Requesting 8-digit code...\n'));
      
      const code = await sock.requestPairingCode(phoneNumber);
      
      console.log(chalk.green.bold(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
      console.log(chalk.yellow.bold(`🔑 CODE: ${code}`));
      console.log(chalk.green.bold(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));
      console.log(chalk.white('1. Open WhatsApp → Settings → Linked Devices'));
      console.log(chalk.white('2. Tap "Link with phone number"'));
      console.log(chalk.white(`3. Enter code: ${chalk.yellow.bold(code)}`));
      console.log(chalk.white('4. Bot will connect automatically\n'));
      
      console.log(chalk.blue('⏳ Waiting for you to enter the code...\n'));
      
      // Wait for connection
      await new Promise((resolve) => {
        const handler = (update) => {
          if (update.connection === 'open') {
            sock.ev.off('connection.update', handler);
            resolve();
          }
        };
        sock.ev.on('connection.update', handler);
      });
    }
    
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'open') {
        console.log(chalk.green.bold('\n✅ BOT CONNECTED!\n'));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.yellow(`🎉 ${config.botName} is ONLINE!`));
        console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      }
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          console.log(chalk.red('❌ Session expired. Delete session folder.'));
          process.exit(1);
        } else {
          console.log(chalk.yellow('🔄 Reconnecting...'));
          setTimeout(() => startNarutoMd(), 5000);
        }
      }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    return sock;
    
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${err.message}`));
    setTimeout(() => startNarutoMd(), 10000);
    return null;
  }
}

module.exports = startNarutoMd;