    // Naruto-Md bot, don't use or edit this script, use only when allowed to
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
}