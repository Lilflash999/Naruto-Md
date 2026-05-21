const { bot } = require('../core/command.js');
const sharp = require('sharp');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

bot({
  command: 'sticker',
  description: 'Convert image/video to sticker',
  category: 'media',
  access: 'public',
  async execute(sock, message, args, sender, config) {
    
    // Get sticker pack name from config (or use default)
    const packName = config.packName || 'Naruto-Md Votex 🌀';
    const authorName = message.pushName;
    let authorDetail;
    if (authorName) {
      authorDetail = authorName
    } else {
      authorDetail = 'Naruto-Md lab';
    }
    // Check for image/video
    let imageMessage = message.message?.imageMessage;
    let videoMessage = message.message?.videoMessage;
    
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!imageMessage && !videoMessage && quotedMsg) {
      imageMessage = quotedMsg?.imageMessage;
      videoMessage = quotedMsg?.videoMessage;
    }
    
    if (!imageMessage && !videoMessage) {
      await sock.sendMessage(sender, {
        text: `❌ Send/reply an image/video with *${config.prefix}sticker*`
      });
      return;
    }
    
    await sock.sendMessage(sender, { text: '⏳ Making sticker...' });
    
    try {
      let mediaBuffer;
      if (imageMessage || videoMessage) {
        const fakeMessage = { message: { imageMessage, videoMessage } };
        mediaBuffer = await sock.downloadMediaMessage(fakeMessage);
      } else {
        mediaBuffer = await sock.downloadMediaMessage(message);
      }
      
      let stickerBuffer;
      
      if (imageMessage) {
        stickerBuffer = await sharp(mediaBuffer)
          .resize(512, 512, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        const inputPath = './temp/video.mp4';
        const outputPath = './temp/sticker.webp';
        
        if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');
        
        fs.writeFileSync(inputPath, mediaBuffer);
        
        await execPromise(`ffmpeg -i ${inputPath} -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512" -frames:v 1 -f webp ${outputPath} -y`);
        
        stickerBuffer = fs.readFileSync(outputPath);
        
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      }
      
      // Send sticker WITH pack name and author
      await sock.sendMessage(sender, {
        sticker: stickerBuffer,
        // This is the important part — sets the pack name
        packname: packName,
        author: authorDetail
      });
      
    } catch (error) {
      console.log('Sticker error:', error);
      await sock.sendMessage(sender, {
        text: '❌ Failed to make sticker'
      });
    }
  }
});

bot({
  command: 'vv',
  description: 'convert view once media to normal',
  category: 'utilities',
  access: 'private', // Only owner can use this
  async execute(sock, message, args, sender, config) {
    
    // Get the quoted/replied message
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quotedMsg) {
      await sock.sendMessage(sender, {
        text: `❌ Reply to a view once message with ${config.prefix}vv`
      });
      return;
    }
    
    // Check if it's view once
    const isViewOnceImage = quotedMsg?.imageMessage?.viewOnce;
    const isViewOnceVideo = quotedMsg?.videoMessage?.viewOnce;
    const isViewOnceV2 = quotedMsg?.viewOnceMessageV2;
    
    if (!isViewOnceImage && !isViewOnceVideo && !isViewOnceV2) {
      await sock.sendMessage(sender, {
        text: '❌ That message is not a view once media'
      });
      return;
    }
    
    await sock.sendMessage(sender, { text: '⏳ Attempting to extract view once media...' });
    
    try {
      let mediaBuffer = null;
      let mediaType = null;
      let caption = '';
      
      // Extract based on type
      if (isViewOnceV2) {
        const actualMsg = quotedMsg.viewOnceMessageV2.message;
        if (actualMsg?.imageMessage) {
          mediaBuffer = await sock.downloadMediaMessage({ message: actualMsg });
          mediaType = 'image';
          caption = actualMsg.imageMessage.caption || '';
        } else if (actualMsg?.videoMessage) {
          mediaBuffer = await sock.downloadMediaMessage({ message: actualMsg });
          mediaType = 'video';
          caption = actualMsg.videoMessage.caption || '';
        }
      }
      else if (isViewOnceImage) {
        mediaBuffer = await sock.downloadMediaMessage({ message: quotedMsg });
        mediaType = 'image';
        caption = quotedMsg.imageMessage.caption || '';
      }
      else if (isViewOnceVideo) {
        mediaBuffer = await sock.downloadMediaMessage({ message: quotedMsg });
        mediaType = 'video';
        caption = quotedMsg.videoMessage.caption || '';
      }
      
      if (!mediaBuffer) {
        await sock.sendMessage(sender, {
          text: '❌ Failed to extract view once media'
        });
        return;
      }
      
      // Where to send? (optional feature)
      let target = args[0];
      let sendTo = sender;
      
      if (target === 'me' || target === 'chat') {
        sendTo = sender; // Send to private chat
      } else if (target && target.match(/^\d+$/)) {
        sendTo = `${target}@s.whatsapp.net`; // Send to specific number
      }
      
      // Send as normal media
      if (mediaType === 'image') {
        await sock.sendMessage(sendTo, {
          image: mediaBuffer,
          caption: `🔓 Extracted view once image\n${caption}`
        });
      } else if (mediaType === 'video') {
        await sock.sendMessage(sendTo, {
          video: mediaBuffer,
          caption: `🔓 Extracted view once video\n${caption}`
        });
      }
      
      // React to user's command
      await sock.sendMessage(sender, {
        react: { text: '🔓', key: message.key }
      });
      
    } catch (error) {
      console.error('VV Error:', error);
      await sock.sendMessage(sender, {
        text: '❌ Failed to extract. WhatsApp may have patched this.'
      });
    }
  }
});