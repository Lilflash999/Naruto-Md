const { 
  bot, 
isBotAdmin, 
isUserAdmin, 
kickUser, 
addWarning, 
getWarnings, 
resetWarnings, 
clearWarnings, 
addShutUser,
removeShutUser,
isShutUser,
getShutUsers } = require('../core/command.js');

// Helper functions

bot({
  command: 'del',
  description: 'Delete a message (reply to any message)',
  access: 'private',
  category: 'group',
  async execute(sock, message, args, sender, config) {
    
    try {
      const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMsg) {
        await sock.sendMessage(sender, {
          text: '❌ Reply to a message you want to delete'
        });
        return;
      }
      
      const quotedKey = message.message.extendedTextMessage.contextInfo.quotedMessage.key;
      const isGroup = sender.includes('@g.us');
      const senderNumber = sender.split('@')[0];
      const isOwner = senderNumber === config.ownerNumber;
      
      if (isGroup) {
        // Get bot's number
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        const botAdmin = await isBotAdmin(sock, sender, botNumber);
        const userAdmin = await isUserAdmin(sock, sender, sender);
        
        if (!botAdmin) {
          await sock.sendMessage(sender, {
            text: '❌ I need to be admin to delete messages'
          });
          return;
        }
        
        if (!userAdmin && !isOwner) {
          await sock.sendMessage(sender, {
            text: '❌ Only admins can delete messages'
          });
          return;
        }
        
        await sock.sendMessage(sender, { delete: quotedKey });
        await sock.sendMessage(sender, { text: '✅ Message deleted' });
        
      } else {
        // Private chat
        const isMyMessage = quotedKey.fromMe === true;
        
        if (isMyMessage || isOwner) {
          await sock.sendMessage(sender, { delete: quotedKey });
          await sock.sendMessage(sender, { text: '✅ Message deleted' });
        } else {
          await sock.sendMessage(sender, {
            text: '❌ You can only delete your own messages'
          });
        }
      }
      
    } catch (error) {
      console.log('Delete error:', error);
      await sock.sendMessage(sender, {
        text: '❌ Failed to delete. Make sure:\n• Bot is admin\n• Message is not too old'
      });
    }
  }
});

bot ({
  command: 'kick',
  description: 'kick group members from the Group chat',
  access: 'private',
  category: 'group',
  async execute(sock, message, args, sender, config) {
    const isGroup = sender.includes('@g.us');
    if (!isGroup) {
         await sock.sendMessage(sender, { text: 'This Jutsu Can Only Be Used In Open Area'});
         return;
    }
    
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg) {
      await sock.sendMessage(sender, { text: 'tag the user you want kick from the Group Chat'})
      return;
    }
    const targetUser = quotedMsg.key.remoteJid;

// Cannot shut yourself
    if (targetUser === sender) {
      await sock.sendMessage(sender, {
        text: 'You cant kick yourself from the Group Chat'
    });
      return;
}
        // Check if sender is admin
    const senderNumber = sender.split('@')[0];
    const isOwner = senderNumber === config.ownerNumber;
    const isAdmin = await isUserAdmin(sock, sender, sender);
    
    if (!isAdmin && !isOwner) {
      await sock.sendMessage(sender, {
        text: 'Only leaders can use this'
      });
      return;
    }
 
    // Delete the target user's message
    await sock.sendMessage(sender, { delete: quotedMsg.key });
    
    // Delete the command message
    await sock.sendMessage(sender, { delete: message.key });
    
    // Send confirmation
    await sock.sendMessage(sender, {
      text: `*${targetName}* has been kicked.`,
      mentions: [targetUser]
    })
  }
})

bot({
  command: 'shut',
  description: 'Delete all messages from a user (admin only)',
  category: 'moderation',
  access: 'private',
  async execute(sock, message, args, sender, config) {
    
    // Check if in group
    const isGroup = sender.includes('@g.us');
    if (!isGroup) {
      await sock.sendMessage(sender, {
        text: 'This Jutsu Can Only Be Used In Open Area'
      });
      return;
    }
    
    // Get the replied message
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quotedMsg) {
      await sock.sendMessage(sender, {
        text: '❌ Reply to the user\'s message you want to shut'
      });
      return;
    }
    
    // Get target user from replied message
    const targetUser = quotedMsg.key.remoteJid;
    
    // Cannot shut yourself
    if (targetUser === sender) {
      await sock.sendMessage(sender, {
        text: '❌ You cannot shut yourself'
      });
      return;
    }
    
    // Check if sender is admin
    const senderNumber = sender.split('@')[0];
    const isOwner = senderNumber === config.ownerNumber;
    const isAdmin = await isUserAdmin(sock, sender, sender);
    
    if (!isAdmin && !isOwner) {
      await sock.sendMessage(sender, {
        text: '❌ Only admins can use !shut'
      });
      return;
    }
    
    // Check if already shut
    const alreadyShut = await isShutUser(sender, targetUser);
    
    if (alreadyShut) {
      await sock.sendMessage(sender, {
        text: `⚠️ User is already shut`
      });
      return;
    }
    
    // Add to shut list
    await addShutUser(sender, targetUser, sender);
    
    const targetName = targetUser.split('@')[0];
    
    // Delete the target user's message
    await sock.sendMessage(sender, { delete: quotedMsg.key });
    
    // Delete the command message
    await sock.sendMessage(sender, { delete: message.key });
    
    // Send confirmation
    await sock.sendMessage(sender, {
      text: `🔇 *${targetName}* has been shut. All their messages will be deleted.`,
      mentions: [targetUser]
    });
  }
});

