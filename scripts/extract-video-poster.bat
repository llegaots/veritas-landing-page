@echo off
REM Extract clean first frame (no play button/controls) from video for poster
REM Requires: ffmpeg in PATH (download from https://ffmpeg.org/download.html)
cd /d "%~dp0.."
ffmpeg -i public/veritas-video.mp4 -vframes 1 -q:v 2 public/veritas-video-poster.jpg -y
if %ERRORLEVEL% EQU 0 (
  echo Poster saved to public/veritas-video-poster.jpg
  echo Update HeroVideoSection.tsx poster to use .jpg instead of .png
) else (
  echo ffmpeg not found. Install from https://ffmpeg.org/download.html
  pause
)
