const fs = require('fs');
const chalk = require('chalk');
const { version } = require('./package.json');
const { bot, getAllCommands, getCommand } = require('./core/command.js');
const config = require('./config.js');
const startNarutoMd = require('./core/con.js');

// ============ CONFIG FILE CREATION ============
const configuration = `    // Naruto-Md bot, don't use or edit this script, use only when allowed to
    require('dotenv').config({ path: './config.env' });
    module.export = {
      botName: process.env.BOT_NAME || 'Naruto-Md',
      ownerNumber: process.env.OWNER_NUMBER,
      sessionId: process.env.SESSION_ID,
      ownerName: 'OBINNA A.K.A VORTEX 🌀',
      mode: process.env.MODE || 'private',
      packName: process.env.PACKNAME || 'Naruto-Md Votex 🌀',
      packAuthor: process.env.PACKAUTHOR || '',
      statusView: process.env.STATUSVIEW || true,
      statusReact: process.env.STATUSREACT || true,
      statusEmoji: process.env.STATUSEMOJI || '🌀',
      antiDelete: process.env.ANTIDELETE || true,
      prefix: process.env.PREFIX || '!,?',
      version: '1.0.0'
    }'
};`;
// Only create config.js if it DOES NOT exist (not every time!)
if (!fs.existsSync('config.js')) {
  console.log('📝 Main register is missing, creating config.js...');
  setTimeout(() =>{
  fs.writeFileSync('config.js', configuration);
  }, 2000);
  console.log('✅ config.js created');
} else {
  console.log('✅ config.js found');
  fs.writeFileSync('config.js', configuration);
}

// Only create config.env if it DOES NOT exist
if (!fs.existsSync('config.env')) {
  console.log('📝 Shinobi register is missing, creating config.env...');
  const shinobi = `OWNER_NUMBER= // important.... Fill this\nSESSION_ID=\nPREFIX=!\nBOT_NAME=Naruto-Md\nMODE=public`;
  fs.writeFileSync('config.env', shinobi);
  console.log('✅ config.env created');
  console.log('⚠️ Please edit config.env with your phone number and restart!\n');
  process.exit(1);
} else {
  console.log('✅ config.env found');
}

// ============ LOAD COMMANDS ============
// Load all command files from commands folder
const commandsPath = './commands';
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    require(`${commandsPath}/${file}`);
    console.log(`📂 Loaded command: ${file}`);
  }
}

// ============ START BOT ============
console.log(`\n⏳ Loading ${config.botName || 'Naruto-Md'} please wait.....\n`);

// Flag to send welcome message only once
let welcomeSent = false;

async function main() {
  try {
    const sock = await startNarutoMd(config);
    
    if (!sock) {
      console.log(chalk.red('Failed to connect to WhatsApp'));
      return;
    }
    
    console.log(chalk.green(`\n┌────═━┈ ${config.botName || 'Naruto-Md'} ┈━═────┐`));
    
    setTimeout(() => {
      console.log(chalk.white(`⚬ Shinobi: ${config.ownerNumber || 'Not set'}`));
    }, 500);
    
    setTimeout(() => {
      console.log(chalk.red(`⚬ Version: ${version}`));
    }, 1000);
    
    setTimeout(() => {
      console.log(chalk.yellow(`⚬ Prefix: ${config.prefix || '!'}`));
    }, 1500);
    
    setTimeout(() => {
      console.log(chalk.blue(`⚬ Bot is ready to receive commands`));
      console.log(chalk.green(`└──────═━┈ ••••••• ┈━═──────┘\n`));
    }, 2000);
    
    // SEND WELCOME MESSAGE TO OWNER
    if (!welcomeSent && config.ownerNumber && config.ownerNumber !== '// important.... Fill this') {
      welcomeSent = true;
      
      const ownerJid = config.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      
      try {
        await sock.sendMessage(ownerJid, {
          text: `┌────═━┈ *${config.botName}* ┈━═────┐\n⚬ Bot Status: ONLINE ✅\n⚬ Prefix: ${config.prefix}\n⚬ Mode: ${config.mode}\n⚬ Total Commands: ${getAllCommands().size}\n⚬ Version: ${version}\n└──────═━┈ ••••••• ┈━═──────┘`
        });
        console.log(chalk.green('✅ Welcome message sent to owner'));
      } catch (err) {
        console.log(chalk.red('Failed to send welcome message:', err.message));
      }
    }
    
    // ============ MESSAGE HANDLER ============
    const { getCommand } = require('./core/command.js');
    
    sock.ev.on('messages.upsert', async (msgUpdate) => {
      const msg = msgUpdate.messages[0];
      if (msg.key.fromMe) return;
      
      const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const sender = msg.key.remoteJid;
      
      // Check for commands (supports multiple prefixes like ! and ?)
      const prefixes = config.prefix ? config.prefix.split(',') : ['!'];
      
      for (const prefix of prefixes) {
        if (messageText.startsWith(prefix)) {
          const args = messageText.slice(prefix.length).trim().split(' ');
          const commandName = args[0].toLowerCase();
          const cmd = getCommand(commandName);
          
          if (cmd) {
            try {
              await cmd.execute(sock, msg, args.slice(1), sender, config);
            } catch (err) {
              console.log('Command error:', err);
              await sock.sendMessage(sender, { text: ' Command failed!' });
            }
          }
          break;
        }
      }
    });
    
  } catch (error) {
    console.log(chalk.red('Connection error:'), error.message);
    // Auto-restart on crash
    setTimeout(main, 5000);
  }
}

main();