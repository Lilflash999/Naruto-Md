const fs = require('fs');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Create temp folder
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Search YouTube for video
async function searchYouTube(query) {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // Use yt-dlp to search (more reliable)
    const { stdout } = await execPromise(`yt-dlp "ytsearch1:${query}" --get-id --get-title --get-url`);
    
    const lines = stdout.trim().split('\n');
    if (lines.length >= 3) {
      return {
        title: lines[0],
        url: lines[2],
        id: lines[1]
      };
    }
    return null;
  } catch (error) {
    console.error('Search error:', error.message);
    return null;
  }
}

// Download audio from YouTube
async function downloadAudio(url, outputPath) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, {
      quality: 'highestaudio',
      filter: 'audioonly',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    });
    
    const writeStream = fs.createWriteStream(outputPath);
    
    stream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', () => resolve(outputPath));
    
    stream.pipe(writeStream);
  });
}

// Convert to MP3 (WhatsApp compatible)
async function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioBitrate(128)
      .audioCodec('libmp3lame')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

// Get video info
async function getVideoInfo(url) {
  try {
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title,
      duration: info.videoDetails.lengthSeconds,
      thumbnail: info.videoDetails.thumbnails[0]?.url,
      author: info.videoDetails.author.name
    };
  } catch (error) {
    return null;
  }
}

// Clean up temp file
function cleanup(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  searchYouTube,
  downloadAudio,
  convertToMp3,
  getVideoInfo,
  cleanup,
  tempDir
};