bot({
  command: 'unshut',
  description: 'Remove shut restriction from a user (admin only)',
  category: 'moderation',
  access: 'private',
  async execute(sock, message, args, sender, config) {
    
    // Check if in group
    const isGroup = sender.includes('@g.us');
    if (!isGroup) {
      await sock.sendMessage(sender, {
        text: '❌ This command only works in groups'
      });
      return;
    }
    
    // Get the replied message or mention
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    
    let targetUser = null;
    
    if (quotedMsg) {
      targetUser = quotedMsg.key.remoteJid;
    } else if (mentions && mentions.length > 0) {
      targetUser = mentions[0];
    } else {
      await sock.sendMessage(sender, {
        text: '❌ Reply to a user\'s message or mention them to unshut'
      });
      return;
    }
    
    // Check if sender is admin
    const senderNumber = sender.split('@')[0];
    const isOwner = senderNumber === config.ownerNumber;
    const isAdmin = await isUserAdmin(sock, sender, sender);
    
    if (!isAdmin && !isOwner) {
      await sock.sendMessage(sender, {
        text: '❌ Only admins can use !unshut'
      });
      return;
    }
    
    // Check if user is shut
    const isShut = await isShutUser(sender, targetUser);
    
    if (!isShut) {
      await sock.sendMessage(sender, {
        text: `⚠️ User is not shut`
      });
      return;
    }
    
    // Remove from shut list
    await removeShutUser(sender, targetUser);
    
    const targetName = targetUser.split('@')[0];
    
    // Delete command message
    await sock.sendMessage(sender, { delete: message.key });
    
    // Send confirmation
    await sock.sendMessage(sender, {
      text: `🔊 *${targetName}* has been unshut. They can now send messages.`,
      mentions: [targetUser]
    });
  }
});

bot({
  command: 'shutlist',
  description: 'Show all shut users in this group',
  category: 'moderation',
  access: 'private',
  async execute(sock, message, args, sender, config) {
    
    const isGroup = sender.includes('@g.us');
    if (!isGroup) {
      await sock.sendMessage(sender, {
        text: '❌ This command only works in groups'
      });
      return;
    }
    
    const shutUsers = await getShutUsers(sender);
    
    if (shutUsers.length === 0) {
      await sock.sendMessage(sender, {
        text: '🔇 No shut users in this group'
      });
      return;
    }
    
    let text = `🔇 *Shut Users List*\n━━━━━━━━━━━━━━━━━━━━\n`;
    
    for (let i = 0; i < shutUsers.length; i++) {
      const user = shutUsers[i];
      const userName = user.user_id.split('@')[0];
      const shutBy = user.shut_by.split('@')[0];
      text += `${i + 1}. ${userName}\n   └─ Shut by: ${shutBy}\n`;
    }
    
    await sock.sendMessage(sender, { text: text });
  }
});

