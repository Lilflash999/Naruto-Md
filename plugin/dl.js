const { bot, getCommands } = require('../core/command.js');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const config = require('../config.js');
const { searchYouTube, downloadAudio, convertToMp3, getVideoInfo, cleanup, tempDir} = require('../core/downloader.js')

bot ({
  command: 'play',
  description: `use ${config.prefix}play *title* by *musician name* `,
  category: 'download',
  access: 'private',
  async execute(sock, message, args, sender, config) {
    
        // Check if user provided a search query or URL
    if (!args || args.length === 0) {
      await sock.sendMessage(sender, {
        text: ` please provide title or the youtube url\nexample: ${config.prefix}play *title*\n or \n${config.prefix}play *url-example: https://YouTube.com/...*`
      });
      return;
    }
    
    const query = args.join(' ');
    await sock.sendMessage(sender, { text: `🔍 Searching for "${query}"...` });
    
    try {
      let videoUrl = query;
      let videoInfo = null;
      
      // Check if it's a YouTube URL
      const isUrl = query.includes('youtube.com') || query.includes('youtu.be');
      
      if (!isUrl) {
        // Search YouTube
        const searchResult = await searchYouTube(query);
        if (!searchResult) {
          await sock.sendMessage(sender, { text: '❌ No results found. Try a different song name.' });
          return;
        }
        videoUrl = searchResult.url;
        videoInfo = {
          title: searchResult.title,
          duration: 'Unknown',
          author: 'YouTube'
        };
        await sock.sendMessage(sender, { text: `✅ Found: *${searchResult.title}*\n⏳ Downloading audio...` });
      } else {
        // Get info from URL
        videoInfo = await getVideoInfo(videoUrl);
        if (videoInfo) {
          await sock.sendMessage(sender, { text: `✅ Found: *${videoInfo.title}*\n⏳ Downloading audio...` });
        } else {
          await sock.sendMessage(sender, { text: `⏳ Downloading audio from URL...` });
        }
      }
      
      // Generate unique filenames
      const timestamp = Date.now();
      const audioPath = path.join(tempDir, `audio_${timestamp}.webm`);
      const mp3Path = path.join(tempDir, `song_${timestamp}.mp3`);
      
      // Download audio
      await downloadAudio(videoUrl, audioPath);
      
      // Convert to MP3
      await sock.sendMessage(sender, { text: `🔄 Converting to MP3...` });
      await convertToMp3(audioPath, mp3Path);
      
      // Read file
      const audioBuffer = fs.readFileSync(mp3Path);
      
      // Calculate duration for display
      const duration = videoInfo?.duration || 'Unknown';
      const title = videoInfo?.title || 'Downloaded Song';
      
      // Send as audio
      await sock.sendMessage(sender, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        caption: `🎵 *${title}*\n📊 Duration: ${typeof duration === 'number' ? Math.floor(duration / 60) + ':' + (duration % 60).toString().padStart(2, '0') : duration}s\n🎤 Artist: ${videoInfo?.author || 'YouTube'}\n\nDownloaded by *${config.botName}*`
      });
      
      // Cleanup temp files
      cleanup(audioPath);
      cleanup(mp3Path);
      
      // React to command
      await sock.sendMessage(sender, {
        react: { text: '✅', key: message.key }
      });
      
    } catch (error) {
      console.error('Song download error:', error);
      await sock.sendMessage(sender, {
        text: 'Failed to download song. Try again or use a different song name.'
      });
    }
  }
});
