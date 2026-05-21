const { bot, getAllCommands } = require('../core/command.js');

bot({
 command: 'ping',
 description: 'check if naruto is around',
 category: 'bot',
 access: 'public',
 async execute(sock, message, args, sender) {
  
  const startTime = Date.now();
  
  // Send calculating message
  const calculatingMsg = await sock.sendMessage(sender, {
   text: 'Are you ready, *KURAMA*'
  });
  
  const endTime = Date.now();
  const totalMs = endTime - startTime;
  
  // Delete calculating message
  await sock.sendMessage(sender, {
   delete: calculatingMsg.key
  });
  
  if (totalMs < 5000) {
   // Normal speed
   await sock.sendMessage(sender, {
    video: { url: `https://files.catbox.moe/j7nl2c.mp4` },
    caption: `Response: ${totalMs} ms\nI am ready`,
    contextInfo: {
     quoted: message
    }
   });
  } else {
   // Slow speed
   await sock.sendMessage(sender, {
    text: `I am out of Chakra 😪\nResponse: ${totalMs} ms (${Math.floor(totalMs / 1000)} seconds)`
   });
  }
  
  // Add reaction
  await sock.sendMessage(sender, {
   react: { text: '🌀', key: message.key }
  });
 }
});

bot({
 command: 'help',
 description: 'Show all commands by category',
 category: 'bot',
 access: 'public', // Changed from 'private' to 'public' so users can see help
 async execute(sock, message, args, sender, config) {
  
  const allCommands = getAllCommands();
  
  // Group by category
  const categories = new Map();
  
  for (let [name, cmd] of allCommands) {
   const cat = cmd.category || 'general';
   if (!categories.has(cat)) {
    categories.set(cat, []);
   }
   categories.get(cat).push({ name, desc: cmd.description });
  }
  
 let helpText = `╭━━━━━━━━━━━━ *${config.botName}* ━━━━━━━━━━━╮\n`;
  helpText += `║ My Hokage: *${config.ownerNumber}*\n`;
  helpText += `║ Mode: *${config.mode}*\n`;
  helpText += `║ Prefix: *${config.prefix}*\n`;
  helpText += `║ Version: *${config.version}*\n`;
  helpText += `║ Total Commands: *${allCommands.size}*\n`;
  helpText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  
  for (let [category, cmds] of categories) {
   helpText += `┌────═━┈ *${category.toUpperCase()}* ┈━═────┐\n`;
   for (let cmd of cmds) {
    helpText += `║   ${config.prefix}${cmd.name} - ${cmd.desc}\n`;
    helpText += '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n';
   }
   helpText += `\n`;
  }
  
  await sock.sendMessage(sender, { text: helpText });
 }
});

bot({
 command: 'mode',
 description: 'Switch between public/private mode',
 category: 'owner',
 access: 'private',
 async execute(sock, message, args, sender, config) {
  const newMode = args[0];
  if (newMode !== 'public' && newMode !== 'private') {
   await sock.sendMessage(sender, { text: '❌ Use: !mode public or !mode private' });
   return;
  }
  
  // Update .env file
  const fs = require('fs');
  let envContent = fs.readFileSync('.env', 'utf8');
  envContent = envContent.replace(/MODE=.*/, `MODE=${newMode}`);
  fs.writeFileSync('.env', envContent);
  
  await sock.sendMessage(sender, { text: `✅ Mode changed to: ${newMode}` });
 }
});

bot({
 command: 'menu',
 description: 'get all command list',
 access: 'private',
 category: 'bot',
 async execute(sock, message, args, sender, config) { // Fixed parameter order
  
  const allCommands = getAllCommands();
  
  // Group by category
  const categories = new Map();
  
  for (let [name, cmd] of allCommands) {
   const cat = cmd.category || 'general';
   if (!categories.has(cat)) {
    categories.set(cat, []);
   }
   categories.get(cat).push({ name: name }); // Fixed: store name and desc
  }
  
  let helpText = `╭━━━━━━━━━━━━ *${config.botName}* ━━━━━━━━━━━╮\n`;
  helpText += `║ My Hokage: *${config.ownerNumber}*\n`;
  const senderName = message.pushName;
  const senderNumber = '+' + sender.split('@')[0];
  let senderDetail;
  if (senderName) {
       senderDetail = senderName;
  } else {
       senderDetail = senderNumber;
  }
  helpText += `║ Caller: *${senderDetail}*\n`;
  helpText += `║ Mode: *${config.mode}*\n`;
  helpText += `║ Prefix: *${config.prefix}*\n`;
  helpText += `║ Version: *${config.version}*\n`;
  helpText += `║ Total Commands: *${allCommands.size}*\n`;
  helpText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  
  for (let [category, cmds] of categories) {
   for (let cmd of cmds) {
    helpText += `┌────═━┈ *${category.toUpperCase()}* ┈━═────┐\n`;

    helpText += `║  ${config.prefix}${cmd.name}\n`;
    helpText += '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n';
   }
   helpText += `\n`;
  }
  
  await sock.sendMessage(sender, { text: helpText });
 }
});