bot({
  command: 'warn',
  description: 'Warn a user (3 warnings = kick)',
  category: 'moderation',
  access: 'private',
  async execute(sock, message, args, sender, config) {
    
    // Check if in group
    const isGroup = sender.includes('@g.us');
    if (!isGroup) {
      await sock.sendMessage(sender, {
        text: '❌ This command only works in groups'
      });
      return;
    }
    
    // Get the replied message (for deletion)
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    // Get mentioned user
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    let targetUser = null;
    
    if (mentions && mentions.length > 0) {
      targetUser = mentions[0];
    } else if (quotedMsg) {
      // If replying to a message, get the sender of that message
      targetUser = quotedMsg.key.remoteJid;
    } else {
      await sock.sendMessage(sender, {
        text: `❌ Mention the user or reply to their message.\nExample: ${config.prefix}warn @user`
      });
      return;
    }
    
    const senderNumber = sender.split('@')[0];
    const isOwner = senderNumber === config.ownerNumber;
    
    // Check if sender is admin or owner
    const isAdmin = await isUserAdmin(sock, sender, sender);
    
    if (!isAdmin && !isOwner) {
      await sock.sendMessage(sender, {
        text: '❌ Only admins can warn users'
      });
      return;
    }
    
    // Get bot's number
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const botIsAdmin = await isBotAdmin(sock, sender, botNumber);
    
    // Get current warnings
    let currentWarnings = await getWarnings(sender, targetUser);
    
    // Add one warning
    await addWarning(sender, targetUser);
    currentWarnings++;
    
    const targetName = targetUser.split('@')[0];
    const warnLimit = 3;
    
    if (currentWarnings >= warnLimit) {
      // Kick user
      if (botIsAdmin) {
        await kickUser(sock, sender, targetUser);
        await resetWarnings(sender, targetUser);
        
        // Delete the target user's message (if replying)
        if (quotedMsg) {
          await sock.sendMessage(sender, { react: { text: '❌', key: quotedMsg.key } });
          await sock.sendMessage(sender, { delete: quotedMsg.key });
        }
        
        // Delete the command message
        await sock.sendMessage(sender, { delete: message.key });
        
        // Send notification
        await sock.sendMessage(sender, {
          text: `🚫 User *${targetName}* has been kicked for reaching ${warnLimit} warnings!`,
          mentions: [targetUser]
        });
      } else {
        await sock.sendMessage(sender, {
          text: `⚠️ User *${targetName}* has ${currentWarnings}/${warnLimit} warnings.\nI need to be admin to kick them.`,
          mentions: [targetUser]
        });
      }
    } else {
      // Just warn
      const remaining = warnLimit - currentWarnings;
      
      // Delete the target user's message (if replying)
      if (quotedMsg) {
        await sock.sendMessage(sender, { delete: quotedMsg.key });
      }
      
      // Delete the command message
      await sock.sendMessage(sender, { delete: message.key });
      
      // Send warning notification
      await sock.sendMessage(sender, {
        text: `⚠️ Warning for *${targetName}*\n━━━━━━━━━━━━━━━━━━━━\nWarnings: ${currentWarnings}/${warnLimit}\nRemaining: ${remaining} warning(s) before kick`,
        mentions: [targetUser]
      });
    }
  }
});

bot({
  command: 'warnings',
  description: 'Check warnings for a user',
  category: 'warn',
  access: 'private',
  async execute(sock, message, args, sender, config) {
    
    const isGroup = sender.includes('@g.us');
    if (!isGroup) {
      await sock.sendMessage(sender, {
        text: '❌ This command only works in groups'
      });
      return;
    }
    
    // Get mentioned user or use the command sender
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    let targetUser = sender;
    
    if (mentions && mentions.length > 0) {
      targetUser = mentions[0];
    }
    
    const warnings = await getWarnings(sender, targetUser);
    const targetName = targetUser.split('@')[0];
    
    await sock.sendMessage(sender, {
      text: `📊 Warnings for *${targetName}*\n━━━━━━━━━━━━━━━━━━━━\n⚠️ Total warnings: ${warnings}/3\nstop now, so you don't get kicked`,
      mentions: [targetUser]
    });
  }
});

bot({
  command: 'resetwarns',
  description: 'Reset warnings for a user',
  category: 'group',
  access: 'private',
  async execute(sock, message, args, sender, config) {
    
    const isGroup = sender.includes('@g.us');
    if (!isGroup) {
      await sock.sendMessage(sender, {
        text: '❌ This command only works in groups'
      });
      return;
    }
    
    const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    let targetUser = null;
    
    if (mentions && mentions.length > 0) {
      targetUser = mentions[0];
    } else {
      await sock.sendMessage(sender, {
        text: '❌ Mention the user to reset warnings.\nExample: !resetwarns @user'
      });
      return;
    }
    
    const senderNumber = sender.split('@')[0];
    const isOwner = senderNumber === config.ownerNumber;
    const isAdmin = await isUserAdmin(sock, sender, sender);
    
    if (!isAdmin && !isOwner) {
      await sock.sendMessage(sender, {
        text: '❌ Only admins can reset warnings'
      });
      return;
    }
    
    await resetWarnings(sender, targetUser);
    const targetName = targetUser.split('@')[0];
    
    await sock.sendMessage(sender, {
      text: `✅ Warnings reset for *${targetName}*`,
      mentions: [targetUser]
    });
  }
});