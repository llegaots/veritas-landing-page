#!/usr/bin/env node
/**
 * Extract first frame from veritas-video.mp4 as a clean poster (no UI/controls).
 * Run: npm run extract:poster
 * Requires: ffmpeg in PATH (https://ffmpeg.org/download.html)
 */
const { execSync } = require('child_process');
const path = require('path');

const videoPath = path.join(__dirname, '../public/veritas-video.mp4');
const outputPath = path.join(__dirname, '../public/veritas-video-poster.jpg');

try {
  execSync(`ffmpeg -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}" -y`, {
    stdio: 'inherit',
  });
  console.log('Poster extracted to public/veritas-video-poster.jpg');
  console.log('Update HeroVideoSection.tsx: poster="/veritas-video-poster.jpg"');
} catch (e) {
  console.error('ffmpeg not found. Install from https://ffmpeg.org/download.html');
  console.error('Or run: scripts/extract-video-poster.bat');
  process.exit(1);
}
